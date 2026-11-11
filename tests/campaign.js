/* Full campaign from a fresh save with a simulated human: greedy spending, Helping Hand on, "Go to boss"
 * taken when it is offered (boss levels after 3 fails).
 * Targets (FIX_PLAN_R1): good finishes L30 in <= 55 attempts and <= 8 per level; avg in <= 110 and <= 15 per level.
 * Usage: node tests/campaign.js [models=good,avg] [H=640] [maxAttempts=25] [seedBases=0,1,2]. Exit 1 on a miss. */
'use strict';
const { pool } = require('./lib');
(async () => {
  const models = (process.argv[2] || 'good,avg').split(','), H = parseInt(process.argv[3], 10) || 640, maxAtt = parseInt(process.argv[4], 10) || 25;
  const bases = (process.argv[5] || '0').split(',').map(Number);
  const items = []; for (const m of models) for (const sb of bases) items.push({ m, H, maxAtt, sb });
  const { out, errors } = await pool(items, a => { const r = window.PP.balance.campaign({ model: a.m, H: a.H, maxAttempts: a.maxAtt, seedBase: a.sb }); return { m: a.m, sb: a.sb, text: r.text, attempts: r.attempts, worst: r.worst, stuck: r.stuck, minutes: r.minutes, stars: r.stars }; }, 4);
  const LIM = { good: [55, 8], avg: [110, 15] }, bad = [];
  for (const r of out) {
    console.log('--- ' + r.m + ' (seed base ' + r.sb + ') ---\n' + r.text);
    const lim = LIM[r.m];
    if (lim && (r.attempts > lim[0] || r.worst > lim[1] || r.stuck.length)) bad.push(r.m + '#' + r.sb + ': ' + r.attempts + ' attempts (limit ' + lim[0] + '), worst level ' + r.worst + ' (limit ' + lim[1] + ')' + (r.stuck.length ? ', stuck on ' + r.stuck.join(',') : ''));
  }
  console.log('\nsummary: ' + out.map(r => r.m + '#' + r.sb + ' ' + r.attempts + ' attempts / worst ' + r.worst + ' / ' + r.minutes + ' min / ' + r.stars + ' stars').join('   '));
  console.log(bad.length ? 'campaign misses: ' + bad.join('; ') : 'campaign targets hold');
  console.log('page errors: ' + errors.length); errors.slice(0, 5).forEach(e => console.log('  ' + e));
  process.exit(errors.length ? 2 : (bad.length ? 1 : 0));
})().catch(e => { console.error(e); process.exit(2); });
