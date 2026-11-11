/* Pompom Parade - juice: pops, sparkles, gate bursts, screen shake, vibration. Cosmetic only;
 * everything is a no-op in headless (balance / skip) mode and uses Math.random, never the game RNG. */
(function () {
  'use strict';
  var PP = window.PP, P = PP.particles, TAU = Math.PI * 2;
  var F = PP.fx = { shakeAmt: 0, shakeT: 0, reduced: false, vibOn: true, lastVib: 0, popCount: 0 };
  var spr = PP.spr;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  F.hit = function (x, y) {
    if (PP.headless) return;
    P.spawn(spr.pt_spark, x + rnd(-4, 4), y + rnd(-4, 4), rnd(-30, 30), rnd(-60, -10), 0, 0.18, 0.7, 0.2, rnd(0, 3), 0);
  };
  F.tink = function (x, y) {
    if (PP.headless) return;
    for (var i = 0; i < 2; i++) P.spawn(spr.pt_spark, x, y, rnd(-70, 70), rnd(-80, 20), 120, 0.25, 0.8, 0.2, rnd(0, 3), 6);
    PP.audio.sfx('tink');
  };
  /* Grumbly cheered up: squash ring, sparkles + stars, 1-in-4 POP! burst, smiling ghost floats home */
  F.pop = function (x, y, r, dotKey, elite) {
    if (PP.headless) return;
    var n = elite ? 10 : 6 + ((Math.random() * 3) | 0), i, a, v;
    var d = spr['pt_dot_' + (dotKey || 'v')];
    for (i = 0; i < n; i++) {
      a = rnd(0, TAU); v = rnd(60, 170);
      P.spawn(i % 3 === 0 ? spr.pt_star : (i % 3 === 1 ? spr.pt_spark : d), x, y, Math.cos(a) * v, Math.sin(a) * v - 30, 160, rnd(0.35, 0.6), 1, 0.2, rnd(0, 3), rnd(-8, 8));
    }
    P.spawn(spr.pt_ring, x, y, 0, 0, 0, 0.25, r / 34, r / 12, 0, 0);
    var g = P.spawn(spr.pt_ghost, x, y - 4, rnd(-12, 12), -70, -40, 1.0, 0.6, 1.25, 0, 0);
    if (g) g.drag = 0.6;
    if ((F.popCount++ & 3) === 0) P.sprite(spr.pt_pop, x + rnd(-6, 6), y - r - 4, 0.9, 0.5);
    PP.audio.sfx('pop');
  };
  F.breakBox = function (x, y, dotKey) {
    if (PP.headless) return;
    var d = spr['pt_dot_' + (dotKey || 'o')];
    for (var i = 0; i < 9; i++) { var a = rnd(0, TAU), v = rnd(70, 190); P.spawn(i % 2 ? d : spr.pt_spark, x, y, Math.cos(a) * v, Math.sin(a) * v - 40, 300, rnd(0.4, 0.7), 1.1, 0.3, rnd(0, 3), rnd(-9, 9)); }
    PP.audio.sfx('pop');
  };
  /* dizzy pompom tumbling away (never shown hurt) */
  F.lose = function (x, y, species) {
    if (PP.headless) return;
    var s = spr['pom_' + (species || 'bunny') + '_0'];
    var p = P.spawn(s, x, y, rnd(-150, 150), rnd(-260, -160), 620, 1.0, 1, 0.8, 0, rnd(-12, 12));
    if (p) p.fade = 1;
    P.spawn(spr.pt_dizzy, x, y - 14, rnd(-20, 20), -60, 0, 0.6, 1, 0.6, 0, 9);
    PP.audio.sfx('lost');
    F.vibrate(15, 250);
  };
  F.spring = function (x, y) {
    if (PP.headless) return;
    P.spawn(spr.pt_spark, x, y - 8, rnd(-40, 40), rnd(-90, -40), 100, 0.4, 0.9, 0.2, rnd(0, 3), 5);
  };
  /* gate burst: text is taken from PP.atlas.buf (len glyphs) */
  F.gate = function (x, y, good, len) {
    if (PP.headless) return;
    P.text(len, x, y - 46, 2, good ? 0 : 2, 1.25, 1.0);
    var i, a, v;
    for (i = 0; i < (good ? 12 : 5); i++) {
      a = rnd(0, TAU); v = rnd(80, 220);
      P.spawn(good ? (i % 2 ? spr.pt_star : spr.pt_spark) : spr.pt_dot_p, x, y, Math.cos(a) * v, Math.sin(a) * v - 60, 200, rnd(0.4, 0.7), 1.1, 0.2, rnd(0, 3), rnd(-8, 8));
    }
    P.spawn(spr.pt_ring, x, y, 0, 0, 0, 0.35, 0.8, 3.2, 0, 0);
    PP.audio.sfx(good ? 'gate_good' : 'gate_bad');
  };
  F.pickup = function (x, y, kind) {
    if (PP.headless) return;
    if (kind === 'button') { P.spawn(spr.pt_spark, x, y, rnd(-30, 30), -60, 0, 0.25, 0.8, 0.2, 0, 4); PP.audio.sfx('button'); return; }
    for (var i = 0; i < 8; i++) { var a = rnd(0, TAU), v = rnd(60, 160); P.spawn(kind === 'heart' ? spr.pt_heart : spr.pt_star, x, y, Math.cos(a) * v, Math.sin(a) * v, 80, 0.5, 1, 0.3, rnd(0, 3), 5); }
    P.spawn(spr.pt_ring, x, y, 0, 0, 0, 0.3, 0.6, 2.4, 0, 0);
    PP.audio.sfx(kind === 'shield' ? 'shield' : 'pickup');
  };
  F.trail = function (x, y) {
    if (PP.headless) return;
    P.spawn(spr.pt_dot_y, x, y, 0, 0, 0, 0.22, 0.7, 0.1, 0, 0);
  };
  F.shieldPop = function (x, y, r) {
    if (PP.headless) return;
    P.spawn(spr.pt_ring, x, y, 0, 0, 0, 0.35, r / 17, r / 7, 0, 0);
    for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; P.spawn(spr.pt_dot_c, x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * 120, Math.sin(a) * 120, 0, 0.35, 1, 0.2, 0, 0); }
    PP.audio.sfx('shield');
  };
  F.confetti = function (x, y, n, spread) {
    if (PP.headless) return;
    for (var i = 0; i < n; i++) {
      var a = rnd(0, TAU), v = rnd(80, spread || 320);
      var p = P.spawn(spr['pt_conf_' + (i % 5)], x, y, Math.cos(a) * v, Math.sin(a) * v - 120, 260, rnd(0.8, 1.6), 1.2, 0.8, rnd(0, 3), rnd(-12, 12));
      if (p) p.drag = 1.2;
    }
  };
  F.huff = function (x, y) {
    if (PP.headless) return;
    for (var i = 0; i < 10; i++) { var a = i / 10 * TAU; P.spawn(spr.pt_star, x, y, Math.cos(a) * 190, Math.sin(a) * 150, 0, 0.6, 1.4, 0.3, 0, 6); }
    P.spawn(spr.pt_ring, x, y, 0, 0, 0, 0.5, 1.5, 6, 0, 0);
    PP.audio.sfx('roar');
  };
  F.note = function (x, y) {
    if (PP.headless) return;
    P.spawn(spr.pt_note, x, y, rnd(-14, 14), -46, 0, 0.9, 0.8, 1.1, rnd(-0.3, 0.3), 0);
  };
  F.dust = function (x, y) {
    if (PP.headless) return;
    P.spawn(spr.pt_dot_w, x, y, rnd(-30, 30), rnd(-10, 20), 0, 0.3, 0.9, 0.2, 0, 0);
  };
  /* damage numbers (bosses, crates, jars only) - glyphs from PP.atlas.buf */
  F.dmg = function (x, y, n) {
    if (PP.headless) return;
    var len = PP.atlas.num(n, -1, -1);
    P.text(len, x + rnd(-10, 10), y, 0, 1, 1, 0.55);
  };

  F.shake = function (amt) {
    if (PP.headless || F.reduced) return;
    if (amt > F.shakeAmt) F.shakeAmt = amt;
    F.shakeT = 0.25;
  };
  F.vibrate = function (pattern, minGap) {
    if (PP.headless || !F.vibOn || !window.navigator || !navigator.vibrate) return;
    var now = Date.now();
    if (minGap && now - F.lastVib < minGap) return;
    F.lastVib = now;
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  };
  F.update = function (dt) {
    var R = PP.R;
    if (F.shakeT > 0) {
      F.shakeT -= dt;
      var k = F.shakeT > 0 ? F.shakeT / 0.25 : 0, a = F.shakeAmt * k;
      R.shx = (Math.random() * 2 - 1) * a; R.shy = (Math.random() * 2 - 1) * a;
      if (F.shakeT <= 0) { F.shakeAmt = 0; R.shx = R.shy = 0; }
    } else { R.shx = R.shy = 0; }
    P.update(dt);
  };
  F.reset = function () { F.shakeAmt = 0; F.shakeT = 0; PP.R.shx = PP.R.shy = 0; P.clear(); };
})();
