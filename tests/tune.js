/* Balance tuning sweep: for each level and each hpMult factor, bot win rate over N seeds.
 * Usage: node tests/tune.js <from> <to> <seeds> <f1,f2,...> */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto(URL + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const from = parseInt(process.argv[2], 10) || 1, to = parseInt(process.argv[3], 10) || 30, seeds = parseInt(process.argv[4], 10) || 10;
  const fs_ = (process.argv[5] || '1,1.5,2,3').split(',').map(Number), bossMode = process.argv[6] === 'boss';
  const only = process.argv[7] ? process.argv[7].split(',').map(Number) : null;
  for (let L = from; L <= to; L++) {
    if (only && only.indexOf(L) < 0) continue;
    const rows = await page.evaluate(([L, seeds, fs_, bossMode]) => {
      const PP = window.PP, out = [], def = PP.data.levels[L], prof = PP.econ.expectedProfile(L), arr = bossMode ? PP.bal.BOSS_TUNE : PP.bal.TUNE, idx = bossMode ? L / 6 : L, base = arr[idx];
      for (const f of fs_) {
        arr[idx] = f;
        let wins = 0, sq = 0, st = 0, time = 0, d0 = null, s2 = 0;
        for (let k = 0; k < seeds; k++) {
          const r = PP.balance.simLevel(L, { prof, seed: def.seed + 1000 * k });
          if (k === 0) d0 = r;
          if (r.win) { wins++; sq += r.endSquad; st += r.stars; time += r.time; if (r.stars >= 2) s2++; }
        }
        const nu = PP.balance.simLevel(L, { prof: PP.save.defaults(), seed: def.seed });
        let nuW = 0; for (let k = 0; k < Math.min(6, seeds); k++) if (PP.balance.simLevel(L, { prof: PP.save.defaults(), seed: def.seed + 1000 * k }).win) nuW++;
        out.push({ f, rate: wins / seeds, sq: wins ? Math.round(sq / wins) : 0, st: wins ? (st / wins).toFixed(1) : '-', time: wins ? Math.round(time / wins) : 0, d0: (d0.win ? 'W' + d0.stars : 'F' + Math.round(d0.progress * 100)), nu: (nu.win ? 'W' : 'F' + Math.round(nu.progress * 100)), nuRate: nuW / Math.min(6, seeds) });
      }
      arr[idx] = base;
      return out;
    }, [L, seeds, fs_, bossMode]);
    const mid = 5 + 1.6 * (L - 1);
    console.log('L' + L + ' mid ' + mid.toFixed(0) + ': ' + rows.map(r => 'x' + r.f + ' ' + Math.round(r.rate * 100) + '% sq' + r.sq + ' *' + r.st + ' t' + r.time + ' d0=' + r.d0 + ' nu=' + r.nu + '/' + Math.round(r.nuRate * 100)).join(' | '));
  }
  await browser.close();
})();
