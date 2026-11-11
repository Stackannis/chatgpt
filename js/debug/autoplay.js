/* Pompom Parade - "average-good" autoplay bot (GDD 9).
 * Every 0.1 s it samples x every 15 u and scores each column over the next 1.2 s:
 * danger (hazards, telegraphed lanes, enemy shots, Grumblies it cannot pop in time) = -100,
 * column HP density = +1. Gate rows within 260 u override the path. Reaction delay ~0.25 s. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var N = 19, X0 = 45, DX = 15, LOOK = 1.2;
  var sc = new Float32Array(N);
  var BOT = PP.bot = { timer: 0, q: new Float32Array(3), qi: 0, rng: null, lastX: 180, err: 0, ERR: 9, bx: 180, bvx: 0, bmin: 180, bmax: 180, bon: false };
  var CARD_ORDER = { pop: 0, rate: 1, buddy: 2, pierce: 3, big: 4, shield: 5, lucky: 6 };

  BOT.reset = function () {
    BOT.timer = 0; BOT.qi = 0; BOT.q[0] = BOT.q[1] = BOT.q[2] = 180; BOT.lastX = 180; BOT.err = 0; BOT.bx = 180; BOT.bvx = 0; BOT.bon = false; BOT.bmin = BOT.bmax = 180;
    BOT.rng = U.rng((PP.G.seed ^ 0x5bd1e995) >>> 0);
  };
  BOT.chooseCard = function () {
    var G = PP.G;
    if (!G.cards) return;
    var a = CARD_ORDER[G.cards[0].id], b = CARD_ORDER[G.cards[1].id];
    PP.cards.choose(b < a ? 1 : 0);
  };

  function danger(x0, x1, v) { // mark samples whose column [x0,x1] is dangerous
    var i0 = Math.ceil((x0 - X0) / DX), i1 = Math.floor((x1 - X0) / DX);
    if (i0 < 0) i0 = 0; if (i1 > N - 1) i1 = N - 1;
    for (var i = i0; i <= i1; i++) sc[i] += v;
  }
  function dangerOutside(g0, g1, v) { // everything except [g0,g1]
    for (var i = 0; i < N; i++) { var x = X0 + i * DX; if (x < g0 || x > g1) sc[i] += v; }
  }

  function decide() {
    var G = PP.G, SQ = PP.squad, EN = PP.enemies, GT = PP.gates, OB = PP.obst, BS = PP.boss, ES = PP.eshots, PK = PP.pickups;
    var sy = G.sy, R = SQ.R, i, k, e, x, t;
    // ---- gate rows within 260 u override the path choice ----
    var row = null;
    for (i = 0; i < GT.rows.length; i++) { var r = GT.rows[i]; if (r.on && !r.passed && r.y > sy - 260 && (!row || r.y > row.y)) row = r; }
    if (row) {
      var b = GT.best(row, SQ.n), g = row.g[b], off = row.off;
      if (row.moving) off = 40 * Math.sin(TAU * 0.5 * (row.ph + (sy - row.y) / G.scroll));
      var gx = g.cx + off;
      // stay inside the chosen gate even when the row slides off the road edge
      return U.clamp(gx, Math.max(42, g.x0 + off + 8), Math.min(318, g.x1 + off - 8));
    }
    for (i = 0; i < N; i++) sc[i] = 0;
    var dps = SQ.dps() || 1, aim = 12 + SQ.VR * 0.45;
    // ---- Grumblies and other targets ----
    var a = EN.pool.items, n = EN.pool.n;
    for (k = 0; k < n; k++) {
      e = a[k];
      if (e.dead || e.y < -30 || e.y > sy + 30) continue;
      var ai = e.def.ai, vy = G.scroll + e.own, vx = 0;
      if (ai === 'shot') { vy = e.vy; vx = e.vx; }
      else if (ai === 'cloud' && e.st === 1) vy = 0;
      else if (ai === 'dash') vy = e.st === 2 ? G.scroll + 420 : (e.st === 1 ? 0 : vy);
      else if (ai === 'static') vy = G.scroll;
      else if (ai === 'orb') vy = 0;
      var gap = sy - e.y - e.r * 0.85 - R;
      t = vy > 0 ? gap / vy : 99;
      if (ai === 'dash' && e.st === 1) t = e.tm + gap / (G.scroll + 420);
      if (t < LOOK) {
        var ex = e.x + vx * (t > 0 ? t : 0);
        var ttk = (e.hp + e.shell) / dps;
        var unkillable = ai === 'shot' ? e.hp > 1 || t < 0.25 : ttk > (t - 0.15) * 0.8;
        danger(ex - R - e.r - 5, ex + R + e.r + 5, unkillable ? -100 : -4 * e.bump);
      }
      if (ai !== 'shot' && e.y > 0) {
        // HP-density column: worth standing under (closer targets matter more)
        var w = (e.def.grumbly ? 1 : 0.6) * (0.45 + 0.55 * e.y / sy) * (e.elite ? 1.6 : 1);
        var i0 = Math.ceil((e.x - aim - e.r - X0) / DX), i1 = Math.floor((e.x + aim + e.r - X0) / DX);
        if (i0 < 0) i0 = 0; if (i1 > N - 1) i1 = N - 1;
        for (i = i0; i <= i1; i++) sc[i] += w;
      }
    }
    // ---- enemy shots ----
    var es = ES.pool.items;
    for (k = 0; k < ES.pool.n; k++) {
      var s = es[k];
      if (s.vy <= 0) continue;
      t = (sy - s.y - R) / s.vy;
      if (t < LOOK && t > -0.2) { x = s.x + s.vx * (t > 0 ? t : 0); danger(x - R - s.r - 7, x + R + s.r + 7, -100); }
    }
    // ---- hazards ----
    for (k = 0; k < OB.list.length; k++) {
      var o = OB.list[k];
      if (!o.on) continue;
      if (o.type === 'spinner') { if (o.y > sy - 75 - R - G.scroll * LOOK && o.y < sy + 70 + R) danger(o.x - 55 - R - 6, o.x + 55 + R + 6, -100); }
      else if (o.type === 'roller') {
        t = (o.st === 0 ? 1 - o.t : 0) + (sy - o.y - 26 - R) / (G.scroll + 160);
        if (t < LOOK + 0.5 && o.y < sy + 40) danger(o.x - 26 - R - 7, o.x + 26 + R + 7, -100);
      } else if (o.type === 'fence') {
        t = (sy - o.y) / G.scroll;
        if (t > -0.25 && t < 2.4) dangerOutside(o.gap - 55 + R * 0.6 + 5, o.gap + 55 - R * 0.6 - 5, t < LOOK ? -100 : -40);
      } else if (o.type === 'syrup') {
        t = (sy - o.y) / (G.scroll + o.vy);
        if (t > -0.5 && t < 1.0) danger(o.x - 60, o.x + 60, -1.5);
      }
    }
    // ---- telegraphed lanes (dashers, big rolls, snow) ----
    for (k = 0; k < OB.tele.length; k++) { var tl = OB.tele[k]; if (tl.on) danger(tl.x - R * 0.8, tl.x + tl.w + R * 0.8, -100); }
    // ---- boss ----
    if (BS.on) {
      for (k = 0; k < 2; k++) {
        var rp = BS.rip[k];
        if (!rp.on) continue;
        t = (rp.st === 0 ? rp.t : 0) + (sy - rp.y) / 150;
        if (t > -0.2 && t < 2.6) dangerOutside(rp.gapX - rp.gapW / 2 + R * 0.5 + 6, rp.gapX + rp.gapW / 2 - R * 0.5 - 6, t < LOOK ? -100 : -35);
      }
      if (BS.st === 'roll' && BS.y < sy + 40) danger(BS.x - 44 - R, BS.x + 44 + R, -100);
      if (BS.clone.on && BS.clone.st === 2) danger(BS.clone.x - 32 - R, BS.clone.x + 32 + R, -100);
      if (BS.targetable()) {
        // lead the target: aim where the boss will be when the shots arrive
        var bv = (BS.x - BOT.bx) / 0.1; BOT.bvx = BOT.bvx * 0.5 + (Math.abs(bv) < 400 ? bv : 0) * 0.5;
        var tt = SQ.weapon.speed > 0 ? (sy - BS.y) / SQ.weapon.speed : 0;
        if (!BOT.bon) { BOT.bon = true; BOT.bmin = BOT.bmax = BS.x; BOT.bvx = 0; }
        if (BS.x < BOT.bmin) BOT.bmin = BS.x; if (BS.x > BOT.bmax) BOT.bmax = BS.x;
        var ax = BS.x + BOT.bvx * (tt + 0.25);
        if (BOT.bmax - BOT.bmin > 60) { if (ax > BOT.bmax) ax = 2 * BOT.bmax - ax; else if (ax < BOT.bmin) ax = 2 * BOT.bmin - ax; }   // it turns around at the edges of its path
        ax = U.clamp(ax, 50, 310);
        for (i = 0; i < N; i++) { x = X0 + i * DX; var d = Math.abs(x - ax); sc[i] += d < BS.rx - 12 ? 3 : (d < BS.rx + 26 ? 1.2 : 0); }
      }
      BOT.bx = BS.x;
    } else BOT.bon = false;
    // ---- grow gates: stand under them to raise the number ----
    for (k = 0; k < GT.rows.length; k++) {
      var gr = GT.rows[k];
      if (!gr.on || gr.passed || !gr.hasGrow || gr.y < 0) continue;
      for (i = 0; i < gr.n; i++) { var gg = gr.g[i]; if (gg.type === 'grow' && gg.v < gg.max) { var c0 = Math.ceil((gg.x0 + 12 - X0) / DX), c1 = Math.floor((gg.x1 - 12 - X0) / DX); for (var q = c0; q <= c1; q++) if (q >= 0 && q < N) sc[q] += 2.2; break; } }
    }
    // ---- pickups ----
    var pk = PK.pool.items;
    for (k = 0; k < PK.pool.n; k++) {
      var p = pk[k];
      if (p.y > sy + 20 || p.y < sy - 320) continue;
      var pv = p.type === 'button' ? 0.5 : (p.type === 'stack' ? 1.2 : 2.6);
      var j0 = Math.ceil((p.x - SQ.PR - X0) / DX), j1 = Math.floor((p.x + SQ.PR - X0) / DX);
      for (i = j0; i <= j1; i++) if (i >= 0 && i < N) sc[i] += pv;
    }
    // ---- pick the best column (prefer staying close; tiny seeded noise = human imperfection) ----
    var best = 0, bs = -1e9, rng = BOT.rng;
    for (i = 0; i < N; i++) {
      x = X0 + i * DX;
      var v = sc[i] - Math.abs(x - SQ.x) * 0.012 - Math.abs(x - 180) * 0.002 + rng() * 0.35;
      if (v > bs) { bs = v; best = i; }
    }
    // human-like aim error: a slowly wandering offset (about +-7 u RMS, up to ~20 u) so narrow gaps are not threaded perfectly
    BOT.err = BOT.err * 0.7 + (rng() * 2 - 1) * BOT.ERR;
    return X0 + best * DX + BOT.err;
  }

  BOT.update = function (dt) {
    var SQ = PP.squad;
    BOT.timer -= dt;
    if (BOT.timer > 0) return;
    BOT.timer += 0.1;
    // reaction delay: the decision taken now is applied ~0.25 s later
    SQ.botX = U.clamp(BOT.q[BOT.qi], 42, 318);
    BOT.q[BOT.qi] = decide();
    BOT.qi = (BOT.qi + 1) % 3;
  };
})();
