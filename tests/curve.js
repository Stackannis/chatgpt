/* Difficulty curve check: wave HP per second per level, g(L), per-level corrections, boss HP.
 * Rules (FIX_PLAN_R1): normal levels x1.00-1.20 of the previous normal level, world openers x0.85-0.95 of L-2,
 * corrections within +-8 %, g(L) with at most 4 knots. Also runs the level validator. Exit 1 on a miss. */
'use strict';
const { pool } = require('./lib');
(async () => {
  const { out, errors } = await pool([0], () => { const c = window.PP.balance.curve(), v = window.PP.validator.run(); return { text: c.text, bad: c.bad, v: { ok: v.ok, errors: v.errors, warnings: v.warnings.length }, knots: window.PP.bal.G_KNOTS, boss: window.PP.bal.BOSS_TUNE }; }, 1);
  const r = out[0];
  console.log(r.text);
  console.log('g(L) knots: ' + JSON.stringify(r.knots) + '   boss HP factor per world: ' + JSON.stringify(r.boss.slice(1)));
  console.log('validator: ' + (r.v.ok ? 'OK' : 'FAILED ' + r.v.errors.slice(0, 10).join(' | ')) + ' (' + r.v.warnings + ' warnings)');
  console.log('page errors: ' + errors.length);
  process.exit(r.bad.length || !r.v.ok || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
