/* How far does the bot get in Endless without god mode? (headless, several seeds) */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  page.on('pageerror', e => console.log('pageerror ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html') + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const out = await page.evaluate(() => {
    const PP = window.PP, rows = [];
    for (let k = 0; k < 6; k++) {
      const r = PP.balance.simLevel(1, { prof: PP.econ.expectedProfile(30), endless: true, seed: 100 + k, maxTime: 1800 });
      rows.push('seed ' + (100 + k) + ': ' + r.score + ' m in ' + Math.round(r.time) + ' s, peak squad ' + r.squadPeak + ', popped ' + r.popped + (r.timeout ? ' (still alive at 30 min)' : ''));
    }
    return rows;
  });
  console.log(out.join('\n'));
  await browser.close();
})();
