/* Endless ("Parade Marathon") survival with the simulated-human models (headless), full L30 profile + Rainbow Beam.
 * Targets (FIX_PLAN_R1 gameplay-7, 24 runs): good median 4-7 min, avg median 2-4 min, bot dies before 15 min in >= 80 %.
 * Usage: node tests/endless_sim.js [runs=24] [models=good,avg,bot] [maxMinutes=15]. Exit 1 on a miss. */
'use strict';
const { pool } = require('./lib');
(async () => {
  const runs = parseInt(process.argv[2], 10) || 24, models = (process.argv[3] || 'good,avg,bot').split(','), cap = parseInt(process.argv[4], 10) || 15;
  const items = []; for (const m of models) for (let k = 0; k < runs; k++) items.push({ m, k, cap });
  const t0 = Date.now();
  const { out, errors } = await pool(items, a => {
    const PP = window.PP, prof = PP.econ.expectedProfile(30);
    prof.weapons.beam.own = 1; prof.equipped = 'beam'; prof.unlocked = 31;
    const r = PP.humans.run('endless', prof, a.m, 1000 * (a.k + 1) + 7, { H: 640, maxTime: a.cap * 60, cfg: { cards: a.m === 'bot' ? 'bot' : 'rand' } });
    return { m: a.m, t: Math.round(r.time), died: !r.timeout, score: r.score, peak: r.squadPeak };
  }, 4);
  const bad = [];
  for (const m of models) {
    const rs = out.filter(r => r.m === m), t = rs.map(r => r.t).sort((a, b) => a - b), n = t.length;
    const med = (t[(n - 1) >> 1] + t[n >> 1]) / 2, died = rs.filter(r => r.died).length / n;
    console.log(m.padEnd(6) + ' median ' + (med / 60).toFixed(1) + ' min (' + Math.round(med) + ' s)  min ' + t[0] + ' s  max ' + t[n - 1] + ' s  died before ' + cap + ' min: ' + Math.round(100 * died) + '%  median score ' + rs.map(r => r.score).sort((a, b) => a - b)[n >> 1] + ' m  times: ' + t.join(','));
    if (m === 'good' && (med < 240 || med > 420)) bad.push('good median ' + (med / 60).toFixed(1) + ' min outside 4-7');
    if (m === 'avg' && (med < 120 || med > 240)) bad.push('avg median ' + (med / 60).toFixed(1) + ' min outside 2-4');
    if (m === 'bot' && died < 0.8) bad.push('bot dies before ' + cap + ' min in only ' + Math.round(100 * died) + '% of runs');
  }
  console.log(bad.length ? 'endless misses: ' + bad.join('; ') : 'endless targets hold');
  console.log(((Date.now() - t0) / 1000).toFixed(0) + ' s, page errors: ' + errors.length); errors.slice(0, 5).forEach(e => console.log('  ' + e));
  process.exit(errors.length ? 2 : (bad.length ? 1 : 0));
})().catch(e => { console.error(e); process.exit(2); });
