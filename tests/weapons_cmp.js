/* Weapon order check (FIX_PLAN_R1 gameplay-3): same level, same expected profile (same shared Toy Level),
 * only the toy swapped, "good" simulated human.
 *   - the newest toy must be the best, or within 5 points of the best, on its world's levels;
 *   - every later toy must reach at least Star - 5 points there.
 * Usage: node tests/weapons_cmp.js [runs=12] [model=good] [H=640]. Exit 1 on a miss. */
'use strict';
const { pool } = require('./lib');
(async () => {
  const runs = parseInt(process.argv[2], 10) || 12, model = process.argv[3] || 'good', H = parseInt(process.argv[4], 10) || 640;
  const levels = []; for (let L = 4; L <= 30; L++) levels.push(L);
  const { out, errors } = await pool(levels.map(L => ({ L, runs, model, H })), a => window.PP.balance.weapons({ levels: [a.L], runs: a.runs, model: a.model, H: a.H }).res, 4);
  // merge the per-level results and evaluate once
  const { out: fin } = await pool([{ out, levels, runs, model }], a => {
    const PP = window.PP, B = PP.bal, D = PP.data, W = D.weapons.map(w => w.id), res = {}, text = [], bad = [];
    W.forEach(id => { res[id] = {}; });
    a.out.forEach((r, i) => { W.forEach(id => { if (r[id][a.levels[i]] !== undefined) res[id][a.levels[i]] = r[id][a.levels[i]]; }); });
    const pad = (s, n) => { s = String(s); while (s.length < n) s = ' ' + s; return s; };
    text.push('weapon win% (' + a.model + ', ' + a.runs + ' seeds, same Toy Level)');
    text.push('         ' + a.levels.map(l => pad('L' + l, 4)).join(''));
    W.forEach(id => text.push((id + '        ').slice(0, 9) + a.levels.map(l => pad(res[id][l] === undefined ? '.' : res[id][l], 4)).join('')));
    for (let wi = 1; wi < W.length; wi++) {
      const nw = D.weaponById[W[wi]], from = nw.unlock + 1, wd = B.world(from); let to = wd * 6;
      if (wi + 1 < W.length) to = Math.min(to, D.weaponById[W[wi + 1]].unlock);
      const cmp = {}; let best = -1;
      W.forEach(id => { let s = 0, n = 0; for (let L = from; L <= to; L++) if (res[id][L] !== undefined) { s += res[id][L]; n++; } if (n) { cmp[id] = Math.round(s / n); if (cmp[id] > best) best = cmp[id]; } });
      text.push('W' + wd + ' L' + from + '-' + to + ' newest ' + nw.id + ': ' + W.filter(x => cmp[x] !== undefined).map(x => x + ' ' + cmp[x] + '%').join(', '));
      if (cmp[nw.id] < best - 5) bad.push('L' + from + '-' + to + ': newest toy ' + nw.id + ' ' + cmp[nw.id] + '% is more than 5 pts below the best (' + best + '%)');
      if (cmp.star !== undefined && nw.id !== 'star' && cmp[nw.id] < cmp.star - 5) bad.push('L' + from + '-' + to + ': ' + nw.id + ' ' + cmp[nw.id] + '% < Star ' + cmp.star + '% - 5');
    }
    text.push(bad.length ? 'weapon-order misses: ' + bad.join('; ') : 'weapon order OK (newest toy best or within 5 pts; every world toy >= Star - 5)');
    return { text: text.join('\n'), bad };
  }, 1);
  console.log(fin[0].text);
  console.log('page errors: ' + errors.length);
  process.exit(errors.length ? 2 : (fin[0].bad.length ? 1 : 0));
})().catch(e => { console.error(e); process.exit(2); });
