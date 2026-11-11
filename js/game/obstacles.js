/* Pompom Parade - indestructible hazards (red/white candy stripes), zones and lane telegraphs */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var OB = PP.obst = { list: [], tele: [] };
  for (var i = 0; i < 16; i++) OB.list.push({ on: false, type: '', x: 0, y: 0, rot: 0, t: 0, st: 0, gap: 0, cost: 1, vy: 0, w: 0, h: 0 });
  for (var j = 0; j < 8; j++) OB.tele.push({ on: false, x: 0, w: 75, t: 0, dur: 1, kind: 0 });
  var LISTED = { spinner: 3, roller: 4, fence: 3 };

  OB.clear = function () {
    for (var i = 0; i < OB.list.length; i++) OB.list[i].on = false;
    for (var k = 0; k < OB.tele.length; k++) OB.tele[k].on = false;
  };
  /* lane telegraph. kind 0 = striped warning, 1 = shimmer (snow incoming), 2 = snow falling (damaging, handled by boss) */
  OB.telegraph = function (x, w, dur, kind) {
    for (var i = 0; i < OB.tele.length; i++) {
      var t = OB.tele[i];
      if (!t.on) { t.on = true; t.x = x; t.w = w; t.t = 0; t.dur = dur; t.kind = kind || 0; return t; }
    }
    return null;
  };
  OB.spawn = function (type, x, y, opt) {
    var G = PP.G, o = null;
    for (var i = 0; i < OB.list.length; i++) if (!OB.list[i].on) { o = OB.list[i]; break; }
    if (!o) return null;
    o.on = true; o.type = type; o.x = x; o.y = y === undefined ? -40 : y; o.rot = 0; o.t = 0; o.st = 0; o.vy = 0; o.gap = 0;
    o.cost = LISTED[type] ? PP.bal.hazardCost(LISTED[type], Math.round(G.L)) : 0;
    if (type === 'spinner') { o.y = -60; o.rot = (opt && opt.rot) || 0; }
    else if (type === 'roller') { o.st = 0; o.t = 0; o.y = -46; PP.audio.sfx('warn'); }
    else if (type === 'fence') { o.gap = x; o.x = 180; }
    else if (type === 'syrup') { o.w = 120; o.h = 80; o.vy = (opt && opt.vy) || 0; }
    else if (type === 'ice') { o.x = 180; o.w = 300; o.h = 100; o.y = -60; }
    return o;
  };

  OB.update = function (dt) {
    var G = PP.G, SQ = PP.squad, GR = PP.grid, i, o, hit, R = SQ.R;
    var syr = false, ice = false;
    var canHit = G.state === 'run' || G.state === 'boss' || G.state === 'bossintro';
    for (i = 0; i < OB.list.length; i++) {
      o = OB.list[i];
      if (!o.on) continue;
      o.t += dt; hit = false;
      if (o.type === 'spinner') {
        o.y += G.scroll * dt; o.rot += 0.4 * TAU * dt;
        if (Math.abs(o.y - G.sy) < 70 + R) {
          var cx = Math.cos(o.rot) * 55, cy = Math.sin(o.rot) * 55, rr = 6 + R * 0.85;
          hit = GR.segDist2(SQ.x, G.sy, o.x - cx, o.y - cy, o.x + cx, o.y + cy) < rr * rr;
        }
      } else if (o.type === 'roller') {
        if (o.st === 0) { if (o.t >= 1.0) o.st = 1; }
        else {
          o.y += (G.scroll + 160) * dt; o.rot += 5 * dt;
          var dx = o.x - SQ.x, dy = o.y - G.sy, r2 = 24 + R * 0.85;
          hit = dx * dx + dy * dy < r2 * r2;
        }
      } else if (o.type === 'fence') {
        o.y += G.scroll * dt;
        if (Math.abs(o.y - G.sy) < 7 + R * 0.7) hit = (SQ.x - R * 0.6 < o.gap - 55) || (SQ.x + R * 0.6 > o.gap + 55);
      } else {
        o.y += (G.scroll + o.vy) * dt;
        if (Math.abs(SQ.x - o.x) < o.w / 2 && Math.abs(G.sy - o.y) < o.h / 2) { if (o.type === 'syrup') syr = true; else ice = true; }
      }
      if (hit && canHit) SQ.hurt(o.cost, 'hazard');
      if (o.y > G.H + 80) o.on = false;
    }
    SQ.inSyrup = syr; SQ.onIce = ice;
    for (i = 0; i < OB.tele.length; i++) { var t = OB.tele[i]; if (t.on) { t.t += dt; if (t.t >= t.dur) t.on = false; } }
  };

  /* zones + telegraphs are drawn under everything else on the road */
  OB.drawUnder = function () {
    var R = PP.R, spr = PP.spr, G = PP.G, ctx = R.ctx, i, o, t, y;
    for (i = 0; i < OB.list.length; i++) {
      o = OB.list[i];
      if (!o.on) continue;
      if (o.type === 'syrup') R.draw(spr.z_syrup, o.x, o.y);
      else if (o.type === 'ice') R.draw(spr.z_ice, 30, o.y - 50);
    }
    for (i = 0; i < OB.tele.length; i++) {
      t = OB.tele[i];
      if (!t.on) continue;
      var s = t.kind === 0 ? spr.z_lane : (t.kind === 1 ? spr.z_shimmer : spr.z_snow);
      var a = t.kind === 2 ? 0.9 : 0.45 + 0.4 * Math.abs(Math.sin(t.t * 10));
      var fade = t.dur - t.t; if (fade < 0.15) a *= fade / 0.15;
      ctx.globalAlpha = a < 0 ? 0 : a;
      var off = t.kind === 0 ? 0 : (t.t * (t.kind === 2 ? 240 : 60)) % 128;
      for (y = off - 128; y < G.H; y += 128) R.drawR(s, t.x, y, t.w, 128);
    }
    ctx.globalAlpha = 1;
  };
  OB.draw = function () {
    var R = PP.R, spr = PP.spr, G = PP.G, i, o;
    for (i = 0; i < OB.list.length; i++) {
      o = OB.list[i];
      if (!o.on) continue;
      if (o.type === 'spinner') { R.drawX(spr.z_bar, o.x, o.y, 1, 1, o.rot); R.drawX(spr.z_hub, o.x, o.y, 1, 1, -o.rot * 0.5); }
      else if (o.type === 'roller') {
        if (o.st === 0) { var b = Math.abs(Math.sin(o.t * 9)); R.drawX(spr.z_warn, o.x, 74 + b * 8, 1, 1, 0); }
        else R.drawX(spr.z_roller, o.x, o.y, 1, 1, o.rot);
      } else if (o.type === 'fence') {
        var gl = o.gap - 55, gr = o.gap + 55, c = spr.z_fence.c, k = c.width / 300, ctx = R.ctx;
        if (gl > 34) { ctx.drawImage(c, 0, 0, (gl - 30) * k, c.height, 30, o.y - 13, gl - 30, 26); R.draws++; R.draw(spr.z_post, gl, o.y); }
        if (gr < 326) { ctx.drawImage(c, (gr - 30) * k, 0, (330 - gr) * k, c.height, gr, o.y - 13, 330 - gr, 26); R.draws++; R.draw(spr.z_post, gr, o.y); }
        var tw = 0.6 + 0.4 * Math.sin(o.t * 8);
        R.drawX(spr.h_spark, o.gap - 30, o.y, tw, tw, o.t * 2); R.drawX(spr.h_spark, o.gap + 30, o.y, 1.6 - tw, 1.6 - tw, -o.t * 2); R.drawX(spr.h_spark, o.gap, o.y, tw, tw, o.t);
      }
    }
  };
})();
