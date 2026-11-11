/* Pompom Parade - level validator: gate fairness rules (GDD 3.7), enemy counts vs density,
 * intro order, sizes, seeds, ids. Also exposes the timing helpers used by tools/gen_levels.js. */
(function () {
  'use strict';
  var PP = window.PP, B = PP.bal, D = PP.data;
  var V = PP.validator = { DIST: 570, MIN_DIST: 530 };
  var OBJ_INTRO = { crate: 2, spinner: 4, gift: 10, roller: 11, jar: 11, syrup: 16, fence: 20, ice: 21 };
  var PICK_INTRO = { button: 1, stack: 2, heart: 3, shield: 7, frenzy: 8, magnet: 11 };
  var HAZ = { spinner: 1, roller: 1, fence: 1 };

  /* time at which an enemy spawned at t reaches the squad line (nominal 640-high screen) */
  V.enemyArrival = function (id, t, s) {
    var d = D.enemies[id], v = d.speed;
    if (d.ai === 'cloud') return t + 190 / (s + v) + 6 + 380 / (s + v);
    if (d.ai === 'dash') return t + 210 / (s + v) + 0.8 + 360 / (s + 420);
    return t + V.DIST / (s + v);
  };
  V.waveWindow = function (p, t, s) {
    var d = D.enemies[p.e], first = V.enemyArrival(p.e, t, s);
    return [first, first + PP.patterns.span(p.p, p.n, s + d.speed)];
  };
  V.objArrival = function (o, t, s) {
    if (o === 'roller') return t + 1.0 + (V.DIST + 6) / (s + 160);
    if (o === 'spinner' || o === 'ice') return t + (V.DIST + 20) / s;
    return t + V.DIST / s;
  };
  V.gateArrival = function (t, s) { return t + V.DIST / s; };
  /* rule 5: something arriving in [a0,a1] conflicts with a gate row arriving at ga */
  V.conflict = function (a0, a1, ga, s, hazard, halfH) {
    var before = 160 / s + 0.15 + (halfH || 0) / s;
    if (hazard && before < 1.5 + (halfH || 0) / s) before = 1.5 + (halfH || 0) / s;
    return a1 > ga - before && a0 < ga + 0.2 + (halfH || 0) / s;
  };
  V.gateInfo = function (tok) {
    if (tok === 'pop' || tok === 'spd' || tok === 'grow') return { type: tok, val: 0, neg: false };
    if (tok === '+auto') return { type: 'add', val: 0, neg: false };
    if (tok === '-auto') return { type: 'sub', val: 0, neg: true };
    var c = tok.charAt(0), v = parseInt(tok.slice(1), 10);
    var type = c === '+' ? 'add' : (c === 'x' ? 'mul' : (c === '-' ? 'sub' : (c === '/' ? 'div' : null)));
    return { type: type, val: v, neg: type === 'sub' || type === 'div' };
  };
  V.gateScore = function (tok, n, A) {
    var g = V.gateInfo(tok);
    switch (g.type) {
      case 'add': return n + (g.val || A);
      case 'mul': return n * g.val;
      case 'sub': return Math.max(1, n - (g.val || Math.round(0.75 * A)));
      case 'div': return Math.max(1, Math.floor(n / g.val));
      case 'grow': return n + Math.round(1.4 * A);          // grow gates are usually shot most of the way up (max 1.5 A)
      default: return n * 1.2;
    }
  };
  V.bestIndex = function (toks, n, A) {
    var b = 0, bs = -1;
    for (var i = 0; i < toks.length; i++) { var sc = V.gateScore(toks[i], n, A); if (sc > bs) { bs = sc; b = i; } }
    return b;
  };

  V.checkLevel = function (def, errors, warnings) {
    var L = def.id, s = def.scroll, beats = def.beats, i, j, b, p;
    function err(m) { errors.push('L' + L + ': ' + m); }
    function warn(m) { warnings.push('L' + L + ': ' + m); }
    var boss = B.isBoss(L), A = B.A(L);
    var info = { id: L, enemies: 0, target: 0, rows: 0, x3: 0, objs: 0, picks: 0 };
    // sizes
    if (def.world !== B.world(L)) err('world mismatch');
    var wantLen = boss ? 35 + 2 * def.world : B.runLen(L);
    if (Math.abs(def.length - wantLen) > 0.5) err('length ' + def.length + ' != ' + wantLen);
    if (def.scroll !== B.scroll(L)) err('scroll ' + def.scroll + ' != ' + B.scroll(L));
    if (V.MIN_DIST / s < 3) err('rule 7: rows visible < 3 s');
    var gates = [], prevT = -1, n = 3, sameSide = 0, lastSide = -1, hasEnd = false;
    for (i = 0; i < beats.length; i++) {
      b = beats[i]; p = b[2] || {};
      if (b[0] < prevT) err('beats not sorted at index ' + i);
      prevT = b[0];
      if (b[0] > def.length + 0.01) err('beat after level end at ' + b[0]);
      if (b[1] === 'wave') {
        var ed = D.enemies[p.e];
        if (!ed || !ed.grumbly || ed.id === 'mini') { err('unknown enemy ' + p.e); continue; }
        if (PP.patterns.list.indexOf(p.p) < 0) err('unknown pattern ' + p.p);
        if (ed.intro > L) err(p.e + ' used before its intro level ' + ed.intro);
        if (p.el && L < 19) err('elite before L19');
        if (p.lane !== undefined && (p.lane < 0 || p.lane > 3)) err('bad lane');
        if (p.x !== undefined && (p.x < 42 || p.x > 318)) err('bad x');
        info.enemies += PP.patterns.count(p.p, p.n);
      } else if (b[1] === 'gates') {
        var toks = p.g;
        if (!toks || (toks.length !== 2 && toks.length !== 3)) { err('bad gate row'); continue; }
        if (toks.length === 3 && L < 13) err('3-gate row before L13');
        if (p.move && L < 25) err('moving gate before L25');
        var neg = 0, nonNeg = 0, has3 = false, hasNegOrDiv = false;
        for (j = 0; j < toks.length; j++) {
          var g = V.gateInfo(toks[j]);
          if (!g.type) { err('bad gate token ' + toks[j]); continue; }
          if (g.neg) { neg++; hasNegOrDiv = true; } else nonNeg++;
          if (g.type === 'mul' && g.val === 2 && L < 2) err('x2 before L2');
          if (g.type === 'mul' && g.val === 3) { has3 = true; info.x3++; if (L < 13) err('x3 before L13'); }
          if (g.type === 'mul' && g.val > 3) err('multiplier > 3');
          if (g.type === 'sub' && L < 4) err('red gate before L4');
          if (g.type === 'div' && L < 13) err('divide gate before L13');
          if ((g.type === 'pop' || g.type === 'spd' || g.type === 'grow') && L < 7) err(g.type + ' gate before L7');
          if (g.type === 'sub' && PP.gates.result({ type: 'sub', val: g.val }, 1) < 1) err('rule 2 violated');
        }
        if (nonNeg < 1) err('rule 1: row without a non-negative gate at t=' + b[0]);
        if (L <= 3 && neg > 0) err('rule 3: negative gate in L1-3');
        if (L >= 4 && L <= 12 && neg > 1) err('rule 3: > 1 negative gate at t=' + b[0]);
        if (L >= 13 && neg > 2) err('rule 3: > 2 negative gates at t=' + b[0]);
        if (has3 && !hasNegOrDiv) err('rule 4: x3 not paired with a negative / divide gate');
        // rule 6: side of the best gate
        var best = V.bestIndex(toks, n, A);
        if (best === lastSide) { sameSide++; if (sameSide > 3) err('rule 6: best gate on the same side > 3 rows in a row at t=' + b[0]); }
        else { sameSide = 1; lastSide = best; }
        n = Math.round(V.gateScore(toks[best], n, A)); if (toks[best] === 'pop' || toks[best] === 'spd') n = Math.round(n / 1.2);
        gates.push(b[0]); info.rows++;
      } else if (b[1] === 'obj') {
        if (OBJ_INTRO[p.o] === undefined) err('unknown object ' + p.o);
        else if (OBJ_INTRO[p.o] > L) err(p.o + ' used before its intro level');
        info.objs++;
      } else if (b[1] === 'pick') {
        if (PICK_INTRO[p.k] === undefined) err('unknown pickup ' + p.k);
        else if (PICK_INTRO[p.k] > L) err(p.k + ' used before its intro level');
        info.picks++;
      } else if (b[1] === 'boss') { hasEnd = true; if (!boss) err('boss beat in a normal level'); }
      else if (b[1] === 'finish') { hasEnd = true; if (boss) err('finish beat in a boss level'); }
      else if (b[1] !== 'hint') err('unknown beat kind ' + b[1]);
    }
    if (!hasEnd) err('no finish / boss beat');
    if (info.x3 > 2) err('rule 4: more than 2 x3 gates');
    if (boss ? info.rows < 3 : (info.rows < 4 || info.rows > 8)) err('gate rows = ' + info.rows);
    // rule 5: nothing in the 160 u band before a gate row; no row within 1.5 s after a hazard
    for (i = 0; i < beats.length; i++) {
      b = beats[i]; p = b[2] || {};
      var a0, a1, haz = false, hh = 0;
      if (b[1] === 'wave') { var w = V.waveWindow(p, b[0], s); a0 = w[0]; a1 = w[1]; }
      else if (b[1] === 'obj') {
        if (p.o === 'syrup' || p.o === 'ice') hh = p.o === 'ice' ? 50 : 40;
        a0 = a1 = V.objArrival(p.o, b[0], s); haz = !!HAZ[p.o];
      } else continue;
      for (j = 0; j < gates.length; j++) {
        if (V.conflict(a0, a1, V.gateArrival(gates[j], s), s, haz, hh)) err('rule 5: ' + (p.e || p.o) + ' at t=' + b[0] + ' too close to the gate row at t=' + gates[j]);
      }
    }
    // count rule
    info.target = Math.round(B.density(L) * def.length / 10);
    if (Math.abs(info.enemies - info.target) > Math.max(1, info.target * 0.1) + 0.5) err('enemy count ' + info.enemies + ' vs target ' + info.target + ' (+-10%)');
    if (gates.length && gates[0] < 3) warn('first gate row very early');
    return info;
  };

  V.run = function () {
    var errors = [], warnings = [], levels = [], seeds = {}, L;
    if (!D.levels) return { ok: false, errors: ['no level data'], warnings: [], levels: [] };
    for (L = 1; L <= 30; L++) {
      var def = D.levels[L];
      if (!def) { errors.push('L' + L + ': missing'); continue; }
      if (def.id !== L) errors.push('L' + L + ': id mismatch');
      if (seeds[def.seed]) errors.push('L' + L + ': duplicate seed ' + def.seed);
      seeds[def.seed] = 1;
      levels.push(V.checkLevel(def, errors, warnings));
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings, levels: levels };
  };
})();
