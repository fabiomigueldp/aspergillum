import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const signatures = {
  central: 0x02014b50,
  end: 0x06054b50,
  local: 0x04034b50,
};

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function findEndRecord(buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signatures.end) return offset;
  }
  throw new Error("Arquivo ZIP inválido: registro final não encontrado.");
}

function parseEntries(buffer) {
  const end = findEndRecord(buffer);
  const disk = buffer.readUInt16LE(end + 4);
  const centralDisk = buffer.readUInt16LE(end + 6);
  const entriesOnDisk = buffer.readUInt16LE(end + 8);
  const entryCount = buffer.readUInt16LE(end + 10);
  const centralSize = buffer.readUInt32LE(end + 12);
  const centralOffset = buffer.readUInt32LE(end + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("Arquivos ZIP multipartes não são suportados.");
  }
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 não é suportado para pacotes Bedrock locais.");
  }
  if (centralOffset + centralSize > buffer.length) throw new Error("Diretório central ZIP truncado.");

  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== signatures.central) throw new Error("Entrada inválida no diretório central ZIP.");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const checksum = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if ((flags & 1) !== 0) throw new Error(`Entrada ZIP criptografada não suportada: ${name}`);
    if (method !== 0 && method !== 8) throw new Error(`Compressão ZIP não suportada (${method}): ${name}`);
    if ([compressedSize, size, localOffset].includes(0xffffffff)) throw new Error(`Entrada ZIP64 não suportada: ${name}`);
    const unixMode = (externalAttributes >>> 16) & 0xffff;
    if ((unixMode & 0o170000) === 0o120000) throw new Error(`Link simbólico não permitido no pacote: ${name}`);
    entries.push({ checksum, compressedSize, flags, localOffset, method, name, size });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function entryData(buffer, entry) {
  const offset = entry.localOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== signatures.local) {
    throw new Error(`Cabeçalho local ZIP inválido: ${entry.name}`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > buffer.length) throw new Error(`Entrada ZIP truncada: ${entry.name}`);
  const compressed = buffer.subarray(start, end);
  const data = entry.method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);
  if (data.length !== entry.size) throw new Error(`Tamanho descomprimido divergente: ${entry.name}`);
  if (crc32(data) !== entry.checksum) throw new Error(`CRC-32 divergente: ${entry.name}`);
  return data;
}

function safeRelativePath(name) {
  if (!name || name.includes("\0") || name.includes("\\") || /^[a-z]:/i.test(name) || name.startsWith("/")) {
    throw new Error(`Caminho inseguro no pacote: ${JSON.stringify(name)}`);
  }
  const segments = name.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Caminho inseguro no pacote: ${name}`);
  }
  return segments;
}

export function readZip(filePath) {
  const buffer = fs.readFileSync(filePath);
  const entries = parseEntries(buffer);
  return {
    entries: entries.map((entry) => ({ ...entry, read: () => entryData(buffer, entry) })),
  };
}

export function readMcaddonManifests(filePath) {
  const { entries } = readZip(filePath);
  const manifests = entries
    .filter((entry) => /(^|\/)manifest\.json$/i.test(entry.name) && !entry.name.endsWith("/"))
    .map((entry) => {
      const segments = safeRelativePath(entry.name);
      if (segments.length !== 2) throw new Error(`manifest.json fora da raiz de um pack: ${entry.name}`);
      let manifest;
      try {
        manifest = JSON.parse(entry.read().toString("utf8"));
      } catch (error) {
        throw new Error(`Manifest inválido em ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const moduleTypes = new Set((manifest.modules ?? []).map((module) => module.type));
      const kind = moduleTypes.has("resources") ? "resource" : (moduleTypes.has("data") || moduleTypes.has("script")) ? "behavior" : undefined;
      if (!kind) throw new Error(`Tipo de pack não reconhecido em ${entry.name}`);
      return { kind, manifest, root: segments[0] };
    });
  const result = {};
  for (const item of manifests) {
    if (result[item.kind]) throw new Error(`Mais de um ${item.kind} pack encontrado em ${filePath}`);
    result[item.kind] = item;
  }
  if (!result.behavior || !result.resource || manifests.length !== 2) {
    throw new Error(`O artefato deve conter exatamente um Behavior Pack e um Resource Pack: ${filePath}`);
  }
  return result;
}

export function extractZip(filePath, targetDirectory) {
  const target = path.resolve(targetDirectory);
  fs.mkdirSync(target, { recursive: true });
  const { entries } = readZip(filePath);
  for (const entry of entries) {
    const segments = safeRelativePath(entry.name);
    if (segments.length === 0) continue;
    const output = path.resolve(target, ...segments);
    if (output !== target && !output.startsWith(`${target}${path.sep}`)) throw new Error(`Caminho fora do destino: ${entry.name}`);
    if (entry.name.endsWith("/")) {
      fs.mkdirSync(output, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, entry.read());
  }
}

export { crc32 };
