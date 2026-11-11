/* Pompom Parade - the 5 bosses (GDD 3.9). Telegraphs >= 0.6 s, phases with 1.5 s invulnerability. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var BS = PP.boss = {
    on: false, type: 0, x: 180, y: -100, hp: 0, maxHp: 1, phase: 1, t: 0, inv: 0, st: '', rx: 55, ry: 45, flash: 0, rot: 0,
    tA: 0, tB: 0, tC: 0, fanT: 0, vx: 140, vy: 0, squash: 0, dmgAcc: 0, dmgT: 0, mini: false, L: 1, hitCd: 0, sp: 1, lane: 0, dying: 0,
    rip: [{ on: false, st: 0, t: 0, y: 0, gapX: 180, gapW: 120, hit: false }, { on: false, st: 0, t: 0, y: 0, gapX: 180, gapW: 120, hit: false }],
    snow: { st: 0, t: 0, l0: 0, l1: 1, tick: 0 },
    clone: { on: false, st: 0, t: 0, x: 0, y: 0, hit: false },
    orbs: [null, null, null, null], orbUid: [0, 0, 0, 0], orbT: 0, orbsUp: false, orbA: 0
  };
  var SIZE = [null, [58, 46], [54, 52], [46, 46], [72, 40], [54, 56]];
  var SPR = [null, 'b_wobble', 'b_snail', 'b_donut', 'b_puff', 'b_queen'];
  BS.names = [null, 'wobble', 'shellwhirl', 'donut', 'thunderpuff', 'queen'];

  BS.clear = function () {
    BS.on = false; BS.dying = 0; BS.rip[0].on = BS.rip[1].on = false; BS.snow.st = 0; BS.clone.on = false;
    for (var i = 0; i < 4; i++) BS.orbs[i] = null;
    BS.orbsUp = false;
  };
  BS.start = function (type, hp, mini) {
    var G = PP.G;
    BS.clear();
    BS.on = true; BS.type = type; BS.hp = BS.maxHp = hp; BS.phase = 1; BS.t = 0; BS.inv = 0; BS.st = 'enter'; BS.flash = 0; BS.rot = 0;
    BS.x = 180; BS.y = -90; BS.rx = SIZE[type][0]; BS.ry = SIZE[type][1]; BS.mini = !!mini; BS.L = Math.min(40, Math.round(G.L));
    BS.tA = 0; BS.tB = 0; BS.tC = 0; BS.fanT = 0; BS.vx = 140; BS.squash = 0; BS.dmgAcc = 0; BS.dmgT = 0; BS.hitCd = 0;
    BS.sp = type === 5 ? 1.25 : 1; BS.orbT = 0; BS.orbA = 0;
    PP.events.emit('bossStart', { type: type, name: BS.names[type], hp: hp, mini: !!mini });
  };
  BS.targetable = function () { return BS.on && BS.y > 30 && BS.y < PP.G.sy - 80; };
  BS.hitTest = function (x, y, r) {
    if (!BS.on || BS.y < 30 || BS.dying > 0) return false;
    var dx = (x - BS.x) / (BS.rx + r), dy = (y - BS.y) / (BS.ry + r);
    return dx * dx + dy * dy < 1;
  };
  function cost(f) { return PP.bal.bossCost(f, BS.L); }

  function phaseFor() {
    var f = BS.hp / BS.maxHp, t = BS.type;
    if (t === 1 || t === 2) return f < 0.5 ? 2 : 1;
    if (t === 3) return f < 0.4 ? 2 : 1;
    if (t === 4) return f < 0.25 ? 4 : (f < 0.5 ? 3 : (f < 0.75 ? 2 : 1));
    return f < 0.33 ? 3 : (f < 0.66 ? 2 : 1);
  }
  function clearAttacks() {
    PP.eshots.clear(); PP.enemies.removeShots();
    BS.rip[0].on = BS.rip[1].on = false; BS.snow.st = 0;
    for (var i = 0; i < PP.obst.tele.length; i++) PP.obst.tele[i].on = false;
  }
  function popOrbs() {
    for (var i = 0; i < 4; i++) { var o = BS.orbs[i]; if (o && o.uid === BS.orbUid[i] && !o.dead) PP.enemies.pop(o, false); BS.orbs[i] = null; }
    BS.orbsUp = false;
  }
  function onPhase(p) {
    BS.phase = p; BS.inv = 1.5; clearAttacks();
    PP.fx.huff(BS.x, BS.y);
    BS.tA = 0; BS.tB = 0; BS.tC = 0; BS.squash = 0;
    if (BS.type === 4) {
      var c1 = PP.enemies.spawn('cloud', 62, BS.y + 10, false, 1), c2 = PP.enemies.spawn('cloud', 298, BS.y + 10, false, 1);
      if (c1) c1.hp = c1.maxHp = c1.hp * 0.6; if (c2) c2.hp = c2.maxHp = c2.hp * 0.6;
    }
    if (BS.type === 5 && p === 3) popOrbs();
    if (BS.type === 3 && (BS.st === 'warn')) BS.st = 'roam';
    PP.events.emit('bossPhase', { type: BS.type, phase: p });
  }

  BS.damage = function (dmg, x, y) {
    if (!BS.on || BS.dying > 0) return;
    if (BS.inv > 0 || BS.st === 'enter') { return; }
    if (BS.type === 2 && BS.st === 'spin') { dmg *= 0.1; if ((PP.G.tick & 7) === 0) PP.fx.tink(x, y); }
    BS.hp -= dmg; BS.flash = 0.06; BS.dmgAcc += dmg;
    if (BS.hp <= 0) {
      BS.hp = 0; BS.dying = 0.01; clearAttacks(); popOrbs();
      PP.run.bossDefeated();
      return;
    }
    var p = phaseFor();
    if (p !== BS.phase) onPhase(p);
  };

  /* ---------- attacks ---------- */
  function slam(n) {
    var EN = PP.enemies;
    for (var i = 0; i < n; i++) EN.spawn('minijelly', U.clamp(BS.x + (i - (n - 1) / 2) * 62, 48, 312), BS.y + 30, false, 1);
    PP.fx.shake(6); PP.audio.sfx('slam');
  }
  function ripple(gapW) {
    var r = BS.rip[0].on ? BS.rip[1] : BS.rip[0];
    if (r.on) return;
    r.on = true; r.st = 0; r.t = 1.0; r.y = BS.y + BS.ry; r.gapW = gapW; r.hit = false;
    r.gapX = U.clamp(PP.G.rng.range(80, 280), 30 + gapW / 2, 330 - gapW / 2);
  }
  function fan(n, arcDeg, speed, f, aimed, offDeg) {
    var G = PP.G, SQ = PP.squad, base = 0;
    if (aimed) base = Math.atan2(SQ.x - BS.x, G.sy - BS.y);
    var c = cost(f), step = n > 1 ? arcDeg / (n - 1) : 0;
    for (var i = 0; i < n; i++) {
      var a = base + ((i - (n - 1) / 2) * step + (offDeg || 0)) * Math.PI / 180;
      PP.eshots.fire(BS.x, BS.y + BS.ry * 0.6, Math.sin(a) * speed, Math.cos(a) * speed, c, 6);
    }
    PP.audio.sfx('roar');
  }
  function startSnow() {
    var G = PP.G, sn = BS.snow, sl = U.laneOf(PP.squad.x), a, b, ok, tries = 0;
    do {
      a = G.rng.int(0, 3); b = G.rng.int(0, 3); if (b === a) b = (a + 1 + G.rng.int(0, 2)) % 4;
      ok = false;
      for (var d = -1; d <= 1; d++) { var l = sl + d; if (l >= 0 && l <= 3 && l !== a && l !== b) ok = true; }
    } while (!ok && ++tries < 20);
    sn.st = 1; sn.t = 1.2; sn.l0 = a; sn.l1 = b; sn.tick = 0;
    PP.obst.telegraph(30 + a * 75, 75, 1.2, 1); PP.obst.telegraph(30 + b * 75, 75, 1.2, 1);
    PP.audio.sfx('warn');
  }
  function updSnow(dt) {
    var sn = BS.snow, SQ = PP.squad;
    if (sn.st === 0) return;
    sn.t -= dt;
    if (sn.st === 1) {
      if (sn.t <= 0) { sn.st = 2; sn.t = 1.5; sn.tick = 0; PP.obst.telegraph(30 + sn.l0 * 75, 75, 1.5, 2); PP.obst.telegraph(30 + sn.l1 * 75, 75, 1.5, 2); }
    } else {
      sn.tick -= dt;
      if (sn.tick <= 0) { sn.tick = 0.25; var l = U.laneOf(SQ.x); if (l === sn.l0 || l === sn.l1) SQ.hurt(cost(0.03), 'boss'); }
      if (sn.t <= 0) sn.st = 0;
    }
  }
  function hail() {
    var G = PP.G, SQ = PP.squad, EN = PP.enemies, base = Math.atan2(SQ.x - BS.x, G.sy - BS.y);
    for (var i = -1; i <= 1; i++) {
      var a = base + i * 0.26, e = EN.spawn('snowball', BS.x + i * 26, BS.y + BS.ry, false, 1);
      if (e) { e.vx = Math.sin(a) * 180; e.vy = Math.cos(a) * 180; e.bump = cost(0.08); }
    }
    PP.audio.sfx('roar');
  }
  function updRipples(dt) {
    var G = PP.G, SQ = PP.squad;
    for (var i = 0; i < 2; i++) {
      var r = BS.rip[i];
      if (!r.on) continue;
      if (r.st === 0) { r.t -= dt; r.y = BS.y + BS.ry; if (r.t <= 0) { r.st = 1; PP.audio.sfx('slam'); } }
      else {
        r.y += 150 * dt;
        if (!r.hit && Math.abs(r.y - G.sy) < 12 + SQ.R * 0.6 && Math.abs(SQ.x - r.gapX) > r.gapW / 2 - SQ.R * 0.5) { r.hit = true; SQ.hurt(cost(0.25), 'boss'); }
        if (r.y > G.H + 20) r.on = false;
      }
    }
  }
  function updOrbs(dt) {
    var EN = PP.enemies, i, o, alive = 0;
    BS.orbA += dt * TAU * 0.5;
    for (i = 0; i < 4; i++) {
      o = BS.orbs[i];
      if (o && (o.uid !== BS.orbUid[i] || o.dead)) { BS.orbs[i] = o = null; }
      if (o) { alive++; var a = BS.orbA + i * TAU / 4; o.x = BS.x + Math.cos(a) * 80; o.y = BS.y + Math.sin(a) * 80 * 0.75 + 10; }
    }
    if (alive === 0) {
      if (BS.orbsUp) { BS.orbsUp = false; BS.orbT = 10; }
      BS.orbT -= dt;
      if (BS.orbT <= 0) {
        for (i = 0; i < 4; i++) {
          o = EN.spawn('orb', BS.x, BS.y, false, 1);
          if (o) { o.hp = o.maxHp = BS.maxHp * 0.04; BS.orbs[i] = o; BS.orbUid[i] = o.uid; }
        }
        BS.orbsUp = true;
      }
    }
  }

  BS.update = function (dt) {
    if (!BS.on) return;
    var G = PP.G, SQ = PP.squad, sp = BS.sp, p2 = BS.phase >= 2, ds = dt * sp;
    BS.t += dt;
    if (BS.flash > 0) BS.flash -= dt;
    if (BS.hitCd > 0) BS.hitCd -= dt;
    if (BS.dmgAcc > 0) { BS.dmgT -= dt; if (BS.dmgT <= 0) { PP.fx.dmg(BS.x, BS.y - BS.ry - 6, BS.dmgAcc); BS.dmgAcc = 0; BS.dmgT = 0.2; } }
    if (BS.dying > 0) { BS.dying += dt; return; }
    if (BS.st === 'enter') {
      BS.y += 150 * dt;
      if (BS.y >= 130) { BS.y = 130; BS.st = BS.type === 2 ? 'open' : 'roam'; PP.audio.sfx('roar'); }
      return;
    }
    updRipples(dt); updSnow(dt);
    if (BS.inv > 0) { BS.inv -= dt; return; }
    var t = BS.type;
    if (t === 1) {
      BS.x = 180 + 100 * Math.sin(TAU * BS.t / 5);
      var per = p2 ? 3 : 4;
      BS.tA += dt; BS.squash = BS.tA >= per - 0.6 ? (BS.tA - (per - 0.6)) / 0.6 : 0;
      if (BS.tA >= per) { BS.tA = 0; BS.squash = 0; slam(p2 ? 4 : 3); }
      BS.tB += dt;
      if (BS.tB >= 7) { BS.tB = -1; ripple(p2 ? 100 : 120); }
    } else if (t === 2) {
      BS.x = 180 + 60 * Math.sin(BS.t * 0.5);
      BS.tA += dt;
      if (BS.st === 'open') {
        BS.squash = BS.tA >= (p2 ? 3 : 4) - 0.6 ? 1 : 0;
        if (BS.tA >= (p2 ? 3 : 4)) {
          BS.st = 'spin'; BS.tA = 0; BS.fanT = 0.45; BS.tC = 0; BS.squash = 0;
          PP.obst.spawn('syrup', U.laneX(G.rng.int(0, 1)), BS.y + 50, { vy: 55 });
          PP.obst.spawn('syrup', U.laneX(G.rng.int(2, 3)), BS.y + 80, { vy: 55 });
        }
      } else {
        BS.rot += 14 * dt; BS.fanT -= dt;
        if (BS.fanT <= 0) { BS.fanT = 1.0; fan(p2 ? 7 : 5, p2 ? 132 : 120, 170, 0.05, false, (BS.tC++ % 2) ? (p2 ? 11 : 15) : 0); }
        if (BS.tA >= (p2 ? 2.5 : 2)) { BS.st = 'open'; BS.tA = 0; BS.rot = 0; }
      }
    } else if (t === 3) {
      if (BS.st === 'roam') {
        BS.x += BS.vx * dt; BS.rot += BS.vx / 48 * dt; BS.y = 130;
        if (BS.x > 282) { BS.x = 282; BS.vx = -140; } else if (BS.x < 78) { BS.x = 78; BS.vx = 140; }
        BS.tA += dt; if (BS.tA >= 3) { BS.tA = 0; fan(7, 70, 210, 0.04, true, 0); }
        BS.tB += dt;
        if (BS.tB >= 9) {
          BS.tB = 0; BS.st = 'warn'; BS.tC = 1.0; BS.lane = U.laneOf(SQ.x); BS.hitCd = 0;
          PP.obst.telegraph(30 + BS.lane * 75, 75, 1.0, 0); PP.audio.sfx('warn');
          if (p2) {
            var l2 = BS.lane + (G.rng() < 0.5 ? 1 : -1); if (l2 < 0) l2 = 1; if (l2 > 3) l2 = 2;
            var c = BS.clone; c.on = true; c.st = 0; c.t = 0.5; c.x = U.laneX(l2); c.y = -70; c.hit = false;
          }
        }
      } else if (BS.st === 'warn') {
        BS.x = U.approach(BS.x, U.laneX(BS.lane), 420 * dt); BS.rot += 10 * dt; BS.tC -= dt;
        if (BS.tC <= 0) { BS.st = 'roll'; BS.x = U.laneX(BS.lane); PP.audio.sfx('slam'); }
      } else if (BS.st === 'roll') {
        BS.y += 520 * dt; BS.rot += 520 / 48 * dt;
        if (BS.y > G.H + 70) { BS.st = 'away'; BS.tC = 1.2; }
      } else if (BS.st === 'away') {
        BS.tC -= dt; if (BS.tC <= 0) { BS.st = 'return'; BS.y = -70; }
      } else if (BS.st === 'return') {
        BS.y += 300 * dt; if (BS.y >= 130) { BS.y = 130; BS.st = 'roam'; BS.tA = 1.5; }
      }
      if (BS.st === 'roll' && BS.hitCd <= 0) {
        var dx = BS.x - SQ.x, dy = BS.y - G.sy, rr = 42 + SQ.R * 0.8;
        if (dx * dx + dy * dy < rr * rr) { BS.hitCd = 1.5; SQ.hurt(cost(0.30), 'boss'); }
      }
      var cl = BS.clone;
      if (cl.on) {
        if (cl.st === 0) { cl.t -= dt; if (cl.t <= 0) { cl.st = 1; cl.t = 1.0; PP.obst.telegraph(cl.x - 37.5, 75, 1.0, 0); } }
        else if (cl.st === 1) { cl.t -= dt; if (cl.t <= 0) cl.st = 2; }
        else {
          cl.y += 520 * dt;
          var dx2 = cl.x - SQ.x, dy2 = cl.y - G.sy, r2 = 30 + SQ.R * 0.8;
          if (!cl.hit && dx2 * dx2 + dy2 * dy2 < r2 * r2) { cl.hit = true; SQ.hurt(cost(0.30), 'boss'); }
          if (cl.y > G.H + 60) cl.on = false;
        }
      }
    } else if (t === 4) {
      BS.x = 180 + 60 * Math.sin(BS.t * 0.6);
      BS.tA += dt; if (BS.tA >= 5) { BS.tA = 0; startSnow(); }
      BS.tB += dt; BS.squash = BS.tB >= 5.4 ? (BS.tB - 5.4) / 0.6 : 0;
      if (BS.tB >= 6) { BS.tB = 0; BS.squash = 0; hail(); }
    } else if (t === 5) {
      BS.x = 180 + 70 * Math.sin(BS.t * 0.5);
      if (BS.phase === 1) {
        var per5 = 4;
        BS.tA += ds; BS.squash = BS.tA >= per5 - 0.75 ? (BS.tA - (per5 - 0.75)) / 0.75 : 0;
        if (BS.tA >= per5) { BS.tA = 0; BS.squash = 0; slam(5); }
        BS.tB += ds; if (BS.tB >= 7) { BS.tB = -1; ripple(110); }
      } else if (BS.phase === 2) {
        updOrbs(dt);
        BS.tA += ds; BS.squash = BS.tA >= 3 - 0.75 ? (BS.tA - 2.25) / 0.75 : 0;
        if (BS.tA >= 3) { BS.tA = 0; BS.squash = 0; fan(9, 84, 210, 0.04, true, 0); }
      } else {
        BS.tA += ds; if (BS.tA >= 5) { BS.tA = 0; startSnow(); }
        BS.tB += ds;
        if (BS.tB >= 4) {
          BS.tB = 0;
          var d = PP.enemies.spawn('dasher', U.laneX(U.laneOf(SQ.x)), 170, false, 1);
          if (d) { d.st = 1; d.tm = 0.9; PP.obst.telegraph(d.x - d.r - 8, d.r * 2 + 16, 0.9, 0); PP.audio.sfx('warn'); }
        }
      }
    }
  };

  function drawSpan(s, x0, x1, y) {
    var ctx = PP.R.ctx, c = s.c, k = c.width / 60;
    for (var x = x0; x < x1; x += 60) {
      var w = x1 - x < 60 ? x1 - x : 60;
      ctx.drawImage(c, 0, 0, w * k, c.height, x, y - 14, w, 28); PP.R.draws++;
    }
  }
  BS.draw = function () {
    if (!BS.on) return;
    var R = PP.R, spr = PP.spr, ctx = R.ctx, i, G = PP.G;
    // ripples
    for (i = 0; i < 2; i++) {
      var r = BS.rip[i];
      if (!r.on) continue;
      if (r.st === 0) ctx.globalAlpha = 0.35 + 0.3 * Math.sin(BS.t * 20);
      drawSpan(spr.z_ripple, 30, r.gapX - r.gapW / 2, r.y); drawSpan(spr.z_ripple, r.gapX + r.gapW / 2, 330, r.y);
      ctx.globalAlpha = 1;
      var tw = 0.7 + 0.4 * Math.sin(BS.t * 9);
      R.drawX(spr.h_spark, r.gapX - r.gapW / 4, r.y, tw, tw, BS.t * 2); R.drawX(spr.h_spark, r.gapX + r.gapW / 4, r.y, 1.6 - tw, 1.6 - tw, -BS.t * 2);
      if (r.st === 0) { var yy = G.sy - 60; R.drawX(spr.h_spark, r.gapX, yy, 1.4 * tw, 1.4 * tw, BS.t * 3); }
    }
    var cl = BS.clone;
    if (cl.on && cl.st === 2) R.drawX(spr.b_donut, cl.x, cl.y, 0.66, 0.66, BS.t * 11);
    if (BS.st === 'away') return;
    var name = SPR[BS.type], sx = 1, sy = 1, rot = 0, x = BS.x, y = BS.y;
    if (BS.type === 2 && BS.st === 'spin') { name = 'b_snail_spin'; rot = BS.rot; y -= 10; }
    else if (BS.type === 3) rot = BS.rot;
    else { var w = 0.035 * Math.sin(BS.t * 4); sx = 1 + w; sy = 1 - w; }
    if (BS.squash > 0) { sx *= 1 + 0.2 * BS.squash; sy *= 1 - 0.22 * BS.squash; }
    if (BS.mini) { sx *= 0.8; sy *= 0.8; }
    if (BS.dying > 0) { var k = 1 + BS.dying * 0.6; sx *= k; sy *= 2 - k > 0.2 ? 2 - k : 0.2; ctx.globalAlpha = Math.max(0, 1 - BS.dying * 1.6); }
    var s = BS.flash > 0 ? spr[name + '_f'] : spr[name];
    if (BS.inv > 0 && ((BS.t * 14) | 0) % 2 === 0) ctx.globalAlpha = 0.6;
    R.drawX(s, x, y + Math.sin(BS.t * 2.2) * 3, sx, sy, rot);
    ctx.globalAlpha = 1;
    if (BS.inv > 0) for (i = 0; i < 5; i++) { var a = BS.t * 3 + i * TAU / 5; R.drawX(spr.pt_star, BS.x + Math.cos(a) * (BS.rx + 14), BS.y + Math.sin(a) * (BS.ry + 10), 1.3, 1.3, a); }
  };
})();
