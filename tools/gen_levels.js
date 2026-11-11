/* Pompom Parade - level authoring tool (dev only, not shipped logic).
 * Usage: node tools/gen_levels.js
 * Each level is described by a hand-written spec (enemy mix, patterns, showcase of the new element,
 * forced gate templates, objects). The composer lays those out on a timeline that respects the
 * rhythm of GDD 4.3 and the fairness rules of GDD 3.7 (using the game's own validator helpers),
 * then freezes the result as explicit beats in js/data/levels.js. Deterministic (seeded). */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console, Math, parseInt, isFinite, Number, Float32Array, Int8Array, Int16Array, Int32Array };
ctx.window.PP = { data: {}, cfg: { MAX_VIS: 30 }, spr: {}, params: {} };
vm.createContext(ctx);
['js/core/util.js', 'js/data/balance.js', 'js/data/weapons.js', 'js/data/enemies.js', 'js/data/patterns.js', 'js/game/gates.js', 'js/debug/validator.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const PP = ctx.window.PP, U = PP.util, B = PP.bal, D = PP.data, V = PP.validator, PT = PP.patterns;
const clamp = U.clamp, r1 = x => Math.round(x * 10) / 10;

/* ---------------- per-level specs ---------------- */
// mix: enemy weights. pats: allowed patterns. nmax: biggest wave. show: enemy shown alone first.
// force: gate templates forced at given row indices. elite: chance a wave has an elite. obj: overrides of object counts.
const SPEC = {
  1: { intro: 'drag', mix: { jelly: 1 }, pats: ['line', 'column', 'v'], nmax: 3, force: { 0: 'addbig', 1: 'addhalf' } },
  2: { intro: 'crate', mix: { jelly: 1 }, pats: ['line', 'column', 'v', 'sides'], nmax: 3, force: { 0: 'addbig', 1: 'x2' }, first: 'crate', obj: { crate: 3 } },
  3: { intro: 'dust', mix: { jelly: 5, dust: 3 }, pats: ['line', 'column', 'v', 'sides', 'zigzag'], nmax: 4, show: 'dust', force: { 1: 'x2' } },
  4: { intro: 'redgate', mix: { jelly: 5, dust: 4 }, pats: ['line', 'column', 'v', 'sides', 'zigzag', 'wall'], nmax: 4, force: { 1: 'trap', 2: 'trade' }, first: 'spinner', obj: { spinner: 2 } },
  5: { intro: 'bean', mix: { jelly: 4, dust: 3, bean: 2 }, pats: ['line', 'column', 'v', 'sides', 'zigzag', 'wall', 'cluster'], nmax: 4, show: 'bean', force: { 1: 'trade' } },
  6: { intro: 'boss', mix: { jelly: 4, dust: 3, bean: 2 }, pats: ['line', 'column', 'v', 'sides', 'zigzag', 'cluster', 'stream'], nmax: 4, force: { 0: 'addhalf', 1: 'trade' } },
  7: { intro: 'growgate', mix: { jelly: 4, dust: 3, bean: 3 }, pats: ['line', 'column', 'v', 'sides', 'zigzag', 'wall', 'cluster', 'stream', 'pincer'], nmax: 5, force: { 1: 'grow', 2: 'pop', 4: 'spd' } },
  8: { intro: 'twin', mix: { jelly: 3, dust: 3, bean: 3, twin: 2 }, pats: 'all', nmax: 5, show: 'twin', force: { 1: 'trade' } },
  9: { intro: 'cloud', mix: { jelly: 3, dust: 3, bean: 2, twin: 2, cloud: 1 }, pats: 'all', nmax: 5, show: 'cloud', force: { 2: 'grow' } },
  10: { intro: 'gift', mix: { jelly: 3, dust: 3, bean: 3, twin: 2, cloud: 1 }, pats: 'all', nmax: 5, first: 'gift', force: { 1: 'trap' } },
  11: { intro: 'roller', mix: { jelly: 3, dust: 3, bean: 3, twin: 2, cloud: 1 }, pats: 'all', nmax: 5, first: 'roller', obj: { roller: 2 }, force: { 2: 'pop' } },
  12: { intro: 'boss', mix: { jelly: 3, dust: 3, bean: 3, twin: 2, cloud: 1 }, pats: 'all', nmax: 5, force: { 0: 'trade', 1: 'pop' } },
  13: { intro: 'trigate', mix: { jelly: 3, dust: 3, bean: 3, twin: 3, cloud: 1 }, pats: 'all', nmax: 6, force: { 0: 't_x3', 1: 't_x2', 3: 't_mix' } },
  14: { intro: 'snail', mix: { jelly: 3, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 1 }, pats: 'all', nmax: 6, show: 'snail', obj: { gift: 1 }, force: { 2: 't_pow' } },
  15: { intro: 'dasher', mix: { jelly: 3, dust: 3, bean: 2, twin: 2, cloud: 1, snail: 1, dasher: 2 }, pats: 'all', nmax: 6, show: 'dasher', force: { 1: 't_grow' } },
  16: { intro: 'syrup', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 6, first: 'syrup', obj: { syrup: 2 } },
  17: { intro: 'gauntlet', mix: { jelly: 2, dust: 2, bean: 2, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 6, force: { 0: 't_x3' } },
  18: { intro: 'boss', mix: { jelly: 2, dust: 3, bean: 2, twin: 2, cloud: 1, snail: 1, dasher: 2 }, pats: 'all', nmax: 6, obj: { gift: 1 }, force: { 0: 't_x2' } },
  19: { intro: 'elite', mix: { jelly: 3, dust: 3, bean: 2, twin: 2, cloud: 1, snail: 1, dasher: 2 }, pats: 'all', nmax: 6, elite: 0.16, showElite: true },
  20: { intro: 'fence', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 7, elite: 0.15, first: 'fence', obj: { fence: 2 } },
  21: { intro: 'ice', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 7, elite: 0.15, first: 'ice', obj: { ice: 2 } },
  22: { intro: 'swarm', mix: { jelly: 3, dust: 7, bean: 2, twin: 1, dasher: 1 }, pats: ['stream', 'stream', 'stream', 'line', 'zigzag', 'cluster', 'pincer', 'wall'], nmax: 8, elite: 0.22 },
  23: { intro: 'hardmix', mix: { jelly: 2, dust: 3, bean: 3, twin: 3, cloud: 1, snail: 2, dasher: 3 }, pats: 'all', nmax: 7, elite: 0.2, force: { 0: 't_x3' } },
  24: { intro: 'boss', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 7, elite: 0.15, obj: { gift: 1 }, force: { 0: 't_x2' } },
  25: { intro: 'moving', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 7, elite: 0.15, move: 1 },
  26: { intro: 'eliteclouds', mix: { jelly: 2, dust: 3, bean: 2, twin: 2, cloud: 3, snail: 2, dasher: 2 }, pats: 'all', nmax: 7, elite: 0.2, eliteOnly: 'cloud', obj: { fence: 3 }, move: 0.4 },
  27: { intro: 'twinswarm', mix: { jelly: 1, dust: 2, bean: 2, twin: 6, cloud: 1, snail: 1, dasher: 5 }, pats: 'all', nmax: 7, elite: 0.15, move: 0.4 },
  28: { intro: 'traps', mix: { jelly: 2, dust: 3, bean: 3, twin: 2, cloud: 1, snail: 2, dasher: 2 }, pats: 'all', nmax: 8, elite: 0.2, move: 0.4, force: { 0: 't_x3', 1: 't_trap', 2: 't_mix', 3: 't_grow', 4: 't_trap', 5: 't_mix', 6: 't_trap', 7: 't_trap' } },
  29: { intro: 'grand', mix: { jelly: 2, dust: 3, bean: 3, twin: 3, cloud: 2, snail: 2, dasher: 3 }, pats: 'all', nmax: 8, elite: 0.25, move: 0.5 },
  30: { intro: 'boss', mix: { jelly: 2, dust: 3, bean: 3, twin: 3, cloud: 1, snail: 2, dasher: 3 }, pats: 'all', nmax: 8, elite: 0.2, move: 0.5, force: { 0: 't_x2', 1: 't_pow' } }
};
const ALL_PATS = ['line', 'column', 'v', 'wall', 'zigzag', 'cluster', 'sides', 'stream', 'pincer'];
// which patterns suit which enemy, and its max group size
const ENEMY_PATS = {
  jelly: { pats: ALL_PATS, max: 9 }, dust: { pats: ALL_PATS, max: 10 },
  bean: { pats: ['line', 'column', 'v', 'zigzag', 'sides', 'pincer', 'cluster'], max: 5 },
  twin: { pats: ['line', 'column', 'v', 'sides'], max: 4 },
  cloud: { pats: ['line'], max: 2 }, snail: { pats: ['line', 'v', 'sides'], max: 3 },
  dasher: { pats: ['line', 'sides', 'column'], max: 3 }
};
const HAZ = { spinner: 1, roller: 1, fence: 1 };

function objectCounts(L, boss, spec) {
  const c = {
    crate: L >= 2 ? (boss ? 1 : (L < 7 ? 2 : (L < 19 ? 3 : 2))) : 0,
    spinner: L >= 4 ? (boss ? 1 : (L < 13 ? 1 : (L < 19 ? 2 : 1))) : 0,
    roller: L >= 11 ? (boss ? 0 : (L < 19 ? 1 : 2)) : 0,
    jar: L >= 11 ? (boss ? 0 : 1) : 0,
    syrup: L >= 16 ? (boss ? 0 : 1) : 0,
    fence: L >= 20 ? (boss ? 0 : 1) : 0,
    ice: L >= 21 ? (boss ? 0 : 1) : 0,
    gift: L === 10 ? 1 : ((L >= 11 && L % 3 === 2 && !boss) ? 1 : 0)
  };
  Object.assign(c, spec.obj || {});
  return c;
}
function pickupList(L, boss) {
  const p = [];
  if (L === 1) p.push('button', 'button', 'button', 'button');
  if (L >= 2) p.push('stack');
  if (L >= 3) p.push('heart');
  if (L >= 13 && !boss) p.push('heart');
  if (L >= 7) p.push('shield');
  if (L >= 8 && !boss) p.push('frenzy');
  if (L >= 11 && !boss) p.push('magnet');
  if (L >= 20 && !boss) p.push('stack');
  return p;
}

/* gate row templates by band (GDD 3.7) */
function templates(L, A, n, g, rng, x3, ks) {
  const c = [], v = clamp(Math.round(g * ks), Math.max(2, Math.round(0.3 * A)), Math.round(1.25 * A)), m = Math.max(1, Math.round(A * rng.range(0.5, 1.0)));
  const half = Math.max(1, Math.round(v / 2));
  if (L <= 3) {
    c.push({ id: 'addbig', toks: ['+' + v, '+1'] });
    c.push({ id: 'addhalf', toks: ['+' + v, '+' + half] });
    if (L >= 2) c.push({ id: 'x2', toks: ['x2', '+2'] });
  } else if (L <= 12) {
    c.push({ id: 'trade', toks: ['+' + Math.max(v, Math.round(0.75 * A)), 'x2'] });
    c.push({ id: 'trap', toks: ['+' + v, '-' + m] });
    c.push({ id: 'addhalf', toks: ['+' + v, '+' + half] });
    if (L >= 7) {
      c.push({ id: 'pop', toks: ['pop', '+' + Math.max(2, Math.round(0.8 * v))] });
      c.push({ id: 'spd', toks: ['spd', '+' + Math.max(2, Math.round(0.8 * v))] });
      c.push({ id: 'grow', toks: ['grow', '+' + Math.round(0.6 * A)] });
    }
  } else {
    c.push({ id: 't_x2', toks: ['x2', '+' + Math.round(1.5 * v), '-' + A] });
    if (x3 < 2) c.push({ id: 't_x3', toks: ['x3', '/2', '+' + Math.max(v, Math.round(0.6 * A))] });
    c.push({ id: 't_pow', toks: ['pop', 'spd', '+' + v] });
    c.push({ id: 't_grow', toks: ['grow', 'grow', '-' + m] });
    c.push({ id: 't_mix', toks: ['+' + v, '-' + m, '+' + half] });
    c.push({ id: 't_trap', toks: ['+' + v, '/2', '-' + m] });
    c.push({ id: 'trade', toks: ['+' + v, 'x2'] });
  }
  return c;
}
function chooseRows(L, R, A, mid, seed, spec, ks) {
  const rng = U.rng(seed);
  const peak = 1.05 * mid, n0 = 3 + (L < 5 ? 0 : (L < 12 ? 1 : (L < 20 ? 2 : 3)));
  let n = n0, x3 = 0, vn = 3, lastSide = -1, same = 0;
  const used = {}, rows = [], trace = [];
  for (let i = 0; i < R; i++) {
    const target = n0 + (peak - n0) * Math.pow((i + 1) / R, 0.6), g = Math.max(1, target - n);
    let cands = templates(L, A, n, g, rng, x3, ks);
    // multipliers only while the squad is still small, grow gates not when already ahead of the curve
    cands = cands.filter(c => !((c.id === 't_x2' || c.id === 'trade' || c.id === 'x2') && n * 2 > target * 1.25 && !(spec.force && spec.force[i] === c.id)) && !((c.id === 'grow' || c.id === 't_grow') && n + 1.4 * A > target * 1.3 && !(spec.force && spec.force[i])));
    if (spec.force && spec.force[i]) { const f = cands.filter(c => c.id === spec.force[i]); if (f.length) cands = f; }
    else if (i === 0 && L >= 4) cands = [{ id: 'addhalf', toks: ['+' + Math.max(A, Math.round(g)), '+' + Math.max(2, Math.round(A / 2))] }];   // the first row is always a friendly boost
    let best = null, bs = 1e9;
    for (const c of cands) {
      const out = Math.max.apply(null, c.toks.map(tk => { const s = V.gateScore(tk, n, A); return (tk === 'pop' || tk === 'spd') ? n + 0.12 * (target - n) + 0.05 * n : s; }));
      const sc = (out > target ? 1.6 : 1) * Math.abs(out - target) / Math.max(4, target) + (used[c.id] || 0) * 0.3 + rng() * 0.15;
      if (sc < bs) { bs = sc; best = c; }
    }
    used[best.id] = (used[best.id] || 0) + 1;
    if (best.id === 't_x3') x3++;
    // order: seeded shuffle, best side never the same more than 2 rows in a row (rule 6 allows 3)
    let toks = best.toks.slice(), bi = 0;
    for (let tries = 0; tries < 30; tries++) {
      for (let k = toks.length - 1; k > 0; k--) { const j = rng.int(0, k), t = toks[k]; toks[k] = toks[j]; toks[j] = t; }
      bi = V.bestIndex(toks, vn, A);
      if (!(bi === lastSide && same >= 2)) break;
    }
    if (bi === lastSide) same++; else { same = 1; lastSide = bi; }
    vn = Math.round(V.gateScore(toks[bi], vn, A)); if (toks[bi] === 'pop' || toks[bi] === 'spd') vn = Math.round(vn / 1.2);
    // expected squad for shaping the next rows (best pick, minus typical losses)
    const pb = V.bestIndex(toks, n, A), tk = toks[pb];
    n = (tk === 'pop' || tk === 'spd') ? n : Math.round(V.gateScore(tk, n, A));
    trace.push(n);
    const row = { t: toks.length === 3 ? 'tri' : 'pair', g: toks };
    if (spec.move && (spec.move >= 1 || rng() < spec.move)) row.move = 1;
    rows.push(row);
  }
  return { rows, trace };
}

function genLevel(L) {
  const spec = SPEC[L], rng = U.rng(L * 7919 + 13);
  const boss = B.isBoss(L), world = B.world(L);
  const T = boss ? 35 + 2 * world : B.runLen(L), s = B.scroll(L), A = B.A(L), mid = B.mid(L);
  const travel = V.DIST / s;
  const beats = [];
  /* ---- gate rows ---- */
  const gt = [];
  let t = L === 1 ? 7 : (L <= 3 ? 6 : 3.5 + rng.range(0, 0.8));
  const lastGate = boss ? T - travel - 0.8 : T - 7.5;
  const gap = boss ? [8.6, 9.6] : [11, 13.2];
  while (t <= lastGate && gt.length < 8) { gt.push(r1(t)); t += gt.length === 1 && !boss ? rng.range(9.5, 10.5) : rng.range(gap[0], gap[1]); }
  const R = gt.length;
  let rowInfo = null;
  for (let ks = 1; ks >= 0.39; ks -= 0.1) {     // shrink the add values until the best path ends near the squad curve
    rowInfo = chooseRows(L, R, A, mid, L * 3571 + 5, spec, ks);
    if (rowInfo.trace[R - 1] <= 1.2 * mid + 2) break;
  }
  for (let i = 0; i < R; i++) beats.push([gt[i], 'gates', rowInfo.rows[i]]);
  const gateArr = gt.map(x => V.gateArrival(x, s));
  const gateConflict = (a0, a1, haz, hh) => gateArr.some(ga => V.conflict(a0 - 0.12, a1 + 0.12, ga, s, haz, hh));

  /* ---- objects + pickups ---- */
  const quiet = [];                 // [t0,t1] windows (spawn time) where no regular wave may start
  const hazArr = [];                // arrival times of hazards that need dodging
  const evArr = [];
  const tEndEv = boss ? T - travel - 1.5 : T - 4;
  function placeEvent(frac, kind, p, opts) {
    opts = opts || {};
    let te = clamp(r1(2.5 + frac * (tEndEv - 2.5)), 2.5, tEndEv);
    const name = kind === 'obj' ? p.o : p.k, haz = !!HAZ[name], hh = name === 'ice' ? 50 : (name === 'syrup' ? 40 : 0);
    for (let tries = 0; tries < 400; tries++) {
      const arr = kind === 'obj' ? V.objArrival(name, te, s) : te + V.DIST / s;
      const clash = (kind === 'obj' && gateConflict(arr, arr, haz, hh)) || (kind === 'pick' && gateConflict(arr, arr, false, 0)) ||
        evArr.some(a => Math.abs(a - arr) < (haz ? 2.2 : 1.4)) || quiet.some(q => te > q[0] - 1.5 && te < q[1] + 1.5);
      if (!clash) {
        evArr.push(arr); if (haz) hazArr.push({ arr, name });
        if (opts.alone) quiet.push([te - 2.6, te + 2.6]);
        if (opts.hint) beats.push([r1(Math.max(0, te - 0.3)), 'hint', { k: opts.hint }]);
        beats.push([te, kind, p]);
        return te;
      }
      te = r1(te + 0.3); if (te > tEndEv) te = 2.5;
    }
    console.warn('L' + L + ': could not place ' + name);
    return -1;
  }
  const counts = objectCounts(L, boss, spec);
  const objParams = name => {
    if (name === 'fence') return { o: 'fence', gap: Math.round(rng.range(95, 265)) };
    if (name === 'ice') return { o: 'ice' };
    if (name === 'syrup') return { o: 'syrup', x: Math.round(rng.range(95, 265)) };
    return { o: name, lane: rng.int(0, 3) };
  };
  // the newly introduced object first, alone, with a hint
  if (spec.first) { placeEvent(HAZ[spec.first] ? 0.3 : 0.22, 'obj', objParams(spec.first), { alone: true, hint: spec.first }); counts[spec.first] = Math.max(0, (counts[spec.first] || 1) - 1); }
  if (L === 10 || L === 14 || L === 18 || L === 24) { /* weapon preview gift boxes get a hint too */ }
  const list = [];
  Object.keys(counts).forEach(k => { for (let i = 0; i < counts[k]; i++) list.push(['obj', k]); });
  pickupList(L, boss).forEach(k => list.push(['pick', k]));
  for (let i = list.length - 1; i > 0; i--) { const j = rng.int(0, i), tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
  list.forEach((it, i) => {
    const frac = clamp((i + 0.5) / list.length + rng.range(-0.04, 0.04), 0.06, 0.97);
    if (it[0] === 'obj') placeEvent(Math.max(frac, HAZ[it[1]] ? 0.36 : (spec.first ? 0.34 : 0.1)), 'obj', objParams(it[1]), it[1] === 'gift' ? { hint: 'gift' } : null);
    else placeEvent(frac, 'pick', { k: it[1], x: Math.round(rng.range(70, 290)) }, (L === 3 && it[1] === 'heart') || (L === 7 && it[1] === 'shield') || (L === 8 && it[1] === 'frenzy') || (L === 11 && it[1] === 'magnet') ? { hint: it[1] } : null);
  });

  /* ---- showcase of a new Grumbly: alone first ---- */
  let showT = -1;
  if (spec.show || spec.showElite) {
    showT = r1(gt[0] + 3.4);
    for (let tries = 0; tries < 80; tries++) {
      const p = { p: 'line', e: spec.show || 'jelly', n: 1, x: 180 }, w = V.waveWindow(p, showT, s);
      if (!gateConflict(w[0], w[1], false, 0) && !quiet.some(q => showT > q[0] - 1 && showT < q[1] + 1)) break;
      showT = r1(showT + 0.3);
    }
    const sp = { p: 'line', e: spec.show || 'jelly', n: 1, x: 180 };
    if (spec.showElite) sp.el = 1;
    beats.push([r1(showT - 0.3), 'hint', { k: spec.show || 'elite' }]);
    beats.push([showT, 'wave', sp]);
    quiet.push([showT - 3.0, showT + 2.4]);
  }

  /* ---- waves ---- */
  const target = Math.round(B.density(L) * T / 10);
  const pats = spec.pats === 'all' ? ALL_PATS : spec.pats;
  const mixIds = Object.keys(spec.mix);
  const tStart = L <= 3 ? 3.6 : gt[0] + 1.0, tEnd = boss ? T - 1.5 : T - 0.6;
  function waveOk(tw, p) {
    if (quiet.some(q => tw > q[0] && tw < q[1])) return false;
    const w = V.waveWindow(p, tw, s);
    if (gateConflict(w[0], w[1], false, 0)) return false;
    if (hazArr.some(h => w[1] > h.arr - (h.name === 'spinner' ? 0.6 : 0.9) && w[0] < h.arr + (h.name === 'spinner' ? 0.6 : 0.9))) return false;
    if (boss && w[1] > T + 6) return false;
    return true;
  }
  function makeWave(tw, wr, forceMax) {
    // enemy by weight (new enemy only after its showcase)
    let tot = 0; const av = mixIds.filter(id => !(id === spec.show && tw < showT + 2));
    av.forEach(id => { tot += spec.mix[id]; });
    let r = wr() * tot, e = av[0];
    for (const id of av) { r -= spec.mix[id]; if (r <= 0) { e = id; break; } }
    const ep = ENEMY_PATS[e], ok = pats.filter(p => ep.pats.indexOf(p) >= 0);
    let p = ok.length ? ok[Math.floor(wr() * ok.length)] : 'line';
    const pBlock = (L < 7 ? 0 : (L < 13 ? 0.15 : (L < 19 ? 0.28 : 0.38))) + (forceMax ? 0.25 : 0);
    if (tw > gt[0] + 6 && wr() < pBlock && (e === 'jelly' || e === 'dust' || e === 'bean' || e === 'twin')) {
      const o2 = { p: 'line', e, n: e === 'bean' ? 5 : (e === 'twin' ? 4 : (L < 13 ? 5 : 6)) };
      if ((e === 'jelly' || e === 'dust') && L >= 9 && wr() < 0.4) { o2.p = 'wall'; o2.n = 5; o2.gap = Math.floor(wr() * 6); }
      if (spec.elite && L >= 19 && wr() < spec.elite && !spec.eliteOnly) o2.el = 1;
      return o2;
    }
    const prog = tw / T, hi = Math.max(2, Math.min(ep.max, Math.round(U.lerp(Math.max(2, spec.nmax - 2), spec.nmax, prog))));
    let n = forceMax ? hi : Math.max(e === 'cloud' ? 1 : 2, Math.round(U.lerp(Math.max(1, hi - 2), hi, wr())));
    if (L === 1 && tw < 14) n = Math.min(n, 2);
    const o = { p, e, n };
    if (p === 'column') { o.lane = Math.floor(wr() * 4); o.n = Math.min(n, 4); }
    else if (p === 'v') { o.x = Math.round(100 + wr() * 160); o.n = Math.max(3, n | 1); if (o.n > ep.max) o.n = ep.max >= 3 ? 3 : ep.max; }
    else if (p === 'wall') { o.n = L < 9 ? 4 : 5; o.gap = Math.floor(wr() * (7 - (6 - o.n))); if (o.gap > 6 - (6 - o.n)) o.gap = 6 - (6 - o.n); }
    else if (p === 'zigzag') { o.lane = Math.floor(wr() * 4); }
    else if (p === 'cluster') { o.x = Math.round(95 + wr() * 170); o.n = clamp(n, 3, 6); }
    else if (p === 'sides') { o.n = Math.max(2, n - (n % 2)); }
    else if (p === 'pincer') { o.n = Math.max(4, n - (n % 2)); if (o.n > ep.max) o.n = ep.max - (ep.max % 2); }
    else if (p === 'line' && n <= 3) { o.x = Math.round(80 + wr() * 200); }
    if (o.n > ep.max) o.n = ep.max;
    if (spec.elite && L >= 19 && wr() < spec.elite && (!spec.eliteOnly || spec.eliteOnly === e) && e !== 'cloud' || (spec.eliteOnly === 'cloud' && e === 'cloud' && wr() < 0.6)) o.el = 1;
    return o;
  }
  function compose(k) {
    const wr = U.rng(L * 104729 + 71), out = [];
    let tw = tStart, total = 1 + ((spec.show || spec.showElite) ? 1 : 0), lastCloud = -99;
    while (tw <= tEnd) {
      const cres = !boss && tw > T - 10;
      let o = makeWave(tw, wr, cres && wr() < 0.6);
      if (o.e === 'cloud') { if (tw - lastCloud < 9 || (boss && tw > T - 12)) { o = makeWave(tw, wr, false); if (o.e === 'cloud') { o.e = 'jelly'; o.p = 'line'; o.n = 3; delete o.el; } } }
      let found = -1;
      for (let tt = tw; tt <= tEnd; tt = r1(tt + 0.2)) { if (waveOk(tt, o)) { found = tt; break; } }
      if (found < 0) break;
      if (o.e === 'cloud') lastCloud = found;
      const cnt = PT.count(o.p, o.n);
      out.push([r1(found), 'wave', o]); total += cnt;
      const span = PT.span(o.p, o.n, s + D.enemies[o.e].speed);
      tw = found + Math.max(0.8, span * 0.7, cnt * k * (cres ? 0.7 : 1));
    }
    return { out, total };
  }
  // binary search the spacing factor so that the enemy count matches density x length / 10
  let lo = 0.05, hi = 3, res = null;
  for (let it = 0; it < 28; it++) {
    const k = (lo + hi) / 2; res = compose(k);
    if (res.total > target) lo = k; else hi = k;
    if (Math.abs(res.total - target) <= Math.max(1, target * 0.03)) break;
  }
  // fine-tune n on a few waves to land inside +-10 %
  let diff = target - res.total;
  for (const b of res.out) {
    if (Math.abs(diff) <= Math.max(1, target * 0.04)) break;
    const o = b[2], ep = ENEMY_PATS[o.e];
    if (o.p !== 'line' && o.p !== 'stream' && o.p !== 'zigzag') continue;
    if (diff > 0 && o.n < ep.max) { o.n++; diff--; } else if (diff < 0 && o.n > 2) { o.n--; diff++; }
  }
  beats.push([1.5, 'wave', { p: 'line', e: 'jelly', n: 1, x: 180 }]);
  res.out.forEach(b => beats.push(b));
  beats.push([T, boss ? 'boss' : 'finish', boss ? { b: L / 6 } : {}]);
  beats.sort((a, b) => a[0] - b[0] || (a[1] === 'hint' ? -1 : 0));
  let enemies = 0;
  beats.forEach(b => { if (b[1] === 'wave') enemies += PT.count(b[2].p, b[2].n); });
  return { def: { id: L, world, seed: L * 101 + 7, length: T, scroll: s, intro: spec.intro, beats }, enemies, target, trace: rowInfo.trace };
}

/* ---------------- emit ---------------- */
let out = '/* Pompom Parade - the 30 level timelines (GDD 4.3).\n' +
  ' * Authored with tools/gen_levels.js (per-level specs + composer), then frozen here as explicit beats:\n' +
  ' *   [time s, kind, params]   kind: wave | gates | obj | pick | hint | boss | finish\n' +
  ' *   wave  {p: pattern, e: enemy, n: count, x|lane|gap: placement, el: elites}\n' +
  ' *   gates {t: pair|tri, g: [tokens], move: 1}   tokens: +N xN -N /N pop spd grow\n' +
  ' * Edit by hand or re-run the tool; then check with ?validate=1 and ?balance=1. */\n' +
  "(function () {\n  'use strict';\n  var L = window.PP.data.levels = [null];\n";
const summary = [];
for (let L = 1; L <= 30; L++) {
  const g = genLevel(L), d = g.def;
  out += '  L.push({ id: ' + d.id + ', world: ' + d.world + ', seed: ' + d.seed + ', length: ' + d.length + ', scroll: ' + d.scroll + ", intro: '" + d.intro + "', beats: [\n";
  out += d.beats.map(b => '    ' + JSON.stringify(b).replace(/"([a-zA-Z0-9_]+)":/g, '$1:').replace(/"/g, "'")).join(',\n');
  out += '\n  ] });\n';
  summary.push('L' + L + ' enemies ' + g.enemies + '/' + g.target + ' rows ' + d.beats.filter(b => b[1] === 'gates').length + ' squad(best) ' + g.trace.join('>') + ' mid ' + r1(B.mid(L)));
}
out += '})();\n';
fs.writeFileSync(path.join(root, 'js/data/levels.js'), out);
console.log(summary.join('\n'));
// validate what we just wrote
vm.runInContext(out, ctx, { filename: 'levels.js' });
const rep = V.run();
console.log('validator: ' + (rep.ok ? 'OK' : 'FAILED') + ' errors=' + rep.errors.length + ' warnings=' + rep.warnings.length);
rep.errors.slice(0, 40).forEach(e => console.log('  ERR ' + e));
rep.warnings.slice(0, 10).forEach(e => console.log('  warn ' + e));
console.log('levels.js bytes: ' + out.length);
