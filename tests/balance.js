/* Runs the in-game balance harness headless and prints the report. Usage: node tests/balance.js [runs] [from] [to] */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await page.goto(URL + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const runs = parseInt(process.argv[2], 10) || 1, from = parseInt(process.argv[3], 10) || 1, to = parseInt(process.argv[4], 10) || 30;
  const t0 = Date.now();
  const rep = await page.evaluate(([runs, from, to]) => window.__game.runBalance({ runs, from, to }), [runs, from, to]);
  console.log(rep.text);
  console.log('harness time ms:', Date.now() - t0, 'errors:', errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e));
  require('fs').writeFileSync(path.join(__dirname, 'balance_report.json'), JSON.stringify(rep, null, 1));
  await browser.close();
})();
