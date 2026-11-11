/* Pompom Parade - the squad: formation, steering, hitbox, health (= count), emitter firing model */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, C = PP.cfg, TAU = Math.PI * 2;
  var MAXV = C.MAX_VIS;
  var SQ = PP.squad = {
    x: 180, tx: 180, kv: 0, n: 3, nvis: 3, R: 14, VR: 18, PR: 30, invuln: 0, shields: 0, squashT: 0,
    fireAcc: 0, frenzy: 0, magnet: 0, runDmg: 1, runRate: 1, cardDmg: 1, cardRate: 1, pierce: 0, big: 0, lucky: 1,
    weapon: null, wlv: 1, inSyrup: false, onIce: false, moved: 0, bubbleCount: 0, flip: 1,
    powerMult: 1, rateMult: 1, magnetMult: 1, beamOn: false, beamTop: 0, beamW: 8, t: 0, botX: -1,
    slots: [], mem: [], emit: new Int8Array(MAXV), emitN: 0, drawOrder: new Int8Array(MAXV)
  };
  var SPECIES = ['bunny', 'chick', 'kitten', 'mouse'];

  /* hex lattice, 15 u spacing, 30 closest slots (slot 0 = Pip at the centre) */
  (function buildSlots() {
    var pts = [];
    for (var q = -4; q <= 4; q++) for (var r = -4; r <= 4; r++) {
      var x = 15 * (q + r / 2), y = 15 * r * 0.866;
      pts.push({ ox: x, oy: y, d: x * x + y * y * 1.02 + (y > 0 ? 0.5 : 0) });
    }
    pts.sort(function (a, b) { return a.d - b.d; });
    for (var i = 0; i < MAXV; i++) {
      SQ.slots.push(pts[i]);
      SQ.mem.push({ x: 180, y: 500, sp: i === 0 ? 'pip' : SPECIES[(i * 7 + 3) % 4], ph: (i * 2.399) % TAU, pop: 1, s0: null, s1: null });
    }
    var ord = [];
    for (i = 0; i < MAXV; i++) ord.push(i);
    ord.sort(function (a, b) { return SQ.slots[a].oy - SQ.slots[b].oy || a - b; });
    for (i = 0; i < MAXV; i++) SQ.drawOrder[i] = ord[i];
  })();

  function recalc() {
    var nv = SQ.n < MAXV ? SQ.n : MAXV;
    SQ.nvis = nv;
    var s = Math.sqrt(nv);
    SQ.VR = 10 + 4.5 * s;
    SQ.R = Math.min(36, 10 + 2.5 * s);
    SQ.PR = (SQ.VR + 12) * SQ.magnetMult;
    // emitters = front-most visible pompoms (drawOrder is sorted front to back)
    var E = SQ.weapon ? Math.min(SQ.n, SQ.weapon.ecap) : 0, k = 0;
    for (var i = 0; i < MAXV && k < E; i++) { var idx = SQ.drawOrder[i]; if (idx < nv) SQ.emit[k++] = idx; }
    SQ.emitN = k;
  }
  SQ.recalc = recalc;

  SQ.reset = function (o) {
    var G = PP.G, prof = o.prof;
    SQ.x = SQ.tx = 180; SQ.kv = 0; SQ.invuln = 0; SQ.squashT = 0; SQ.fireAcc = 0; SQ.frenzy = 0; SQ.magnet = 0;
    SQ.runDmg = 1; SQ.runRate = 1; SQ.cardDmg = 1; SQ.cardRate = 1; SQ.pierce = 0; SQ.big = 0; SQ.lucky = 1;
    SQ.inSyrup = false; SQ.onIce = false; SQ.moved = 0; SQ.bubbleCount = 0; SQ.t = 0; SQ.beamOn = false; SQ.botX = -1; SQ.hideN = 0;
    SQ.weapon = PP.data.weaponById[o.weapon] || PP.data.weapons[0];
    SQ.wlv = o.wlv || 1;
    SQ.powerMult = 1 + 0.06 * (prof.upg.power || 0);
    SQ.rateMult = 1 + 0.04 * (prof.upg.rate || 0);
    SQ.magnetMult = 1 + 0.25 * (prof.upg.magnet || 0);
    SQ.shields = prof.upg.shield || 0;
    SQ.n = o.squad;
    recalc();
    for (var i = 0; i < MAXV; i++) {
      var m = SQ.mem[i];
      m.x = SQ.x + SQ.slots[i].ox; m.y = G.sy + SQ.slots[i].oy; m.pop = 1;
      if (i > 0) m.sp = SPECIES[(Math.random() * 4) | 0];
      m.s0 = PP.spr['pom_' + m.sp + '_0']; m.s1 = PP.spr['pom_' + m.sp + '_1'];
    }
  };
  SQ.setWeapon = function (id, lv) {
    SQ.weapon = PP.data.weaponById[id] || SQ.weapon; SQ.wlv = lv || 1; SQ.fireAcc = 0; recalc();
    if (SQ.weapon.id !== 'beam') { SQ.beamOn = false; PP.audio.beam(false); }
  };

  SQ.setCount = function (n) {
    if (n > 999) n = 999; if (n < 0) n = 0;
    var before = SQ.nvis;
    SQ.n = n; recalc();
    var G = PP.G;
    if (n > G.squadPeak) G.squadPeak = n;
    for (var i = before; i < SQ.nvis; i++) {     // new pompoms spring out
      var m = SQ.mem[i]; m.pop = 0.2; m.x = SQ.x; m.y = G.sy - 18;
      PP.fx.spring(SQ.x + SQ.slots[i].ox, G.sy + SQ.slots[i].oy);
    }
  };
  SQ.add = function (k) { SQ.setCount(SQ.n + k); SQ.squashT = 0.18; };

  /* remove k pompoms. kind: 'enemy' | 'hazard' | 'shot' | 'boss'. Returns true if anything happened. */
  SQ.hurt = function (k, kind) {
    var G = PP.G;
    if (G.state !== 'run' && G.state !== 'boss' && G.state !== 'bossintro') return false;
    if (kind === 'hazard' && SQ.invuln > 0) return false;
    if (SQ.shields > 0) {
      SQ.shields--; PP.fx.shieldPop(SQ.x, G.sy, SQ.VR + 8);
      if (kind === 'hazard') SQ.invuln = 0.6;
      return true;
    }
    var before = SQ.n, n = before - k;
    if (n < 1 && G.god) n = 1;
    if (n < 0) n = 0;
    var lost = before - n;
    if (!PP.headless) {
      var shown = lost < 4 ? lost : 4;
      for (var i = 0; i < shown; i++) {
        var idx = SQ.nvis - 1 - i; if (idx < 1) idx = 1;
        PP.fx.lose(SQ.mem[idx].x, SQ.mem[idx].y, SQ.mem[idx].sp);
      }
      if (kind === 'hazard') PP.fx.shake(3);
      if (kind === 'boss') { PP.fx.shake(4); PP.fx.vibrate(40, 300); }
    }
    SQ.setCount(n); SQ.squashT = 0.18;
    if (kind === 'hazard') SQ.invuln = 0.6;
    G.lostTotal += lost;
    if (lost > 0) PP.events.emit('pompomLost', { n: lost, left: n, cause: kind });
    if (n === 0) PP.run.fail();
    return true;
  };

  /* per-projectile damage for the current weapon (GDD 3.2 firing model) */
  SQ.shotDamage = function () {
    var w = SQ.weapon, E = SQ.emitN || 1;
    return w.dmg * PP.data.weaponLvMult(SQ.wlv) * SQ.powerMult * SQ.runDmg * SQ.cardDmg * SQ.n / E;
  };
  SQ.fireRate = function () {
    var w = SQ.weapon;
    var r = w.rate * SQ.rateMult * SQ.runRate * SQ.cardRate * (SQ.frenzy > 0 ? 2 : 1);
    return r > w.rate * 3 ? w.rate * 3 : r;
  };
  /* expected total DPS (used by the bot and the balance report) */
  SQ.dps = function () {
    var w = SQ.weapon, perShot = w.id === 'shaker' ? 3 : 1;
    return SQ.shotDamage() * SQ.emitN * SQ.fireRate() * perShot;
  };

  function volley(scale) {
    var G = PP.G, w = SQ.weapon, lv = SQ.wlv, SH = PP.shots, rng = G.rng;
    var dmg = SQ.shotDamage() * scale, big = 1 + 0.35 * SQ.big;
    var i, m, ex, ey, s, sp = w.speed;
    for (i = 0; i < SQ.emitN; i++) {
      m = SQ.slots[SQ.emit[i]];
      ex = SQ.x + m.ox + (rng() * 8 - 4); ey = G.sy + m.oy - 10;
      switch (w.id) {
        case 'wand':
          s = SH.fire(0, ex, ey, 0, -sp, dmg, w.r * (lv >= 3 ? 1.25 : 1) * big);
          if (s) { s.pierce = SQ.pierce; s.flag = (lv >= 5 && (++SQ.bubbleCount % 5) === 0) ? 1 : 0; }
          break;
        case 'shaker': {
          var nway = lv >= 3 ? 5 : 3, d2 = lv >= 3 ? dmg * 0.7 : dmg;
          for (var k = 0; k < nway; k++) {
            var a = (k - (nway - 1) / 2) * 12 * Math.PI / 180;
            s = SH.fire(1, ex, ey, Math.sin(a) * sp, -Math.cos(a) * sp, d2, w.r * big);
            if (s) { s.pierce = (lv >= 5 ? 1 : 0) + SQ.pierce; s.rot = a; s.sub = (i + k) % 5; }
          }
          break;
        }
        case 'gumball': {
          var ga = lv >= 5 ? (SQ.flip = -SQ.flip) * 0.14 : 0;
          s = SH.fire(2, ex, ey, Math.sin(ga) * sp, -Math.cos(ga) * sp, dmg, w.r * big);
          if (s) { s.pierce = 2 + (lv >= 3 ? 1 : 0) + SQ.pierce; s.flag = lv >= 5 ? 1 : 0; }
          break;
        }
        case 'star':
          s = SH.fire(3, ex, ey, (rng() - 0.5) * 60, -sp, dmg, w.r * big);
          if (s) { s.pierce = SQ.pierce; s.flag = lv >= 5 ? 1 : 0; s.turn = 6 * (lv >= 3 ? 1.5 : 1); s.tt = 0; }
          break;
        case 'cookie': {
          var cn = lv >= 5 ? 2 : 1;
          for (var c = 0; c < cn; c++) {
            s = SH.fire(4, ex + (cn > 1 ? (c ? 9 : -9) : 0), ey, cn > 1 ? (c ? 34 : -34) : 0, -sp, cn > 1 ? dmg * 0.6 : dmg, w.r * big);
            if (s) { s.pierce = 99; s.range = w.range * (lv >= 3 ? 1.25 : 1); s.y0 = ey; s.leg = 0; }
          }
          break;
        }
        case 'confetti':
          s = SH.fire(5, ex, ey, 0, -sp, dmg, w.r * big);
          if (s) { s.pierce = SQ.pierce; s.flag = lv >= 5 ? 1 : 0; s.range = (lv >= 3 ? 46 : w.splashR) * big; }
          break;
      }
    }
    PP.audio.sfx('shot_' + w.id);
  }

  SQ.update = function (dt) {
    var G = PP.G, I = PP.input;
    SQ.t += dt;
    // --- steering ---
    var px = SQ.x;
    if (G.autoplay || G.mode === 'demo') {
      if (SQ.botX >= 0) SQ.tx = U.approach(SQ.tx, SQ.botX, 620 * dt);
      I.dx = 0;
    } else {
      var sens = G.sens || 1;
      SQ.tx += I.takeDx() * sens;
      var want = (I.right ? 300 : 0) - (I.left ? 300 : 0);
      SQ.kv = U.approach(SQ.kv, want, 2400 * dt);
      SQ.tx += SQ.kv * dt;
    }
    SQ.tx = U.clamp(SQ.tx, C.MINX, C.MAXX);
    var maxv = 900 * (SQ.inSyrup ? 0.45 : 1);
    if (SQ.onIce) {
      var step = (SQ.tx - SQ.x) * (1 - Math.exp(-4.8 * dt));
      SQ.x += U.clamp(step, -maxv * dt, maxv * dt);
    } else SQ.x = U.approach(SQ.x, SQ.tx, maxv * dt);
    if (SQ.inSyrup && !G.autoplay) SQ.tx = U.clamp(SQ.tx, SQ.x - 60, SQ.x + 60); // no huge "debt" while slowed
    SQ.x = U.clamp(SQ.x, C.MINX, C.MAXX);
    SQ.moved += Math.abs(SQ.x - px);

    if (SQ.invuln > 0) SQ.invuln -= dt;
    if (SQ.frenzy > 0) SQ.frenzy -= dt;
    if (SQ.magnet > 0) SQ.magnet -= dt;
    if (SQ.squashT > 0) SQ.squashT -= dt;

    // --- firing ---
    var canFire = (G.state === 'run' || G.state === 'boss') && SQ.n > 0 && !G.hold;
    if (canFire) {
      var rate = SQ.fireRate(), w = SQ.weapon, vr = rate < w.maxVolley ? rate : w.maxVolley;
      SQ.fireAcc += dt * vr;
      var guard = 0;
      while (SQ.fireAcc >= 1 && guard++ < 4) {
        SQ.fireAcc -= 1;
        if (w.id === 'beam') PP.shots.beamTick(SQ.shotDamage() * rate / vr); else volley(rate / vr);
      }
      if (w.id === 'beam') { if (!SQ.beamOn) { SQ.beamOn = true; PP.audio.beam(true); } }
    } else if (SQ.beamOn) { SQ.beamOn = false; PP.audio.beam(false); }

    // --- formation follow (visual only) ---
    var k = 12 * dt; if (k > 1) k = 1;
    for (var i = 0; i < SQ.nvis; i++) {
      var m = SQ.mem[i], sl = SQ.slots[i];
      m.x += (SQ.x + sl.ox - m.x) * k; m.y += (G.sy + sl.oy - m.y) * k;
      if (m.pop < 1) { m.pop += dt * 5; if (m.pop > 1) m.pop = 1; }
    }
  };

  SQ.draw = function () {
    var G = PP.G, R = PP.R, spr = PP.spr, t = SQ.t, i, m, idx;
    if (SQ.n <= 0) return;
    var blink = SQ.invuln > 0 && ((t * 16) | 0) % 2 === 0;
    if (blink) R.ctx.globalAlpha = 0.5;
    var sqx = 1, sqy = 1;
    if (SQ.squashT > 0) { var q = SQ.squashT / 0.18; sqx = 1 + 0.15 * q; sqy = 1 - 0.15 * q; }
    var pipDrawn = false;
    for (i = 0; i < MAXV; i++) {
      idx = SQ.drawOrder[i];
      if (idx >= SQ.nvis - SQ.hideN) continue;
      m = SQ.mem[idx];
      var b = Math.sin(t * 4 * TAU + m.ph), frame = b > 0 ? 0 : 1;
      var s = frame ? m.s1 : m.s0;
      var sc = m.pop < 1 ? U.easeOutBack(m.pop) : 1;
      var bx = SQ.x + (m.x - SQ.x) * sqx, by = G.sy + (m.y - G.sy) * sqy + (b > 0 ? -b * 1.6 : 0);
      if (sc !== 1 || sqx !== 1) R.drawX(s, bx, by, sc * (2 - sqy), sc * sqy, 0); else R.draw(s, bx, by);
      if (idx === 0) pipDrawn = true;
    }
    if (blink) R.ctx.globalAlpha = 1;
    if (SQ.shields > 0) {
      var rr = (SQ.VR + 10) / 46 * (1 + 0.03 * Math.sin(t * 5));
      R.drawX(spr.h_shield, SQ.x, G.sy, rr, rr, 0);
      if (SQ.shields > 1) { R.ctx.globalAlpha = 0.5; R.drawX(spr.h_shield, SQ.x, G.sy, rr * 1.12, rr * 1.12, 0); R.ctx.globalAlpha = 1; }
    }
    return pipDrawn;
  };
})();
