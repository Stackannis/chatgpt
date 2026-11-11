/* Pompom Parade - ending: 6 canvas-drawn panels (auto-advance 2.5 s or tap), then credits.
 * Queen Grumblina sniffles, Pip gives her a flower, she smiles and joins the parade. */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h, TAU = Math.PI * 2;
  var E = PP.ending = { on: false, panel: 0, t: 0, total: 0, onDone: null, cap: null };
  var PANELS = 7;   // 6 story panels + credits

  E.start = function (onDone) {
    E.on = true; E.panel = 0; E.t = 0; E.total = 0; E.onDone = onDone;
    PP.fx.reset();
    PP.bg.setWorld(5);
    UI.show('ending');
    PP.audio.music(1, false);
  };
  E.next = function () {
    if (!E.on) return;
    E.panel++; E.t = 0;
    if (E.panel >= PANELS) { E.finish(); return; }
    if (E.panel === 5) PP.bg.setWorld(1);
    PP.audio.sfx(E.panel === 3 ? 'win' : 'card');
    E.caption();
  };
  E.finish = function () {
    if (!E.on) return;
    E.on = false;
    var cb = E.onDone; E.onDone = null;
    if (cb) cb();
  };
  E.caption = function () {
    if (!E.cap) return;
    E.cap.textContent = E.panel < 6 ? PP.t('ending.' + (E.panel + 1)) : PP.t('ending.theend') + '\n' + PP.t('ending.credits');
    E.cap.style.whiteSpace = 'pre-line';
  };
  function pom(R, name, x, y, sc, t, ph) {
    var b = Math.sin(t * 4 * TAU / 2 + ph);
    R.drawX(PP.spr['pom_' + name + '_' + (b > 0 ? 0 : 1)], x, y - (b > 0 ? b * 3 * sc : 0), sc, sc, 0);
  }
  E.frame = function (dt) {
    var R = PP.R, spr = PP.spr, t = E.t, T = E.total, Hh = R.H, cy = Hh * 0.42, i;
    E.t += dt; E.total += dt;
    if (E.t >= (E.panel === 6 ? 4.5 : 2.5)) { E.next(); if (!E.on) return; }
    PP.fx.update(dt); PP.bg.update(dt, 30);
    R.begin();
    PP.bg.draw(T * (E.panel >= 4 ? 60 : 12));
    var p = E.panel, k = Math.min(1, t / 0.5), ease = PP.util.easeOutBack(k);
    if (p === 0) {
      R.drawX(spr.b_queen, 180, cy + Math.sin(T * 9) * 1.5, 1.3, 1.3 - 0.04 * Math.abs(Math.sin(T * 4.5)), 0);
      for (i = 0; i < 4; i++) { var f = (T * 0.9 + i * 0.25) % 1; R.ctx.globalAlpha = 1 - f; R.drawX(spr.pt_dot_c, 180 + (i % 2 ? 26 : -26), cy + 6 + f * 70, 1.3, 1.6, 0); }
      R.ctx.globalAlpha = 1;
    } else if (p === 1) {
      R.drawX(spr.b_queen, 180, cy - 30, 1.15, 1.15, 0);
      var py = Hh + 40 - ease * (Hh + 40 - (cy + 150));
      pom(R, 'pip', 180, py, 2.4, T, 0);
      R.drawX(spr.b_flower, 214, py - 6, 2, 2, Math.sin(T * 3) * 0.15);
    } else if (p === 2) {
      R.drawX(spr.b_queen, 180, cy - 30, 1.15, 1.15, 0);
      pom(R, 'pip', 180, cy + 150, 2.4, T, 0);
      var fy = cy + 144 - ease * 78;
      R.drawX(spr.b_flower, 196 - ease * 16, fy, 2 + ease, 2 + ease, Math.sin(T * 3) * 0.15);
      for (i = 0; i < 6; i++) { var a = T * 1.5 + i * TAU / 6; R.drawX(spr.pt_spark, 180 + Math.cos(a) * 46, fy + Math.sin(a) * 46, 1.2, 1.2, a); }
    } else if (p === 3) {
      R.drawX(spr.b_queen_happy, 180, cy - 30 - Math.abs(Math.sin(T * 6)) * 10, 1.2 * ease, 1.2 * ease, 0);
      R.drawX(spr.b_flower, 228, cy - 4, 2.2, 2.2, 0.3);
      pom(R, 'pip', 180, cy + 150, 2.4, T * 2, 0);
      for (i = 0; i < 8; i++) { var ff = (T * 0.6 + i / 8) % 1; R.ctx.globalAlpha = 1 - ff; R.drawX(spr.pt_heart, 180 + Math.sin(i * 2.4) * 120, cy + 60 - ff * 220, 2, 2, 0); }
      R.ctx.globalAlpha = 1;
    } else if (p === 4 || p === 5 || p === 6) {
      var qy = cy - 10;
      R.drawX(spr.b_queen_happy, 180, qy - Math.abs(Math.sin(T * 5)) * 8, 1.0, 1.0, Math.sin(T * 2.5) * 0.05);
      R.drawX(spr.b_flower, 222, qy + 14, 1.8, 1.8, 0.3);
      var names = ['bunny', 'chick', 'kitten', 'mouse'];
      for (i = 0; i < 12; i++) {
        var col = i % 4, row = (i / 4) | 0;
        pom(R, names[(i * 3 + row) % 4], 78 + col * 68 + (row % 2) * 20, qy + 120 + row * 52, 1.7, T, i * 1.3);
      }
      pom(R, 'pip', 180, qy + 92, 2.0, T, 0.4);
      for (i = 0; i < 6; i++) { var fn = (T * 0.5 + i / 6) % 1; R.ctx.globalAlpha = 1 - fn; R.drawX(spr.pt_note, 60 + i * 48, qy - 60 - fn * 90, 2, 2, Math.sin(T * 3 + i) * 0.3); }
      R.ctx.globalAlpha = 1;
      if (p >= 5) {
        // the Grumblies, cheered up, float home smiling
        for (i = 0; i < 9; i++) { var fg = (T * 0.25 + i / 9) % 1; R.ctx.globalAlpha = Math.min(1, (1 - fg) * 2); R.drawX(spr.pt_ghost, 30 + ((i * 97) % 300), Hh * (1 - fg) - 20, 2.2, 2.2, Math.sin(T * 2 + i) * 0.2); }
        R.ctx.globalAlpha = 1;
        if (p === 6 && ((T * 10) | 0) % 3 === 0) PP.fx.confetti(40 + Math.random() * 280, 80 + Math.random() * 100, 3, 200);
        if (p === 6) R.drawX(spr.logo, 180, 120 + Math.sin(T * 2) * 4, 0.85, 0.85, 0);
      }
    }
    PP.particles.draw();
    PP.bg.drawAmbient();
  };

  UI.register('ending', {
    cls: 'pass',
    render: function (el) {
      var cap = h('span', null, '');
      E.cap = cap;
      el.appendChild(h('div', 'caption', cap, { 'data-testid': 'ending-caption' }));
      var skip = UI.btn(PP.t('ending.skip'), 'btn-skip', function () { E.finish(); }, 'small skip');
      skip.style.pointerEvents = 'auto';
      el.appendChild(skip);
      E.caption();
    },
    onKey: function (key) { if (key === 'enter') { E.next(); return true; } if (key === 'esc') { E.finish(); return true; } return false; },
    onHide: function () { E.cap = null; }
  });
})();
