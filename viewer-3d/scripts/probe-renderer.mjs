import {chromium} from 'playwright';
import {launchRenderBrowser} from './lib/render-browser.mjs';

let browser;
try {
  browser = await launchRenderBrowser(chromium);
  console.log(JSON.stringify(browser.renderDiagnostics, null, 2));
} finally { await browser?.close(); }
