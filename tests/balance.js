/* Balance table with the simulated-human player models (js/debug/humans.js), at screen heights 600 and 780.
 * Usage: node tests/balance.js [runs=24] [models=good,avg,lazy] [H=600,780] [from-to=1-30] [profile=expected|fresh]
 * Prints win% / avg stars / avg progress per level, the band + curve-shape misses, and writes
 * tests/balance_report.json. Exit code 1 when a band is missed. The perfect bot is only the "is it possible"
 * sanity check: node tests/balance.js 24 bot 640 */
'use strict';
const fs = require('fs'), path = require('path');
const { pool } = require('./lib');
(async () => {
  const runs = parseInt(process.argv[2], 10) || 24;
  const models = (process.argv[3] || 'good,avg,lazy').split(',');
  const Hs = (process.argv[4] || '600,780').split(',').map(Number);
  const range = (process.argv[5] || '1-30').split('-').map(Number), profile = process.argv[6] || 'expected';
  const levels = []; for (let L = range[0]; L <= (range[1] || range[0]); L++) levels.push(L);
  const t0 = Date.now();
  const { out, errors } = await pool(levels.map(L => ({ L, runs, models, Hs, profile })), a => new Promise(resolve => {
    window.PP.balance.table({ levels: [a.L], runs: a.runs, models: a.models, H: a.Hs, profile: a.profile }).then(t => resolve(t.rows[a.L - 1]));
  }), 4);
  // re-assemble and check in one page-less pass (the check logic lives in the game's harness; replay it here via a page)
  const rows = []; out.forEach(r => { rows[r.L - 1] = r; });
  const { out: fin } = await pool([{ rows, models, Hs, runs }], a => {
    const t = { rows: a.rows, models: a.models, H: a.Hs, runs: a.runs, bad: window.PP.balance.check(a.rows, a.models, a.Hs) };
    return { text: window.PP.balance.format(t), bad: t.bad };
  }, 1);
  console.log(fin[0].text);
  // world averages per model (normal levels / boss)
  const avg = [];
  for (const m of models) for (const H of Hs) {
    const parts = [];
    for (let w = 1; w <= 5; w++) {
      let s = 0, n = 0, boss = null;
      for (let L = (w - 1) * 6 + 1; L <= w * 6; L++) { const r = rows[L - 1]; if (!r) continue; const c = r.cells[m + '@' + H]; if (L % 6 === 0) boss = c.w; else { s += c.w; n++; } }
      if (n) parts.push('W' + w + ' ' + Math.round(s / n) + '%' + (boss !== null ? ' / boss ' + boss + '%' : ''));
    }
    avg.push((m + '@' + H).padEnd(10) + parts.join('   '));
  }
  console.log('\nworld averages (normal levels / boss):\n' + avg.join('\n'));
  console.log('\n' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, page errors: ' + errors.length); errors.slice(0, 5).forEach(e => console.log('  ' + e));
  fs.writeFileSync(path.join(__dirname, 'balance_report.json'), JSON.stringify({ runs, models, H: Hs, profile, rows, bad: fin[0].bad }, null, 1));
  process.exit(errors.length ? 2 : (fin[0].bad.length ? 1 : 0));
})().catch(e => { console.error(e); process.exit(2); });
