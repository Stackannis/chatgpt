/* Pompom Parade - almost wordless tutorial hints. Each hint shows once (stored in save.hints). */
(function () {
  'use strict';
  var PP = window.PP;
  var T = PP.tut = { arrowRow: null, slowDone: false, crate: null, crateUid: 0, dash: { t: 0, x0: 0, y0: 0, x1: 0, y1: 0 }, time: 0 };

  T.enabled = function () { return PP.G.tutorial && PP.params.tutorial !== '0' && !PP.headless; };
  T.seen = function (k) { return !!(PP.save.data && PP.save.data.hints[k]); };
  T.done = function (k) {
    if (!PP.save.data || PP.save.data.hints[k]) { if (k === 'drag') PP.ui.hint(null); return; }
    PP.save.data.hints[k] = 1; PP.save.write();
    if (k === 'drag') PP.ui.hint(null);
  };
  /* one-line hint (FR/EN) for a newly introduced element */
  T.show = function (k) {
    if (!T.enabled() || !k || T.seen(k)) return;
    var key = 'hint.' + k, s = PP.t(key);
    if (s === key) return;
    PP.ui.hint(s, 3.6);
    T.done(k);
  };
  T.onStart = function () {
    var G = PP.G;
    T.arrowRow = null; T.slowDone = false; T.crate = null; T.dash.t = 0; T.time = 0;
    PP.ui.hint(null);
    if (!T.enabled()) return;
    if (G.hold) PP.ui.hint(PP.t('hint.drag'));
    else if (G.def && G.def.intro && G.def.intro !== 'drag') T.show(G.def.intro);
  };
  T.onGateRow = function (row) {
    var G = PP.G;
    if (!T.enabled()) return;
    if (!T.seen('gate')) { T.arrowRow = row; T.slowDone = false; }
    if (G.levelId === 4 && !T.seen('redshake')) {
      for (var i = 0; i < row.n; i++) if (row.g[i].col === 'coral') { row.tut = true; T.done('redshake'); break; }
    }
  };
  T.onObject = function (o, e) {
    if (!T.enabled()) return;
    if (o === 'crate' && !T.seen('cratefx')) { T.crate = e; T.crateUid = e.uid; T.done('cratefx'); }
  };
  T.onRaindrop = function (d, x) {
    if (PP.headless || !PP.G.tutorial || T.seen('rain')) return;
    var k = T.dash; k.t = 1.3; k.x0 = d.x; k.y0 = d.y; k.x1 = x; k.y1 = PP.G.sy;
    T.done('rain');
  };

  /* called once per rendered frame while playing */
  T.draw = function (dt) {
    var G = PP.G, R = PP.R, spr = PP.spr, SQ = PP.squad, i;
    if (!G.on || G.mode !== 'level') return;
    T.time += dt;
    if (G.hold) {
      var hx = 180 + 78 * Math.sin(T.time * 2.4);
      R.drawX(spr.h_hand, hx, G.sy - 120, 1.2, 1.2, 0);
      R.ctx.globalAlpha = 0.5; R.drawX(spr.h_arrow, 180 - 112, G.sy - 126, 0.8, 0.8, Math.PI / 2); R.drawX(spr.h_arrow, 180 + 112, G.sy - 126, 0.8, 0.8, -Math.PI / 2); R.ctx.globalAlpha = 1;
    }
    var row = T.arrowRow;
    if (row) {
      if (!row.on || row.passed) { T.arrowRow = null; T.done('gate'); }
      else if (row.y > 30) {
        var b = PP.gates.best(row, SQ.n), g = row.g[b];
        R.drawX(spr.h_arrow, g.cx + row.off, row.y - 58 + Math.sin(T.time * 9) * 6, 1.25, 1.25, 0);
        if (!T.slowDone && row.y > G.sy - 300) { T.slowDone = true; G.slow = 0.5; G.slowT = 1.5; }   // 0.5x for 1.5 s
      }
    }
    var c = T.crate;
    if (c) {
      if (c.uid !== T.crateUid || c.dead || c.y > G.sy) T.crate = null;
      else if (c.y > 0) { var s = 1 + 0.25 * Math.sin(T.time * 10); R.drawX(spr.h_spark, c.x + 16, c.y - 18, s, s, T.time * 3); R.drawX(spr.h_spark, c.x - 17, c.y + 14, 1.6 - s, 1.6 - s, -T.time * 3); R.drawX(spr.h_arrow, c.x, c.y - 44 + Math.sin(T.time * 9) * 5, 0.9, 0.9, 0); }
    }
    var d = T.dash;
    if (d.t > 0) {
      d.t -= dt;
      R.ctx.globalAlpha = Math.min(1, d.t * 2);
      var ang = Math.atan2(d.y1 - d.y0, d.x1 - d.x0) - Math.PI / 2;
      for (i = 1; i <= 12; i++) { var f = i / 13; R.drawX(spr.h_dash, d.x0 + (d.x1 - d.x0) * f, d.y0 + (d.y1 - d.y0) * f, 1, 1, ang); }
      R.drawX(spr.h_spark, d.x1, d.y1 - 30, 1.2, 1.2, T.time * 4);
      R.ctx.globalAlpha = 1;
    }
  };
})();
