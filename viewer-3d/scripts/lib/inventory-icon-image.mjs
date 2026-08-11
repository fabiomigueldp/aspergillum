import { PNG } from 'pngjs';

function pixelOffset(image, x, y) {
  return (image.width * y + x) << 2;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function alphaBounds(image, threshold = 8) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let opaquePixels = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[pixelOffset(image, x, y) + 3];
      if (alpha < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      visiblePixels += 1;
      if (alpha >= 192) opaquePixels += 1;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    visiblePixels,
    opaquePixels,
  };
}

function samplePremultiplied(image, sourceX, sourceY) {
  if (sourceX < -0.5 || sourceY < -0.5 || sourceX > image.width - 0.5 || sourceY > image.height - 0.5) {
    return [0, 0, 0, 0];
  }

  const x0 = clamp(Math.floor(sourceX), 0, image.width - 1);
  const y0 = clamp(Math.floor(sourceY), 0, image.height - 1);
  const x1 = clamp(x0 + 1, 0, image.width - 1);
  const y1 = clamp(y0 + 1, 0, image.height - 1);
  const tx = clamp(sourceX - Math.floor(sourceX), 0, 1);
  const ty = clamp(sourceY - Math.floor(sourceY), 0, 1);
  const samples = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x1, y0, tx * (1 - ty)],
    [x0, y1, (1 - tx) * ty],
    [x1, y1, tx * ty],
  ];
  const result = [0, 0, 0, 0];

  for (const [x, y, weight] of samples) {
    const offset = pixelOffset(image, x, y);
    const alpha = image.data[offset + 3] / 255;
    result[0] += image.data[offset] * alpha * weight;
    result[1] += image.data[offset + 1] * alpha * weight;
    result[2] += image.data[offset + 2] * alpha * weight;
    result[3] += alpha * weight;
  }
  return result;
}

function applyOutline(image, outline) {
  const result = new PNG({ width: image.width, height: image.height, colorType: 6 });
  const [outlineRed, outlineGreen, outlineBlue, outlineAlphaByte] = outline.color;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = pixelOffset(image, x, y);
      const sourceAlpha = image.data[offset + 3] / 255;
      let neighborAlpha = 0;
      for (let deltaY = -outline.radius; deltaY <= outline.radius; deltaY += 1) {
        for (let deltaX = -outline.radius; deltaX <= outline.radius; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const neighborX = x + deltaX;
          const neighborY = y + deltaY;
          if (neighborX < 0 || neighborY < 0 || neighborX >= image.width || neighborY >= image.height) continue;
          neighborAlpha = Math.max(
            neighborAlpha,
            image.data[pixelOffset(image, neighborX, neighborY) + 3] / 255,
          );
        }
      }

      const underAlpha = neighborAlpha * (outlineAlphaByte / 255);
      const outputAlpha = sourceAlpha + underAlpha * (1 - sourceAlpha);
      const outputOffset = pixelOffset(result, x, y);
      if (outputAlpha <= 0.01) continue;
      for (const [channel, outlineValue] of [
        [0, outlineRed],
        [1, outlineGreen],
        [2, outlineBlue],
      ]) {
        const sourcePremultiplied = image.data[offset + channel] * sourceAlpha;
        const outlinePremultiplied = outlineValue * underAlpha * (1 - sourceAlpha);
        result.data[outputOffset + channel] = Math.round(
          (sourcePremultiplied + outlinePremultiplied) / outputAlpha,
        );
      }
      result.data[outputOffset + 3] = outputAlpha >= 0.94
        ? 255
        : Math.round(outputAlpha * 255);
    }
  }
  return result;
}

export function renderInventoryIcon(source, config) {
  const bounds = alphaBounds(source, config.sourceAlphaThreshold);
  if (!bounds) throw new Error('A captura do modelo não contém pixels visíveis.');

  const output = new PNG({ width: config.outputSize, height: config.outputSize, colorType: 6 });
  const angle = config.rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const rotatedWidth = Math.abs(bounds.width * cosine) + Math.abs(bounds.height * sine);
  const rotatedHeight = Math.abs(bounds.width * sine) + Math.abs(bounds.height * cosine);
  const scale = config.contentSize / Math.max(rotatedWidth, rotatedHeight);
  const sourceCenterX = (bounds.minX + bounds.maxX) / 2;
  const sourceCenterY = (bounds.minY + bounds.maxY) / 2;
  const outputCenter = config.outputSize / 2;
  const sampleCount = config.samplesPerAxis ** 2;

  for (let y = 0; y < output.height; y += 1) {
    for (let x = 0; x < output.width; x += 1) {
      const accumulated = [0, 0, 0, 0];
      for (let sampleY = 0; sampleY < config.samplesPerAxis; sampleY += 1) {
        for (let sampleX = 0; sampleX < config.samplesPerAxis; sampleX += 1) {
          const destinationX = x + (sampleX + 0.5) / config.samplesPerAxis - outputCenter;
          const destinationY = y + (sampleY + 0.5) / config.samplesPerAxis - outputCenter;
          const rotatedX = destinationX / scale;
          const rotatedY = destinationY / scale;
          const sourceX = sourceCenterX + cosine * rotatedX + sine * rotatedY;
          const sourceY = sourceCenterY - sine * rotatedX + cosine * rotatedY;
          const sampled = samplePremultiplied(source, sourceX, sourceY);
          for (let channel = 0; channel < 4; channel += 1) accumulated[channel] += sampled[channel];
        }
      }

      const alpha = accumulated[3] / sampleCount;
      if (alpha < 0.025) continue;
      const offset = pixelOffset(output, x, y);
      output.data[offset] = Math.round(accumulated[0] / accumulated[3]);
      output.data[offset + 1] = Math.round(accumulated[1] / accumulated[3]);
      output.data[offset + 2] = Math.round(accumulated[2] / accumulated[3]);
      output.data[offset + 3] = alpha >= 0.96 ? 255 : Math.round(alpha * 255);
    }
  }

  return applyOutline(output, config.outline);
}
