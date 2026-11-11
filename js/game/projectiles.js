/* Pompom Parade - pooled player shots (7 weapon behaviours), enemy shots, confetti clouds, beam */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, C = PP.cfg;
  var SH = PP.shots = { beamHitY: 0 };
  var pool = SH.pool = new U.Pool(C.MAX_SHOTS, function () {
    return { k: 0, x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 1, pierce: 0, hits: new Int32Array(8), hn: 0, life: 0, flag: 0, leg: 0, y0: 0,
      rot: 0, vr: 0, tu: 0, ti: -1, tt: 0, turn: 6, range: 0, sub: 0 };
  });
  var clouds = SH.clouds = [];
  for (var ci = 0; ci < 12; ci++) clouds.push({ on: false, x: 0, y: 0, r: 36, t: 0, tick: 0, dps: 0 });
  var KSPR = ['p_bubble', 'p_sprinkle_0', 'p_gumball', 'p_star', 'p_cookie', 'p_confetti', 'p_bubble'];
  var KBASE = [5, 3, 8, 5, 9, 6, 5];
  var SPRK = [PP.spr.p_sprinkle_0, PP.spr.p_sprinkle_1, PP.spr.p_sprinkle_2, PP.spr.p_sprinkle_3, PP.spr.p_sprinkle_4];

  /* kinds: 0 bubble, 1 sprinkle, 2 gumball, 3 star, 4 cookie, 5 confetti, 6 split bubble */
  SH.fire = function (k, x, y, vx, vy, dmg, r) {
    var s = pool.spawn(); if (!s) return null;
    s.k = k; s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.dmg = dmg; s.r = r; s.pierce = 0; s.hn = 0; s.life = 4; s.flag = 0; s.leg = 0;
    s.rot = 0; s.vr = k === 3 ? 9 : (k === 4 ? 11 : (k === 5 ? 5 : 0)); s.ti = -1; s.tu = 0; s.tt = 0; s.sub = 0;
    return s;
  };
  SH.clear = function () { pool.clear(); for (var i = 0; i < clouds.length; i++) clouds[i].on = false; SH.beamHitY = 0; };

  function wasHit(s, uid) {
    var n = s.hn < 8 ? s.hn : 8;
    for (var i = 0; i < n; i++) if (s.hits[i] === uid) return true;
    return false;
  }
  function record(s, uid) { s.hits[s.hn & 7] = uid; s.hn++; }

  function retarget(s) {
    var EN = PP.enemies, a = EN.pool.items, n = EN.pool.n, BS = PP.boss;
    var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1, hx = s.vx / sp, hy = s.vy / sp;
    var best = -1, bd = 1e12, j, e, dx, dy, d2, dot, COS2 = 0.671; // cos(35 deg)^2
    for (j = 0; j < n; j++) {
      e = a[j];
      if (e.dead || e.y + e.r < 0 || wasHit(s, e.uid)) continue;
      dx = e.x - s.x; dy = e.y - s.y; d2 = dx * dx + dy * dy; dot = dx * hx + dy * hy;
      if (dot <= 0 || dot * dot < COS2 * d2) continue;
      if (d2 < bd) { bd = d2; best = j; }
    }
    if (BS.on && BS.targetable()) {
      dx = BS.x - s.x; dy = BS.y - s.y; d2 = dx * dx + dy * dy; dot = dx * hx + dy * hy;
      if (dot > 0 && dot * dot >= COS2 * d2 && d2 < bd) { s.ti = -2; return; }
    }
    s.ti = best; s.tu = best >= 0 ? a[best].uid : 0;
  }
  function homing(s, dt) {
    var EN = PP.enemies, tx = 0, ty = 0, have = false, e;
    s.tt -= dt;
    if (s.tt <= 0) { s.tt = 0.1; retarget(s); }
    if (s.ti >= 0) {
      e = EN.pool.items[s.ti];
      if (s.ti < EN.pool.n && e.uid === s.tu && !e.dead) { tx = e.x; ty = e.y; have = true; } else { s.ti = -1; s.tt = 0; }
    } else if (s.ti === -2) { if (PP.boss.on) { tx = PP.boss.x; ty = PP.boss.y; have = true; } else s.ti = -1; }
    if (!have) return;
    var cur = Math.atan2(s.vy, s.vx), want = Math.atan2(ty - s.y, tx - s.x), d = want - cur;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    var m = s.turn * dt; if (d > m) d = m; else if (d < -m) d = -m;
    cur += d; s.vx = Math.cos(cur) * 420; s.vy = Math.sin(cur) * 420;
  }

  function splash(s, direct, hitBoss) {
    var EN = PP.enemies, a = EN.pool.items, n = EN.pool.n, R = s.range, dm = s.dmg * 0.625, j, e, dx, dy, rr;
    for (j = 0; j < n; j++) {
      e = a[j];
      if (e === direct || e.dead || e.y + e.r < 0) continue;
      dx = e.x - s.x; dy = e.y - s.y; rr = R + e.r;
      if (dx * dx + dy * dy < rr * rr) EN.damage(e, dm, 1);
    }
    if (!hitBoss && PP.boss.on && PP.boss.hitTest(s.x, s.y, R)) PP.boss.damage(dm, s.x, s.y);
    if (!PP.headless) PP.fx.confetti(s.x, s.y, 4, 150);
    if (s.flag) {
      for (var i = 0; i < clouds.length; i++) if (!clouds[i].on) {
        var c = clouds[i]; c.on = true; c.x = s.x; c.y = s.y; c.r = R; c.t = 1; c.tick = 0; c.dps = s.dmg * 0.2; break;
      }
    }
  }

  /* returns true if the shot is used up */
  function hit(s, e) {
    var EN = PP.enemies, k = s.k, mult = 1, shellMult = 1;
    if (k === 2) { shellMult = 2; if (e.def.obstacle) mult = 2; }
    var ex = e.x, ey = e.y;
    EN.damage(e, s.dmg * mult, shellMult);
    PP.fx.hit(s.x, s.y);
    if (k === 2 && !e.dead && e.def.grumbly) e.kb = 14;
    if (k === 0 && s.flag) {
      s.flag = 0;
      for (var c = -1; c <= 1; c += 2) {
        var ch = SH.fire(6, s.x, s.y, c * 220, -471, s.dmg * 0.6, s.r * 0.8);
        if (ch) { ch.hits[0] = e.uid; ch.hn = 1; }
      }
    } else if (k === 3 && s.flag) {
      s.flag = 0;
      var st = SH.fire(3, ex, ey, s.vx, s.vy, s.dmg * 0.5, s.r * 0.85);
      if (st) { st.hits[0] = e.uid; st.hn = 1; st.turn = 14; st.tt = 0; st.life = 1.2; }
    } else if (k === 5) splash(s, e, false);
    if (s.pierce > 0) { s.pierce--; record(s, e.uid); return false; }
    return true;
  }

  SH.update = function (dt) {
    var G = PP.G, EN = PP.enemies, ea = EN.pool.items, GR = PP.grid, head = GR.head, next = GR.next, BS = PP.boss, GT = PP.gates;
    var a = pool.items, i, s, j, e, dx, dy, rr, c, cx, cy, cx0, cx1, cy0, cy1, dead, SQ = PP.squad;
    var hasGrow = GT.growActive();
    for (i = pool.n - 1; i >= 0; i--) {
      s = a[i];
      s.life -= dt;
      if (s.k === 3) homing(s, dt);
      else if (s.k === 4) {
        if (s.leg === 0) { if (s.y0 - s.y >= s.range || s.y < 12) { s.leg = 1; s.vy = 380; s.hn = 0; } }
        else { s.vx = U.clamp((SQ.x - s.x) * 4, -220, 220); }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      if (s.k === 2 && s.flag) {
        if ((s.x < 30 + s.r && s.vx < 0) || (s.x > 330 - s.r && s.vx > 0)) { s.vx = -s.vx; s.flag = 0; }
        else if (s.y < s.r && s.vy < 0) { s.vy = -s.vy; s.flag = 0; s.hn = 0; }
      }
      if (s.life <= 0 || s.y < -24 || s.y > G.H + 24 || s.x < -24 || s.x > 384 || (s.k === 4 && s.leg === 1 && s.y >= G.sy - 8)) { pool.killAt(i); continue; }
      if (hasGrow && s.vy < 0 && GT.absorb(s)) { pool.killAt(i); continue; }
      if (BS.on && BS.hitTest(s.x, s.y, s.r)) {
        BS.damage(s.dmg, s.x, s.y);
        if (s.k === 5) splash(s, null, true);
        PP.fx.hit(s.x, s.y);
        pool.killAt(i); continue;
      }
      dead = false;
      cx0 = GR.cx(s.x - 46); cx1 = GR.cx(s.x + 46); cy0 = GR.cy(s.y - 46); cy1 = GR.cy(s.y + 46);
      outer:
      for (cy = cy0; cy <= cy1; cy++) {
        for (cx = cx0; cx <= cx1; cx++) {
          c = cy * GR.COLS + cx;
          for (j = head[c]; j >= 0; j = next[j]) {
            e = ea[j];
            if (e.dead) continue;
            dx = e.x - s.x; dy = e.y - s.y; rr = s.r + e.r;
            if (dx * dx + dy * dy < rr * rr) {
              if (s.hn > 0 && wasHit(s, e.uid)) continue;
              if (hit(s, e)) { dead = true; break outer; }
            }
          }
        }
      }
      if (dead) pool.killAt(i);
    }
    // confetti clouds
    for (i = 0; i < clouds.length; i++) {
      c = clouds[i]; if (!c.on) continue;
      c.t -= dt; c.y += G.scroll * dt; c.tick -= dt;
      if (c.tick <= 0) {
        c.tick = 0.25;
        for (j = 0; j < EN.pool.n; j++) {
          e = ea[j]; if (e.dead || e.y + e.r < 0) continue;
          dx = e.x - c.x; dy = e.y - c.y; rr = c.r + e.r;
          if (dx * dx + dy * dy < rr * rr) EN.damage(e, c.dps * 0.25, 1);
        }
      }
      if (c.t <= 0) c.on = false;
    }
  };

  /* Rainbow Beam: continuous column from the squad upward; hits the first 2 targets (all at Lv5) */
  var candI = new Int16Array(96), candY = new Float32Array(96);
  SH.beamWidth = function () {
    var SQ = PP.squad;
    var w = Math.min(40, 8 + 0.6 * Math.sqrt(SQ.n) * 4) * (SQ.wlv >= 3 ? 1.3 : 1) * (1 + 0.35 * SQ.big);
    return w;
  };
  SH.beamTick = function (dmg) {
    var G = PP.G, SQ = PP.squad, EN = PP.enemies, a = EN.pool.items, n = EN.pool.n, BS = PP.boss, GT = PP.gates;
    var x = SQ.x, half = SH.beamWidth() / 2, i, e, nc = 0, limit = SQ.wlv >= 5 ? 99 : 2 + SQ.pierce;
    var blockY = GT.beamBlock(x, half, dmg);   // grow gates absorb the beam
    for (i = 0; i < n && nc < 96; i++) {
      e = a[i];
      if (e.dead || e.y + e.r < 0 || e.y > G.sy || e.y < blockY) continue;
      if (Math.abs(e.x - x) < half + e.r) { candI[nc] = i; candY[nc] = e.y; nc++; }
    }
    var bossY = -1e9;
    if (BS.on && Math.abs(BS.x - x) < half + BS.rx && BS.y + BS.ry > 0 && BS.y > blockY) bossY = BS.y + BS.ry * 0.5;
    var hits = 0, top = blockY > 0 ? blockY : 0, bossDone = bossY < -1e8;
    while (hits < limit) {
      var best = -1, by = -1e9;
      for (i = 0; i < nc; i++) if (candY[i] > by) { by = candY[i]; best = i; }
      if (!bossDone && bossY >= by) { BS.damage(dmg, x, bossY); top = bossY; break; } // the boss absorbs the beam
      if (best < 0) break;
      e = a[candI[best]]; candY[best] = -2e9;
      EN.damage(e, dmg, 1.5);
      if (!PP.headless && (G.tick & 3) === 0) PP.fx.hit(e.x, e.y);
      hits++;
      if (hits >= limit) top = e.y;
    }
    SH.beamHitY = top;
  };

  SH.draw = function () {
    var R = PP.R, spr = PP.spr, a = pool.items, i, s, sp, sc, G = PP.G, SQ = PP.squad;
    for (i = 0; i < clouds.length; i++) {
      var c = clouds[i]; if (!c.on) continue;
      R.ctx.globalAlpha = c.t > 0.3 ? 0.85 : c.t / 0.3 * 0.85;
      R.drawX(spr.p_cloud, c.x, c.y, c.r / 36, c.r / 36, c.t * 2);
    }
    R.ctx.globalAlpha = 1;
    if (SQ.beamOn && SQ.n > 0) {
      var w = SH.beamWidth() * (1.5 + 0.12 * Math.sin(SQ.t * 30)), top = SH.beamHitY, y1 = G.sy - SQ.VR * 0.5;
      R.ctx.globalAlpha = 0.9;
      R.drawR(spr.p_beam, SQ.x - w / 2, top, w, y1 - top);
      R.ctx.globalAlpha = 1;
      R.drawX(spr.p_beamcap, SQ.x, y1, w / 30, w / 30, 0);
      if (top > 0) R.drawX(spr.p_beamcap, SQ.x, top, w / 24, w / 24, 0);
    }
    for (i = 0; i < pool.n; i++) {
      s = a[i];
      sp = s.k === 1 ? SPRK[s.sub] : spr[KSPR[s.k]];
      sc = s.r / KBASE[s.k];
      if (s.k === 0 || s.k === 6) { var wb = 1 + 0.1 * Math.sin(s.y * 0.08); R.drawX(sp, s.x, s.y, sc * wb, sc * (2 - wb), 0); }
      else if (sc !== 1 || s.rot) R.drawX(sp, s.x, s.y, sc, sc, s.rot);
      else R.draw(sp, s.x, s.y);
    }
  };

  /* ---------- enemy shots (never shootable; always magenta + white core) ---------- */
  var ES = PP.eshots = {};
  var ep = ES.pool = new U.Pool(C.MAX_ESHOTS, function () { return { x: 0, y: 0, vx: 0, vy: 0, r: 6, cost: 1, t: 0 }; });
  ES.fire = function (x, y, vx, vy, cost, r) {
    var s = ep.spawn(); if (!s) return null;
    s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.cost = cost; s.r = r || 6; s.t = 0;
    return s;
  };
  ES.clear = function () { ep.clear(); };
  ES.update = function (dt) {
    var G = PP.G, SQ = PP.squad, a = ep.items, i, s, dx, dy, rr;
    for (i = ep.n - 1; i >= 0; i--) {
      s = a[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
      if (s.y > G.H + 20 || s.y < -60 || s.x < -20 || s.x > 380) { ep.killAt(i); continue; }
      dx = s.x - SQ.x; dy = s.y - G.sy; rr = s.r + SQ.R * 0.9;
      if (dx * dx + dy * dy < rr * rr) { SQ.hurt(s.cost, 'boss'); ep.killAt(i); }
    }
  };
  ES.draw = function () {
    var R = PP.R, s0 = PP.spr.e_shot, a = ep.items, i, s, sc;
    for (i = 0; i < ep.n; i++) { s = a[i]; sc = s.r / 6 * (1 + 0.12 * Math.sin(s.t * 18)); R.drawX(s0, s.x, s.y, sc, sc, 0); }
  };
})();
