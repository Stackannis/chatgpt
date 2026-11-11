/* Pompom Parade - Grumblies + every other shootable target (crates, jars, gift boxes, raindrops, orbs).
 * Nothing is ever hurt: a bopped Grumbly goes POP, sparkles and floats home smiling. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, C = PP.cfg, TAU = Math.PI * 2;
  var E = PP.data.enemies;
  var EN = PP.enemies = { uid: 1 };
  var CAP = 96;
  var pool = EN.pool = new U.Pool(CAP, function () {
    return { def: null, x: 0, y: 0, r: 10, hp: 1, maxHp: 1, shell: 0, maxShell: 0, bump: 1, elite: false, flash: 0, t: 0, st: 0, tm: 0, tm2: 0,
      bx: 0, vx: 0, vy: 0, uid: 0, dead: 0, kb: 0, own: 0, dmgAcc: 0, dmgT: 0, gift: null, sc: 1, hopFrom: 0, hopTo: 0, dark: false,
      sprN: null, sprF: null, sprD: null, ph: 0 };
  });
  var FXK = { jelly: 'v', dust: 'w', bean: 'g', twin: 'c', mini: 'c', cloud: 'v', snail: 'p', dasher: 'o', minijelly: 'v', drop: 'm', snowball: 'm', orb: 'p', crate: 'o', gift: 'p', jar: 'c' };

  EN.clear = function () { pool.clear(); EN.uid = 1; };   // uid feeds the zigzag phase: reset for determinism
  EN.grumblies = function () { var n = 0; for (var i = 0; i < pool.n; i++) if (pool.items[i].def.grumbly) n++; return n; };

  /* spawn(id, x, y, elite, ramp). ramp undefined => time-based ramp of the level */
  EN.spawn = function (id, x, y, elite, ramp) {
    var G = PP.G, def = E[id];
    if (!def) return null;
    if (def.grumbly && pool.n >= C.MAX_ENEMIES) return null;
    var e = pool.spawn(); if (!e) return null;
    var rmp = ramp === undefined ? PP.bal.ramp(G.tl, G.len) : ramp;
    var hp = def.fixedHp ? def.hp : def.hp * G.hpMult * (def.noRamp ? 1 : rmp);
    var shell = def.shell ? def.shell * G.hpMult * rmp : 0;
    e.def = def; e.x = x; e.y = y; e.r = def.r; e.bump = def.bump; e.own = def.speed; e.elite = !!elite; e.sc = def.scale || 1;
    if (elite) { hp *= 3; shell *= 3; e.own *= 0.9; e.bump *= 2; e.r *= 1.4; e.sc *= 1.4; }
    e.hp = e.maxHp = hp; e.shell = e.maxShell = shell;
    e.flash = -1; e.t = 0; e.st = 0; e.tm = 0; e.tm2 = 0; e.bx = x; e.vx = 0; e.vy = 0; e.dead = 0; e.kb = 0; e.dmgAcc = 0; e.dmgT = 0; e.gift = null;
    e.dark = false; e.uid = EN.uid++; e.ph = (e.uid * 1.7) % TAU;
    e.sprN = PP.spr[def.spr]; e.sprF = PP.spr[def.spr + '_f'] || e.sprN; e.sprD = id === 'cloud' ? PP.spr.e_cloud_d : null;
    return e;
  };

  EN.damage = function (e, dmg, shellMult) {
    if (e.dead) return;
    if (e.flash < -0.12) e.flash = 0.06;      // 60 ms white flash, at most ~5 per second
    if (e.shell > 0) {
      e.shell -= dmg * (shellMult || 1);
      if (e.shell <= 0) {
        e.shell = 0; e.sprN = PP.spr.e_snail_n; e.sprF = PP.spr.e_snail_n_f;
        PP.fx.breakBox(e.x, e.y - 6, 'p');
      } else if ((PP.G.tick & 3) === 0) PP.fx.tink(e.x, e.y - 6);
      return;
    }
    e.hp -= dmg;
    if (e.def.dmgNum) e.dmgAcc += dmg;
    if (e.hp <= 0) EN.pop(e, true);
  };

  /* byShot: popped by the squad's shots (rewards) vs. bumped into / cleared */
  EN.pop = function (e, byShot) {
    if (e.dead) return;
    e.dead = 1;
    var G = PP.G, def = e.def, PK = PP.pickups, rng = G.rng, i;
    if (byShot) {
      if (def.grumbly) { G.popped++; G.meter += e.maxHp + e.maxShell; }
      if (e.elite) PK.spawn('stack', e.x, e.y, true);
      else if (def.drop[0] > 0 && (def.drop[0] >= 1 || rng() < def.drop[0])) {
        var n = def.drop[1];
        if (n >= 10) { PK.spawn('stack', e.x - 10, e.y, true); PK.spawn('stack', e.x + 10, e.y, true); }
        else for (i = 0; i < n; i++) PK.spawn('button', e.x, e.y, true);
      }
      if (def.id === 'crate' && rng() < 0.2) {
        var opts = G.L >= 11 ? ['heart', 'shield', 'frenzy', 'magnet'] : (G.L >= 8 ? ['heart', 'shield', 'frenzy'] : (G.L >= 7 ? ['heart', 'shield'] : ['heart']));
        if (G.L >= 3) PK.spawn(rng.pick(opts), e.x, e.y, true);
      }
      if (def.id === 'gift' && e.gift) {
        var prof = G.prof, own = prof.weapons[e.gift];
        PP.squad.setWeapon(e.gift, own && own.own ? own.lv : 1);
        G.giftWeapon = e.gift;
        PP.fx.pickup(e.x, e.y, 'gift');
        PP.events.emit('giftOpened', { weapon: e.gift });
      }
    }
    if (def.split && byShot) {
      for (i = -1; i <= 1; i += 2) {
        var m = EN.spawn('mini', e.x + i * 6, e.y, false);
        if (m) { m.bx = U.clamp(e.x + i * 30, 40, 320); m.vx = 1; }
      }
    }
    if (def.obstacle) PP.fx.breakBox(e.x, e.y, FXK[def.id]); else PP.fx.pop(e.x, e.y, e.r, FXK[def.id], e.elite);
  };

  /* pop everything (boss defeated / finish line): Grumblies cheer up */
  EN.popAll = function () {
    for (var i = 0; i < pool.n; i++) { var e = pool.items[i]; if (!e.dead) { e.dead = 1; if (e.y > -20) PP.fx.pop(e.x, e.y, e.r, FXK[e.def.id], false); } }
  };
  EN.removeShots = function () {
    for (var i = 0; i < pool.n; i++) { var e = pool.items[i]; if (e.def.ai === 'shot' && !e.dead) { e.dead = 1; PP.fx.hit(e.x, e.y); } }
  };

  EN.update = function (dt) {
    var G = PP.G, SQ = PP.squad, sc = G.scroll, a = pool.items, i, e, ai, dx, dy, rr, k;
    var canHit = G.state === 'run' || G.state === 'boss' || G.state === 'bossintro';
    for (i = pool.n - 1; i >= 0; i--) {
      e = a[i];
      if (e.dead) { pool.killAt(i); continue; }
      e.t += dt;
      if (e.flash > -1) e.flash -= dt;
      if (e.kb > 0) { k = 95 * dt; if (k > e.kb) k = e.kb; e.y -= k; e.kb -= k; }
      ai = e.def.ai;
      if (ai === 'walk') e.y += (sc + e.own) * dt;
      else if (ai === 'zigzag') {
        e.y += (sc + e.own) * dt;
        e.x = U.clamp(e.bx + 40 * Math.sin(TAU * 1.4 * e.t + e.ph), 30 + e.r, 330 - e.r);
      } else if (ai === 'hop') {
        e.y += (sc + e.own) * dt;
        if (e.y > 0) {
          e.tm += dt;
          if (e.st === 0 && e.tm >= 1.0) e.st = 1;
          if (e.st === 1 && e.tm >= 1.3) {
            var lane = U.laneOf(e.x), sl = U.laneOf(SQ.x);
            e.tm = 0;
            if (sl !== lane) { e.hopFrom = e.x; e.hopTo = U.laneX(lane + (sl > lane ? 1 : -1)); e.st = 2; e.tm2 = 0; } else e.st = 0;
          }
          if (e.st === 2) { e.tm2 += dt / 0.25; if (e.tm2 >= 1) { e.tm2 = 1; e.st = 0; } e.x = U.lerp(e.hopFrom, e.hopTo, e.tm2); }
        }
      } else if (ai === 'mini') {
        e.y += (sc + e.own) * dt;
        if (e.vx) { e.x = U.approach(e.x, e.bx, 110 * dt); if (e.x === e.bx) e.vx = 0; }
      } else if (ai === 'cloud') {
        if (e.st === 0) { e.y += (sc + e.own) * dt; if (e.y >= 150) { e.y = 150; e.st = 1; e.tm = 0; e.tm2 = 1.2; } }
        else if (e.st === 1) {
          e.tm += dt; e.tm2 -= dt;
          e.dark = e.tm2 <= 0.4;
          if (e.tm2 <= 0) {
            e.tm2 = 1.8; e.dark = false;
            var ddx = SQ.x - e.x, ddy = G.sy - (e.y + 16), dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            var d = EN.spawn('drop', e.x, e.y + 16, false, 1);
            if (d) { d.vx = ddx / dl * 200; d.vy = ddy / dl * 200; if (e.elite) d.bump = 2; PP.tut && PP.tut.onRaindrop(d, SQ.x); }
          }
          if (e.tm >= 6) { e.st = 2; e.dark = false; }
        } else e.y += (sc + e.own) * dt;
      } else if (ai === 'dash') {
        if (e.st === 0) {
          e.y += (sc + e.own) * dt;
          if (e.y >= 170) { e.st = 1; e.tm = 0.8; PP.obst.telegraph(e.x - e.r - 8, e.r * 2 + 16, 0.8, 0); PP.audio.sfx('warn'); }
        } else if (e.st === 1) { e.tm -= dt; if (e.tm <= 0) e.st = 2; }
        else e.y += (sc + 420) * dt;
      } else if (ai === 'shot') { e.x += e.vx * dt; e.y += e.vy * dt; }
      else if (ai === 'static') e.y += sc * dt;
      // (ai === 'orb' is positioned by the boss)

      if (e.dmgAcc > 0) { e.dmgT -= dt; if (e.dmgT <= 0) { PP.fx.dmg(e.x, e.y - e.r - 4, e.dmgAcc); e.dmgAcc = 0; e.dmgT = 0.2; } }
      if (e.y > G.H + 50 || e.x < -60 || e.x > 420 || e.y < -700) { pool.killAt(i); continue; }
      if (canHit) {
        dx = e.x - SQ.x; dy = e.y - G.sy; rr = e.r * 0.85 + SQ.R;
        if (dx * dx + dy * dy < rr * rr) {
          SQ.hurt(e.bump, 'enemy');
          if (ai !== 'orb') { EN.pop(e, false); pool.killAt(i); }
        }
      }
    }
  };

  EN.draw = function () {
    var R = PP.R, spr = PP.spr, a = pool.items, i, e, s, sx, sy, rot, x, w, ai;
    for (i = 0; i < pool.n; i++) {
      e = a[i];
      if (e.y < -60) continue;
      s = e.flash > 0 ? e.sprF : (e.dark ? e.sprD : e.sprN);
      sx = sy = e.sc; rot = 0; x = e.x; ai = e.def.ai;
      if (ai === 'walk' || ai === 'mini' || ai === 'cloud') { w = 0.06 * Math.sin(e.t * 8 + e.ph); sx *= 1 + w; sy *= 1 - w; }
      else if (ai === 'hop') { if (e.st === 1) { sx *= 1.22; sy *= 0.74; } else if (e.st === 2) { sx *= 0.9; sy *= 1.15; } }
      else if (ai === 'dash') { if (e.st === 1) x += Math.sin(e.t * 60) * 2; else if (e.st === 2) rot = e.t * 14; }
      else if (ai === 'zigzag') rot = Math.sin(e.t * 9 + e.ph) * 0.25;
      else if (ai === 'shot') { rot = e.def.id === 'drop' ? Math.atan2(e.vy, e.vx) - Math.PI / 2 : e.t * 6; }
      else if (ai === 'orb') rot = Math.sin(e.t * 4) * 0.2;
      if (e.flash > 0) x += 1;
      R.drawX(s, x, e.y, sx, sy, rot);
      if (e.elite) R.drawX(spr.e_crown, x, e.y - e.r - 5 + Math.sin(e.t * 5) * 1.5, 1.25, 1.25, 0);
      if (e.gift) R.drawX(e.giftSpr, x, e.y + 5, 0.5, 0.5, 0);
    }
  };
})();
