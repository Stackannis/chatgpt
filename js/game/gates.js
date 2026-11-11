/* Pompom Parade - gate rows: add / multiply / subtract / divide / power / grow, moving modifier */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var GT = PP.gates = { rows: [] };
  var AT = null;
  function mkGate() { return { type: 'add', val: 0, x0: 0, x1: 0, cx: 0, w: 140, buf: new Int8Array(8), len: 0, v: 0, acc: 0, max: 0, need: 10, col: 'blue', flash: 0 }; }
  for (var i = 0; i < 4; i++) GT.rows.push({ on: false, y: 0, n: 2, g: [mkGate(), mkGate(), mkGate()], moving: false, ph: 0, off: 0, passed: false, chosen: -1, fade: 1, hasGrow: false, tut: false, t: 0 });

  function label(g) {
    AT = PP.atlas;
    var len = 0;
    if (g.type === 'add') len = AT.num(g.val, AT.PLUS, -1);
    else if (g.type === 'sub') len = AT.num(g.val, AT.MINUS, -1);
    else if (g.type === 'mul') len = AT.num(g.val, AT.TIMES, -1);
    else if (g.type === 'div') len = AT.num(g.val, AT.DIV, -1);
    else if (g.type === 'pop') len = AT.num(20, AT.PLUS, AT.PCT);
    else if (g.type === 'spd') len = AT.num(15, AT.PLUS, AT.PCT);
    else if (g.type === 'grow') len = AT.num(g.v, g.v < 0 ? AT.MINUS : AT.PLUS, -1);
    for (var i = 0; i < len; i++) g.buf[i] = AT.buf[i];
    g.len = len;
    g.col = (g.type === 'add') ? 'blue' : (g.type === 'mul' ? 'violet' : ((g.type === 'sub' || g.type === 'div') ? 'coral' : ((g.type === 'grow') ? (g.v < 0 ? 'coral' : 'blue') : 'gold')));
    g.spr = PP.spr['g_' + g.col + '_' + g.w];
  }

  /* parse a gate token: '+5' 'x2' '-4' '/2' 'pop' 'spd' 'grow' '+auto' '-auto' */
  GT.parse = function (tok, g, rng, A) {
    g.acc = 0; g.v = 0; g.flash = 0;
    if (tok === 'pop' || tok === 'spd') { g.type = tok; g.val = 0; }
    else if (tok === 'grow') { g.type = 'grow'; g.v = -Math.round(A / 2); g.max = Math.round(1.5 * A); g.val = 0; }
    else if (tok === '+auto') { g.type = 'add'; g.val = Math.max(1, Math.round(A * rng.range(0.75, 1.25))); }
    else if (tok === '-auto') { g.type = 'sub'; g.val = Math.max(1, Math.round(A * rng.range(0.5, 1.0))); }
    else {
      var c = tok.charAt(0), v = parseInt(tok.slice(1), 10) || 1;
      g.type = c === '+' ? 'add' : (c === 'x' ? 'mul' : (c === '-' ? 'sub' : 'div')); g.val = v;
    }
    label(g);
  };
  /* squad size after taking gate g with n pompoms (power gates: handled by caller) */
  GT.result = function (g, n) {
    switch (g.type) {
      case 'add': return Math.min(999, n + g.val);
      case 'mul': return Math.min(999, n * g.val);
      case 'sub': return Math.max(1, n - g.val);
      case 'div': return Math.max(1, Math.floor(n / g.val));
      case 'grow': return Math.max(1, Math.min(999, n + g.v));
      default: return n;
    }
  };
  /* bot / tutorial value: power gate counts as +20% of squad */
  GT.score = function (g, n) {
    if (g.type === 'pop' || g.type === 'spd') return n * 1.2;
    return GT.result(g, n);
  };

  GT.clear = function () { for (var i = 0; i < GT.rows.length; i++) GT.rows[i].on = false; };
  GT.spawnRow = function (p) {
    var G = PP.G, row = null, i;
    for (i = 0; i < GT.rows.length; i++) if (!GT.rows[i].on) { row = GT.rows[i]; break; }
    if (!row) return null;
    var toks = p.g, n = toks.length;
    row.on = true; row.y = G.oy - 40; row.n = n; row.moving = !!p.move; row.ph = 0; row.off = 0; row.passed = false; row.chosen = -1; row.fade = 1; row.hasGrow = false; row.t = 0;
    row.tut = false;
    var w = n === 2 ? 140 : 92, gap = n === 2 ? 20 : 12;
    for (i = 0; i < n; i++) {
      var g = row.g[i];
      g.w = w; g.x0 = 30 + i * (w + gap); g.x1 = g.x0 + w; g.cx = g.x0 + w / 2;
      GT.parse(toks[i], g, G.rng, G.A);
      g.need = 10 * G.hpMult;
      if (g.type === 'grow') row.hasGrow = true;
    }
    G.rowsSpawned++;
    return row;
  };
  GT.growActive = function () {
    for (var i = 0; i < GT.rows.length; i++) { var r = GT.rows[i]; if (r.on && r.hasGrow && !r.passed && r.y > PP.G.oy - 20) return true; }
    return false;
  };
  function feed(g, dmg) {
    g.acc += dmg; g.flash = 0.08;
    var ch = false;
    while (g.acc >= g.need && g.v < g.max) { g.acc -= g.need; g.v++; ch = true; }
    if (g.v >= g.max) g.acc = 0;
    if (ch) label(g);
  }
  /* grow gates absorb projectiles */
  GT.absorb = function (s) {
    for (var i = 0; i < GT.rows.length; i++) {
      var r = GT.rows[i];
      if (!r.on || !r.hasGrow || r.passed) continue;
      if (s.y > r.y + 16 || s.y < r.y - 22) continue;
      for (var k = 0; k < r.n; k++) {
        var g = r.g[k];
        if (g.type !== 'grow') continue;
        if (s.x >= g.x0 + r.off - 2 && s.x <= g.x1 + r.off + 2) { feed(g, s.dmg); if (!PP.headless) PP.fx.hit(s.x, s.y); return true; }
      }
    }
    return false;
  };
  /* beam: returns y of the nearest blocking grow gate above the squad (or -1e9) and feeds it */
  GT.beamBlock = function (x, half, dmg) {
    var G = PP.G, best = -1e9, bg = null;
    for (var i = 0; i < GT.rows.length; i++) {
      var r = GT.rows[i];
      if (!r.on || !r.hasGrow || r.passed || r.y > G.sy || r.y < G.oy) continue;
      for (var k = 0; k < r.n; k++) {
        var g = r.g[k];
        if (g.type === 'grow' && x + half > g.x0 + r.off && x - half < g.x1 + r.off && r.y > best) { best = r.y; bg = g; }
      }
    }
    if (bg) feed(bg, dmg);
    return best;
  };
  /* gate index under squad x for row r */
  GT.pick = function (r, x) {
    var best = 0, bd = 1e9;
    for (var k = 0; k < r.n; k++) {
      var g = r.g[k];
      if (x >= g.x0 + r.off && x <= g.x1 + r.off) return k;
      var d = Math.abs(x - (g.cx + r.off)); if (d < bd) { bd = d; best = k; }
    }
    return best;
  };
  /* index of the best gate for n pompoms */
  GT.best = function (r, n) {
    var b = 0, bs = -1;
    for (var k = 0; k < r.n; k++) { var s = GT.score(r.g[k], n); if (s > bs) { bs = s; b = k; } }
    return b;
  };

  function apply(r, k) {
    var G = PP.G, SQ = PP.squad, g = r.g[k], before = SQ.n, good = true, len, AT2 = PP.atlas;
    if (g.type === 'pop') { SQ.runDmg = Math.min(2.0, SQ.runDmg + 0.2); len = AT2.num(20, AT2.PLUS, AT2.PCT); }
    else if (g.type === 'spd') { SQ.runRate = Math.min(1.75, SQ.runRate + 0.15); len = AT2.num(15, AT2.PLUS, AT2.PCT); }
    else {
      var after = GT.result(g, before);
      good = after >= before;
      if (after > before) SQ.add(after - before);
      else if (after < before) {
        var lost = before - after;
        if (!PP.headless) for (var i = 0; i < Math.min(4, lost); i++) { var m = SQ.mem[Math.max(1, SQ.nvis - 1 - i)]; PP.fx.lose(m.x, m.y, m.sp); }
        SQ.setCount(after); SQ.squashT = 0.18; G.lostTotal += lost;
        if (G.lostBy) G.lostBy.gate += lost;
      }
      len = AT2.num(Math.abs(after - before), after >= before ? AT2.PLUS : AT2.MINUS, AT2.BANG);
    }
    PP.fx.gate(g.cx + r.off, G.sy - 20, good, len);
    PP.events.emit('gatePassed', { type: g.type, val: g.type === 'grow' ? g.v : g.val, before: before, after: SQ.n, good: good, best: GT.best(r, before) === k });
  }

  GT.update = function (dt) {
    var G = PP.G, SQ = PP.squad;
    for (var i = 0; i < GT.rows.length; i++) {
      var r = GT.rows[i];
      if (!r.on) continue;
      r.y += G.scroll * dt; r.t += dt;
      if (r.moving && !r.passed) { r.ph += dt; r.off = 40 * Math.sin(TAU * 0.5 * r.ph); }
      for (var k = 0; k < r.n; k++) if (r.g[k].flash > 0) r.g[k].flash -= dt;
      if (!r.passed && r.y >= G.sy) {
        r.passed = true; r.chosen = GT.pick(r, SQ.x);
        if (G.state === 'run' && SQ.n > 0) apply(r, r.chosen);
      }
      if (r.passed) { r.fade -= dt * 4; if (r.fade < 0) r.fade = 0; }
      if (r.y > G.bot + 50) r.on = false;
    }
  };

  GT.draw = function () {
    var R = PP.R, spr = PP.spr, G = PP.G, AT2 = PP.atlas, ctx = R.ctx;
    for (var i = 0; i < GT.rows.length; i++) {
      var r = GT.rows[i];
      if (!r.on || r.y < -45) continue;
      for (var k = 0; k < r.n; k++) {
        var g = r.g[k], x = g.cx + r.off, a = 1;
        if (r.passed) a = k === r.chosen ? 0.35 + 0.65 * r.fade : 0.15 + 0.45 * r.fade;
        ctx.globalAlpha = a;
        var s = g.spr;
        var shake = 0;
        if (r.tut && g.col === 'coral' && !r.passed) shake = Math.sin(r.t * 40) * 1.5;
        R.draw(s, x + shake, r.y);
        if (g.flash > 0) { ctx.globalAlpha = a * 0.4; R.drawX(s, x, r.y, 1.03, 1.06, 0); ctx.globalAlpha = a; }
        if (g.type === 'pop' || g.type === 'spd') {
          var tw = AT2.width(g.buf, g.len, 1, 1);
          R.draw(g.type === 'pop' ? spr.g_pop : spr.g_spd, x - tw / 2 - 5, r.y + 1);
          AT2.draw(g.buf, g.len, x + 10, r.y + 1, 1, 0, 0.5, 1);
        } else if (g.type === 'grow') {
          AT2.draw(g.buf, g.len, x, r.y - 3, 2, 0, 0.5, g.w < 100 ? 0.82 : 0.95);
          R.draw(spr.g_fill, x, r.y + 17);
          R.drawCrop(spr.g_fill_on, x, r.y + 17, g.v >= g.max ? 1 : g.acc / g.need);
        } else {
          AT2.draw(g.buf, g.len, x, r.y + 1, 2, 0, 0.5, g.w < 100 ? 0.88 : 1);
          if (r.tut && g.col === 'coral' && !r.passed) R.draw(spr.g_frown, x + g.w / 2 - 14, r.y - 24);
        }
      }
      ctx.globalAlpha = r.passed ? 0.3 + 0.7 * r.fade : 1;
      for (var p = 0; p <= r.n; p++) {
        var px = p === 0 ? 30 : (p === r.n ? 330 : (r.g[p - 1].x1 + r.g[p].x0) / 2);
        R.draw(spr.g_pillar, px + r.off, r.y);
      }
      ctx.globalAlpha = 1;
    }
  };
})();
