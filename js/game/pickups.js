/* Pompom Parade - pickups: Buttons, Button Stacks, Buddy Hearts, Shield Bubbles, Frenzy Candy, Magnets */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, C = PP.cfg;
  var PK = PP.pickups = {};
  var pool = PK.pool = new U.Pool(C.MAX_PICKUPS, function () { return { type: 'button', x: 0, y: 0, vx: 0, vy: 0, t: 0, s: null, fly: false }; });
  var SPR = { button: 'k_button', stack: 'k_stack', heart: 'k_heart', shield: 'k_shield', frenzy: 'k_frenzy', magnet: 'k_magnet' };

  PK.clear = function () { pool.clear(); };
  PK.spawn = function (type, x, y, scatter) {
    var p = pool.spawn(); if (!p) return null;
    var rng = PP.G.rng;
    p.type = type; p.x = U.clamp(x, 40, 320); p.y = y; p.t = 0; p.fly = false; p.s = PP.spr[SPR[type]];
    if (scatter) { p.vx = rng.range(-60, 60); p.vy = rng.range(-90, -30); } else { p.vx = 0; p.vy = 0; }
    return p;
  };
  function collect(p) {
    var G = PP.G, SQ = PP.squad;
    switch (p.type) {
      case 'button': G.buttonsRun += 1; break;
      case 'stack': G.buttonsRun += 5; break;
      case 'heart': if (G.mode !== 'endless' || SQ.n < 1.5 * PP.bal.mid(G.L)) SQ.add(PP.bal.heartGain(Math.round(G.L))); else G.buttonsRun += 3; break;
      case 'shield': if (SQ.shields < Math.max(2, G.prof.upg.shield || 0)) SQ.shields++; break;
      case 'frenzy': SQ.frenzy = 5; break;
      case 'magnet': SQ.magnet = 8; break;
    }
    PP.fx.pickup(p.x, p.y, p.type === 'stack' ? 'button' : p.type);
  }
  PK.update = function (dt) {
    var G = PP.G, SQ = PP.squad, a = pool.items, i, p, dx, dy, d2, pr = SQ.PR, d;
    var can = SQ.n > 0 && G.state !== 'lost';
    for (i = pool.n - 1; i >= 0; i--) {
      p = a[i]; p.t += dt;
      dx = SQ.x - p.x; dy = G.sy - p.y; d2 = dx * dx + dy * dy;
      if (can && (p.fly || (SQ.magnet > 0 && d2 < 160 * 160) || d2 < (pr + 26) * (pr + 26))) {
        // fly to the squad (magnet trail)
        p.fly = true; d = Math.sqrt(d2) || 1;
        var v = 460 + p.t * 200;
        p.x += dx / d * v * dt; p.y += dy / d * v * dt;
        if ((G.tick & 3) === 0) PP.fx.trail(p.x, p.y);
        if (d < pr * 0.6 + 8) { collect(p); pool.killAt(i); continue; }
      } else {
        p.x += p.vx * dt; p.y += (p.vy + G.scroll) * dt;
        p.vx *= (1 - 3 * dt); p.vy *= (1 - 3 * dt);
        if (p.x < 40) p.x = 40; else if (p.x > 320) p.x = 320;
        if (can && d2 < pr * pr) { collect(p); pool.killAt(i); continue; }
      }
      if (p.y > G.H + 30) pool.killAt(i);
    }
  };
  PK.draw = function () {
    var R = PP.R, a = pool.items, i, p, b;
    for (i = 0; i < pool.n; i++) {
      p = a[i];
      if (p.type === 'button' || p.type === 'stack') R.draw(p.s, p.x, p.y);
      else { b = 1 + 0.1 * Math.sin(p.t * 6); R.drawX(p.s, p.x, p.y + Math.sin(p.t * 4) * 2, b * 1.15, b * 1.15, 0); }
    }
  };
})();
