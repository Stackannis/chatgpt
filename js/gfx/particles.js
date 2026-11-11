/* Pompom Parade - pooled particles and floating texts (cosmetic only, capped) */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util;
  var P = PP.particles = {};
  var pool = P.pool = new U.Pool(PP.cfg.MAX_PARTICLES, function () {
    return { s: null, x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, max: 1, rot: 0, vr: 0, sc0: 1, sc1: 1, fade: 1, drag: 0 };
  });
  var texts = P.texts = new U.Pool(PP.cfg.MAX_TEXTS, function () {
    return { buf: new Int8Array(16), len: 0, s: null, x: 0, y: 0, vy: 0, life: 0, max: 1, si: 1, ci: 0, sc: 1 };
  });

  /* spawn(sprite, x, y, vx, vy, gravity, life, scale0, scale1, rot, spin) */
  P.spawn = function (s, x, y, vx, vy, g, life, sc0, sc1, rot, vr) {
    if (pool.n >= PP.quality.particleCap) return null;
    var p = pool.spawn(); if (!p) return null;
    p.s = s; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g; p.life = life; p.max = life;
    p.sc0 = sc0; p.sc1 = sc1; p.rot = rot || 0; p.vr = vr || 0; p.fade = 1; p.drag = 0;
    return p;
  };
  /* floating number built from PP.atlas.buf (len glyphs) */
  P.text = function (len, x, y, si, ci, sc, life) {
    var t = texts.spawn(); if (!t) return null;
    for (var i = 0; i < len; i++) t.buf[i] = PP.atlas.buf[i];
    t.len = len; t.s = null; t.x = x; t.y = y; t.vy = -46; t.life = life || 0.8; t.max = t.life; t.si = si; t.ci = ci || 0; t.sc = sc || 1;
    return t;
  };
  P.sprite = function (s, x, y, sc, life) {
    var t = texts.spawn(); if (!t) return null;
    t.len = 0; t.s = s; t.x = x; t.y = y; t.vy = -30; t.life = life || 0.6; t.max = t.life; t.sc = sc || 1;
    return t;
  };
  P.clear = function () { pool.clear(); texts.clear(); };
  P.update = function (dt) {
    var a = pool.items, i, p;
    for (i = pool.n - 1; i >= 0; i--) {
      p = a[i]; p.life -= dt;
      if (p.life <= 0) { pool.killAt(i); continue; }
      p.vy += p.g * dt;
      if (p.drag) { var k = 1 - p.drag * dt; if (k < 0) k = 0; p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    var b = texts.items, t;
    for (i = texts.n - 1; i >= 0; i--) {
      t = b[i]; t.life -= dt;
      if (t.life <= 0) { texts.killAt(i); continue; }
      t.y += t.vy * dt; t.vy *= (1 - 2.5 * dt);
    }
  };
  P.draw = function () {
    var R = PP.R, ctx = R.ctx, a = pool.items, i, p, k, sc, al;
    for (i = 0; i < pool.n; i++) {
      p = a[i]; k = 1 - p.life / p.max;
      sc = p.sc0 + (p.sc1 - p.sc0) * k;
      al = p.fade ? (k < 0.6 ? 1 : (1 - k) / 0.4) : 1;
      ctx.globalAlpha = al < 0 ? 0 : al;
      if (p.rot || sc !== 1) R.drawX(p.s, p.x, p.y, sc, sc, p.rot); else R.draw(p.s, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  };
  P.drawTexts = function () {
    var R = PP.R, ctx = R.ctx, b = texts.items, i, t, k, sc;
    for (i = 0; i < texts.n; i++) {
      t = b[i]; k = 1 - t.life / t.max;
      sc = t.sc * (k < 0.18 ? 0.5 + k / 0.18 * 0.7 : (k < 0.3 ? 1.2 - (k - 0.18) / 0.12 * 0.2 : 1));
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      if (t.s) R.drawX(t.s, t.x, t.y, sc, sc, 0);
      else PP.atlas.draw(t.buf, t.len, t.x, t.y, t.si, t.ci, 0.5, sc);
    }
    ctx.globalAlpha = 1;
  };
})();
