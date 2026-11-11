/* Tuning helper: sweep one balance factor at run time and print the win% of the player models.
 *   node tests/tune.js boss "1,0.8,0.6" [runs=24] [levels=6,12,18,24,30] [models=good,avg,lazy,bot]
 *       boss HP factor of that level's world (PP.bal.BOSS_TUNE)
 *   node tests/tune.js g "0.8,1,1.25" [runs] [levels] [models]
 *       global toughness factor g(L) (all four knots; enemy HP only, the level beats are not regenerated)
 * Nothing is written: put the chosen numbers into js/data/balance.js, re-run tools/gen_levels.js when the
 * wave budget (HPS) changed, then check with tests/balance.js and tests/curve.js. */
'use strict';
const { pool } = require('./lib');
(async () => {
  const mode = process.argv[2] === 'g' ? 'g' : 'boss', vals = (process.argv[3] || '1,0.8,0.6').split(',').map(Number), runs = parseInt(process.argv[4], 10) || 24;
  const levels = process.argv[5] ? process.argv[5].split(',').map(Number) : (mode === 'boss' ? [6, 12, 18, 24, 30] : [5, 9, 11, 15, 17, 21, 23, 27, 29]);
  const models = (process.argv[6] || 'good,avg,lazy,bot').split(',');
  const items = []; for (const L of levels) for (const v of vals) items.push({ L, v, runs, mode, models });
  const { out, errors } = await pool(items, a => {
    const PP = window.PP, B = PP.bal;
    if (a.mode === 'boss') B.BOSS_TUNE[B.world(a.L)] = a.v; else B.G_KNOTS.forEach(k => { k[1] = a.v; });
    const cells = a.models.map(m => { const c = PP.balance.cell(a.L, m, 640, a.runs, {}); return m + ' ' + String(c.w).padStart(3) + '%/' + String(c.prog).padStart(3); });
    return 'L' + String(a.L).padEnd(3) + (a.mode === 'boss' ? ' boss HP x' : ' g = ') + String(a.v).padEnd(5) + cells.join('   ');
  }, 4);
  console.log('cell = win% / avg progress%, ' + runs + ' seeds, expected profile, H = 640');
  console.log(out.join('\n'));
  process.exit(errors.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(2); });
