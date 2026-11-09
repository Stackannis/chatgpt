#!/usr/bin/env node
// Renders a contact sheet of an art module so you can LOOK at your pixels.
//   node tools/sheet.js player            -> shots/sheet-player.png
//   node tools/sheet.js actors 8          -> force 8x zoom
//   node tools/sheet.js player 6 '#1a6b3a' -> custom backdrop colour
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [m = 'player', s = '0', bg = ''] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  page.on('console', msg => { if (msg.type() === 'error') console.log('[console.error]', msg.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  const url = 'file://' + path.resolve(__dirname, 'sheet.html') + '?m=' + m + '&s=' + s + (bg ? '&bg=' + encodeURIComponent(bg) : '');
  await page.goto(url);
  await page.waitForFunction('window.__done === true', null, { timeout: 20000 });
  const errs = await page.evaluate('window.__errors');
  const out = path.resolve(__dirname, '..', 'shots', 'sheet-' + m.replace(/,/g, '+') + (s !== '0' ? '-' + s + 'x' : '') + '.png');
  await page.locator('#out').screenshot({ path: out });
  await browser.close();
  if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1; }
  console.log('wrote ' + out);
})();
