import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export function renderSettings(env = process.env) {
  const backend = env.ASPERGILLUM_RENDER_BACKEND || 'auto';
  if (!['auto', 'hardware', 'software'].includes(backend)) throw new Error('ASPERGILLUM_RENDER_BACKEND must be auto, hardware or software.');
  const softwareCpus = Number(env.ASPERGILLUM_SOFTWARE_CPUS || 4);
  if (!Number.isInteger(softwareCpus) || softwareCpus < 1 || softwareCpus > 32) throw new Error('ASPERGILLUM_SOFTWARE_CPUS must be an integer from 1 to 32.');
  return {backend, softwareCpus};
}

export function isSoftwareRenderer(renderer) {
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

async function constrainSoftware(browser, cpuCount) {
  const session = await browser.newBrowserCDPSession();
  try {
    const {processInfo} = await session.send('SystemInfo.getProcessInfo');
    const ids = processInfo.map(p => p.id).filter(Number.isSafeInteger);
    if (!ids.length) throw new Error('Browser did not expose its process IDs.');
    if (process.platform !== 'win32') {
      for (const id of ids) os.setPriority(id, os.constants.priority.PRIORITY_BELOW_NORMAL);
      return {priority: 'below-normal', affinity: 'not supported on this platform'};
    }
    // Scope strictly to this browser. Existing children are covered; new children
    // inherit the browser affinity. No system-wide priority/driver changes.
    const script = `$ErrorActionPreference='Stop'; $count=${cpuCount}; $rows=@(); foreach($browserId in @(${ids.join(',')})){ $p=Get-Process -Id $browserId -ErrorAction SilentlyContinue; if(!$p){continue}; $allowed=$p.ProcessorAffinity.ToInt64(); [long]$mask=0; $used=0; for($bit=0;$bit -lt 63 -and $used -lt $count;$bit++){[long]$flag=[long]1 -shl $bit; if(($allowed -band $flag) -ne 0){$mask=$mask -bor $flag;$used++}}; if(!$mask){throw 'Empty browser CPU affinity'}; $p.ProcessorAffinity=[IntPtr]$mask; $p.PriorityClass='BelowNormal'; $rows+=@{pid=$p.Id;mask=$mask;logicalCpus=$used} }; $rows | ConvertTo-Json -Compress`;
    const output = execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', script], {windowsHide: true, timeout: 15000, encoding: 'utf8'});
    return {priority: 'below-normal', affinity: JSON.parse(output.trim())};
  } finally { await session.detach(); }
}

async function inspectWebGL(browser) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const gl = canvas.getContext('webgl2', {powerPreference: 'high-performance'});
      if (!gl) throw new Error('WebGL2 unavailable.');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      gl.clearColor(0.25, 0.5, 0.75, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const pixel = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if (gl.getError() !== gl.NO_ERROR || Math.abs(pixel[1] - 128) > 1 || pixel[3] !== 255) throw new Error('WebGL2 pixel readback failed.');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return {renderer, maxTextureSize};
    });
  } finally { await page.close(); }
}

// Fallback is limited to launch/capability probing. A failed test is never
// retried on another backend or hidden by a software fallback.
export async function launchRenderBrowser(chromium, {settings = renderSettings(), inspect = inspectWebGL, constrain = constrainSoftware, log = console.error} = {}) {
  const started = performance.now();
  const attempts = settings.backend === 'auto' ? ['hardware', 'software'] : [settings.backend];
  const failures = [];
  for (const backend of attempts) {
    let browser;
    try {
      browser = await chromium.launch(backend === 'hardware'
        ? {headless: true, channel: 'chromium', args: ['--enable-gpu']}
        : {headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
      let resources = backend === 'software' ? await constrain(browser, settings.softwareCpus) : null;
      const info = await inspect(browser);
      // Chromium may reset GPU-process affinity while initializing ANGLE. Apply
      // again after the context exists, then cover restarted/new GPU processes.
      if (backend === 'software') resources = await constrain(browser, settings.softwareCpus);
      if (backend === 'hardware' && isSoftwareRenderer(info.renderer)) throw new Error(`Hardware probe selected software: ${info.renderer}`);
      if (backend === 'hardware' && !/ANGLE|NVIDIA|Intel|AMD|Apple|Mesa|Radeon|GeForce/i.test(info.renderer)) throw new Error(`Unverified hardware renderer: ${info.renderer}`);
      browser.renderDiagnostics = {requested: settings.backend, backend, browserVersion: browser.version(), ...info, resources, fallbackReasons: failures, startupMs: Math.round(performance.now() - started)};
      if (backend === 'software' && process.platform === 'win32' && browser.on) {
        let applying = false;
        const monitor = setInterval(async () => {
          if (applying || !browser.isConnected()) return;
          applying = true;
          try { browser.renderDiagnostics.resources = await constrain(browser, settings.softwareCpus); }
          catch (error) {
            if (browser.isConnected()) {
              log(`[render] Resource control failed; closing software browser: ${error.message}`);
              await browser.close();
            }
          } finally { applying = false; }
        }, 5000);
        monitor.unref();
        browser.once('disconnected', () => clearInterval(monitor));
      }
      log(`[render] ${JSON.stringify(browser.renderDiagnostics)}`);
      return browser;
    } catch (error) {
      await browser?.close();
      failures.push(`${backend}: ${error.message}`);
    }
  }
  throw new Error(`Unable to start verified renderer: ${failures.join('; ')}`);
}
