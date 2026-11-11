/* Auto-tune the per-level hpMult factor (PP.bal.TUNE) against the bot.
 * For each normal level: the largest factor whose average stars / win rate over N seeds stay above the
 * level's targets, with the default seed still winning. Prints a TUNE array to paste into js/data/balance.js.
 * Usage: node tests/autotune.js [seeds] */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const STARS = { 7: 2.7, 8: 2.6, 9: 2.6, 10: 2.5, 11: 2.4, 13: 2.6, 14: 2.3, 15: 2.3, 16: 2.2, 17: 2.2, 19: 2.5, 20: 2.2, 21: 2.1, 22: 2.1, 23: 2.0, 25: 2.4, 26: 2.0, 27: 1.9, 28: 1.9, 29: 1.8 };
const RATE = L => (L === 13 || L === 19 || L === 25) ? 0.95 : (L < 18 ? 0.9 : (L < 24 ? 0.85 : 0.8));
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto(URL + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const seeds = parseInt(process.argv[2], 10) || 12, tune = [0];
  for (let L = 1; L <= 30; L++) {
    if (!STARS[L]) { tune.push(await page.evaluate(L => window.PP.bal.TUNE[L], L)); continue; }
    const r = await page.evaluate(([L, seeds, S, W]) => {
      const PP = window.PP, def = PP.data.levels[L], prof = PP.econ.expectedProfile(L), base = PP.bal.TUNE[L];
      let total = 0; def.beats.forEach(b => { if (b[1] === 'wave') total += PP.patterns.count(b[2].p, b[2].n); });
      let best = null, log = [];
      for (let f = 0.4; f <= 2.61; f += 0.1) {
        PP.bal.TUNE[L] = f;
        let wins = 0, st = 0, d0 = null, pop = 0;
        for (let k = 0; k < seeds; k++) { const r = PP.balance.simLevel(L, { prof, seed: def.seed + 1000 * k }); if (k === 0) d0 = r; pop += (r.popped || 0) / total; if (r.win) { wins++; st += r.stars; } }
        const rate = wins / seeds, avg = wins ? st / wins : 0, pf = pop / seeds;
        log.push(f.toFixed(1) + ':' + Math.round(rate * 100) + '/' + avg.toFixed(1) + (d0.win ? 'W' + d0.stars : 'F') + 'p' + Math.round(pf * 100));
        if (L <= 10 && f > 1.55) break;
        const nu = L <= 10 ? PP.balance.simLevel(L, { prof: PP.save.defaults(), seed: def.seed }).win : true;
        if (rate >= W && avg >= S && d0.win && d0.stars >= 2 && nu && pf >= 0.55) best = { f: Math.round(f * 10) / 10, rate, avg, d0: d0.stars };
        if (rate < W - 0.2) break;
      }
      PP.bal.TUNE[L] = base;
      return { best, log: log.join(' ') };
    }, [L, seeds, STARS[L], RATE(L)]);
    console.log('L' + L + ' -> ' + (r.best ? 'x' + r.best.f + ' (rate ' + Math.round(r.best.rate * 100) + '%, stars ' + r.best.avg.toFixed(2) + ', d0 ' + r.best.d0 + ')' : 'NO FIT') + '   ' + r.log);
    tune.push(r.best ? r.best.f : 0.5);
  }
  console.log('TUNE = [' + tune.join(', ') + ']');
  await browser.close();
})();
