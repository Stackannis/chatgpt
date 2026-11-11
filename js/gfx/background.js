/* Pompom Parade - world backgrounds: pre-rendered 360x256 road tiles (tiled + scrolled),
 * a few ambient animated sprites per world and the letterbox pattern. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, S = PP.sprites, H = S.h, TAU = Math.PI * 2;
  var TH = 256;
  var BG = PP.bg = { world: 1, tiles: {}, amb: [], t: 0, patterns: {} };
  var OL = PP.cfg.OUTLINE;

  function wrapY(fn, y) { fn(y); fn(y - TH); fn(y + TH); }

  function roadBase(g, W) {
    g.fillStyle = W.side; g.fillRect(0, 0, 360, TH);
    g.fillStyle = W.road; g.fillRect(30, 0, 300, TH);
  }
  function laneMarks(g, col) {
    g.fillStyle = col;
    for (var l = 1; l < 4; l++) for (var y = 0; y < TH; y += 64) { H.rr(g, 30 + l * 75 - 2, y + 16, 4, 28, 2); g.fill(); }
  }
  function flower(g, x, y, r, pet, mid) {
    for (var i = 0; i < 5; i++) { var a = i * TAU / 5; H.dot(g, x + r * Math.cos(a), y + r * Math.sin(a), r * 0.72, pet); }
    H.dot(g, x, y, r * 0.6, mid);
  }

  var painters = {
    1: function (g, W) {
      roadBase(g, W);
      var r = U.rng(101), i;
      // grass tufts + flowers on both sides
      for (i = 0; i < 26; i++) {
        var sx = r() < 0.5 ? r.range(3, 24) : r.range(336, 357), sy = r() * TH;
        g.fillStyle = W.side2; wrapY(function (y) { g.beginPath(); g.ellipse(sx, y, 5, 3, 0, 0, TAU); g.fill(); }, sy);
      }
      for (i = 0; i < 8; i++) {
        var fx = i % 2 ? r.range(8, 20) : r.range(340, 352), fy = i * 32 + r.range(0, 14), pc = i % 3 === 0 ? '#FFFFFF' : (i % 3 === 1 ? W.decor : '#FFB6D3');
        wrapY(function (y) { flower(g, fx, y, 4.2, pc, i % 3 === 1 ? '#FF9E5E' : '#FFD23F'); }, fy);
      }
      // marshmallow tiles
      for (var ty = 0; ty < 4; ty++) for (var tx = 0; tx < 4; tx++) {
        H.rr(g, 30 + tx * 75 + 4, ty * 64 + 4, 67, 56, 14);
        g.fillStyle = (tx + ty) % 2 ? '#FFEDF3' : '#FFE8EF'; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(30 + tx * 75 + 20, ty * 64 + 14, 9, 3, -0.3, 0, TAU); g.fill();
      }
      // scalloped icing edges
      for (var y2 = 0; y2 < TH; y2 += 16) { H.dot(g, 30, y2 + 8, 9, '#fff'); H.dot(g, 330, y2 + 8, 9, '#fff'); }
      g.fillStyle = W.accent; g.fillRect(27.5, 0, 3, TH); g.fillRect(329.5, 0, 3, TH);
      for (var y3 = 0; y3 < TH; y3 += 16) { H.dot(g, 32, y3 + 8, 6.5, '#fff'); H.dot(g, 328, y3 + 8, 6.5, '#fff'); }
    },
    2: function (g, W) {
      roadBase(g, W);
      var r = U.rng(202), i;
      // water ripples
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.lineCap = 'round';
      for (i = 0; i < 14; i++) {
        var wx = i % 2 ? r.range(5, 18) : r.range(342, 355), wy = i * 18.3 + r.range(0, 6);
        wrapY(function (y) { g.beginPath(); g.arc(wx, y, 5, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }, wy);
      }
      // lemon slices
      for (i = 0; i < 4; i++) {
        var lx = i % 2 ? 13 : 347, ly = 30 + i * 64;
        wrapY(function (y) {
          H.dot(g, lx, y, 9, '#FFD23F'); H.dot(g, lx, y, 7.4, '#FFF6A8');
          g.strokeStyle = '#FFD23F'; g.lineWidth = 1.2;
          for (var k = 0; k < 6; k++) { g.beginPath(); g.moveTo(lx, y); g.lineTo(lx + 7 * Math.cos(k * TAU / 6), y + 7 * Math.sin(k * TAU / 6)); g.stroke(); }
        }, ly);
      }
      // sand speckles
      for (i = 0; i < 90; i++) H.dot(g, r.range(40, 320), r() * TH, r.range(0.8, 1.8), W.road2);
      laneMarks(g, 'rgba(255,214,120,0.55)');
      // little shells / starfish
      for (i = 0; i < 3; i++) {
        var px = r.range(60, 300), py = 30 + i * 86;
        g.fillStyle = '#FFC9A8'; H.starP(px, py, 7, 3.2, 5, i)(g); g.fill();
      }
      // foam edge
      for (var y2 = 0; y2 < TH; y2 += 12.8) { H.dot(g, 29, y2 + 6, 8, '#fff'); H.dot(g, 331, y2 + 6, 8, '#fff'); }
      for (var y3 = 0; y3 < TH; y3 += 12.8) { H.dot(g, 35, y3 + 6, 5.5, W.road); H.dot(g, 325, y3 + 6, 5.5, W.road); }
    },
    3: function (g, W) {
      roadBase(g, W);
      var r = U.rng(303), i;
      // chocolate bar blocks on the cliffs
      for (var by = 0; by < TH; by += 32) {
        g.fillStyle = W.side2; H.rr(g, 2, by + 2, 24, 28, 5); g.fill(); H.rr(g, 334, by + 2, 24, 28, 5); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; H.rr(g, 5, by + 5, 14, 4, 2); g.fill(); H.rr(g, 337, by + 5, 14, 4, 2); g.fill();
      }
      var sc = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#FFFFFF'];
      for (i = 0; i < 16; i++) {
        var sx = i % 2 ? r.range(5, 22) : r.range(338, 355), sy = r() * TH, a = r() * 3;
        g.save(); g.translate(sx, sy); g.rotate(a); g.fillStyle = sc[i % 5]; H.rr(g, -3.5, -1.4, 7, 2.8, 1.4); g.fill(); g.restore();
      }
      // biscuit road: crumbs and holes
      for (i = 0; i < 70; i++) H.dot(g, r.range(40, 320), r() * TH, r.range(0.8, 2), W.road2);
      for (var ty = 0; ty < 4; ty++) for (var tx = 0; tx < 4; tx++) H.dot(g, 67.5 + tx * 75, ty * 64 + 32, 3.2, '#E4AD68');
      laneMarks(g, 'rgba(214,150,84,0.5)');
      // cream drips at the edges
      g.fillStyle = W.edge; g.fillRect(27, 0, 7, TH); g.fillRect(326, 0, 7, TH);
      for (var y2 = 0; y2 < TH; y2 += 32) {
        H.dot(g, 36, y2 + 10, 6, W.edge); H.dot(g, 38, y2 + 24, 3.5, W.edge); H.dot(g, 324, y2 + 18, 6, W.edge); H.dot(g, 322, y2 + 4, 3.5, W.edge);
      }
    },
    4: function (g, W) {
      roadBase(g, W);
      var r = U.rng(404), i;
      // ice-cream scoops on the sides
      var cols = ['#C9B8FF', '#FFFFFF', '#FFC9DE', '#C9B8FF'];
      for (i = 0; i < 8; i++) {
        var sx = i % 2 ? 14 : 346, sy = 16 + i * 32, c = cols[i % 4];
        wrapY(function (y) {
          g.fillStyle = U.dark(c, 0.12); g.beginPath(); g.ellipse(sx, y + 3, 13, 10, 0, 0, TAU); g.fill();
          g.fillStyle = c; g.beginPath(); g.ellipse(sx, y, 12.5, 10, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(sx - 4, y - 4, 4, 2, -0.5, 0, TAU); g.fill();
        }, sy);
      }
      // sparkly snow road
      for (i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.95)'; H.starP(r.range(42, 318), r() * TH, r.range(1.5, 3.2), 0.7, 4)(g); g.fill(); }
      for (i = 0; i < 26; i++) H.dot(g, r.range(40, 320), r() * TH, r.range(2, 5), W.road2);
      laneMarks(g, 'rgba(160,210,250,0.5)');
      // snow banks
      for (var y2 = 0; y2 < TH; y2 += 21.33) { H.dot(g, 28, y2 + 10, 12, '#fff'); H.dot(g, 332, y2 + 10, 12, '#fff'); }
      g.fillStyle = 'rgba(127,200,255,0.35)'; g.fillRect(38, 0, 2.5, TH); g.fillRect(319.5, 0, 2.5, TH);
    },
    5: function (g, W) {
      roadBase(g, W);
      var r = U.rng(505), i;
      // stars on the night sides
      for (i = 0; i < 22; i++) {
        var sx = i % 2 ? r.range(4, 24) : r.range(336, 356), sy = r() * TH, sr = r.range(1.6, 3.6);
        g.fillStyle = i % 4 === 0 ? '#FFFFFF' : W.decor; wrapY(function (y) { H.starP(sx, y, sr, sr * 0.38, 4)(g); g.fill(); }, sy);
      }
      // castle turrets
      for (i = 0; i < 2; i++) {
        var tx = i ? 345 : 15, ty = 60 + i * 128;
        g.fillStyle = '#4A4490'; g.fillRect(tx - 9, ty, 18, 40);
        g.fillStyle = '#5B54A8'; g.fillRect(tx - 9, ty, 6, 40);
        g.fillStyle = W.accent; g.beginPath(); g.moveTo(tx - 12, ty); g.lineTo(tx, ty - 20); g.lineTo(tx + 12, ty); g.closePath(); g.fill();
        H.dot(g, tx, ty + 14, 3.6, W.decor);
      }
      // cobbled starlight road
      for (var cy = 0; cy < 8; cy++) for (var cx = 0; cx < 8; cx++) {
        var ox = (cy % 2) * 18.75;
        H.rr(g, 30 + cx * 37.5 + ox - 16, cy * 32 + 3, 33, 26, 9);
        g.fillStyle = (cx + cy) % 3 === 0 ? '#8575D6' : '#7F70D0'; g.fill();
      }
      g.fillStyle = W.side; g.fillRect(0, 0, 30, TH); g.fillRect(330, 0, 30, TH);
      // re-draw the side decor that the cobbles may have covered
      var r2 = U.rng(506);
      for (i = 0; i < 16; i++) {
        var sx2 = i % 2 ? r2.range(4, 24) : r2.range(336, 356), sy2 = r2() * TH, sr2 = r2.range(1.6, 3.4);
        g.fillStyle = i % 4 === 0 ? '#FFFFFF' : W.decor; wrapY(function (y) { H.starP(sx2, y, sr2, sr2 * 0.38, 4)(g); g.fill(); }, sy2);
      }
      for (i = 0; i < 2; i++) {
        var tx2 = i ? 345 : 15, ty2 = 60 + i * 128;
        g.fillStyle = '#4A4490'; g.fillRect(tx2 - 9, ty2, 18, 40);
        g.fillStyle = '#5B54A8'; g.fillRect(tx2 - 9, ty2, 6, 40);
        g.fillStyle = W.accent; g.beginPath(); g.moveTo(tx2 - 12, ty2); g.lineTo(tx2, ty2 - 20); g.lineTo(tx2 + 12, ty2); g.closePath(); g.fill();
        H.dot(g, tx2, ty2 + 14, 3.6, W.decor);
      }
      for (i = 0; i < 12; i++) { g.fillStyle = 'rgba(255,226,122,0.55)'; H.starP(r.range(44, 316), r() * TH, 2.6, 1, 4)(g); g.fill(); }
      // glowing edges
      g.fillStyle = W.edge; g.fillRect(28, 0, 4, TH); g.fillRect(328, 0, 4, TH);
      g.fillStyle = 'rgba(255,138,216,0.8)'; g.fillRect(26, 0, 2, TH); g.fillRect(332, 0, 2, TH);
    }
  };

  function buildTile(w) {
    var W = PP.data.worlds[w], rs = Math.min(S.rs, 2);
    var c = document.createElement('canvas');
    c.width = Math.round(360 * rs); c.height = Math.round(TH * rs);
    var g = c.getContext('2d');
    g.scale(c.width / 360, c.height / TH); g.lineJoin = 'round'; g.lineCap = 'round';
    painters[w](g, W);
    return { c: c, w: 360, h: TH, ox: 0, oy: 0 };
  }
  BG.invalidate = function () { BG.tiles = {}; };
  BG.tile = function (w) { return BG.tiles[w] || (BG.tiles[w] = buildTile(w)); };

  /* letterbox / pillarbox pattern as a data URL (set once per world on <body>) */
  BG.pattern = function (w) {
    if (BG.patterns[w]) return BG.patterns[w];
    var W = PP.data.worlds[w], c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = W.side2; g.fillRect(0, 0, 96, 96);
    var pts = [[20, 22], [68, 34], [36, 70], [84, 82]];
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1];
      if (w === 1) flower(g, x, y, 6, i % 2 ? '#FFF6A8' : '#FFFFFF', '#FFB05E');
      else if (w === 2) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, 9, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
      else if (w === 3) { g.fillStyle = W.side; H.rr(g, x - 12, y - 10, 24, 20, 5); g.fill(); }
      else if (w === 4) { H.dot(g, x, y, 9, i % 2 ? '#C9B8FF' : '#FFFFFF'); }
      else { g.fillStyle = i % 2 ? '#FFE27A' : '#FFFFFF'; H.starP(x, y, 7, 2.6, 4)(g); g.fill(); }
    }
    var url = '';
    try { url = c.toDataURL('image/png'); } catch (e) { url = ''; }
    BG.patterns[w] = url;
    return url;
  };

  /* ambient sprites: petals / foam sparkles / sprinkles / snow / twinkles */
  var AMB = [null,
    { spr: 'pt_heart', n: 7, vy: 26, vx: 10, rot: 1.2, sc: 0.8, a: 0.75 },
    { spr: 'pt_spark', n: 8, vy: 0, vx: 0, rot: 0, sc: 0.8, a: 0.9, twinkle: true, sides: true },
    { spr: 'pt_conf_1', n: 7, vy: 34, vx: 6, rot: 2.2, sc: 0.9, a: 0.8 },
    { spr: 'pt_snow', n: 12, vy: 44, vx: 12, rot: 0, sc: 0.8, a: 0.85 },
    { spr: 'pt_star', n: 10, vy: 0, vx: 0, rot: 0, sc: 0.8, a: 1, twinkle: true }
  ];
  BG.setWorld = function (w) {
    if (w < 1) w = 1; if (w > 5) w = 5;
    var changed = w !== BG.world || !BG.amb.length;
    BG.world = w;
    if (changed) {
      var d = AMB[w]; BG.amb.length = 0;
      for (var i = 0; i < d.n; i++) {
        var x = d.sides ? (i % 2 ? 4 + Math.random() * 22 : 334 + Math.random() * 22) : Math.random() * 360;
        BG.amb.push({ x: x, y: Math.random() * 780, ph: Math.random() * TAU, s: 0.6 + Math.random() * 0.7 });
      }
      try {
        var url = BG.pattern(w);
        if (url) { document.body.style.backgroundImage = 'url(' + url + ')'; }
        document.body.style.backgroundColor = PP.data.worlds[w].side2;
      } catch (e) { /* ignore */ }
    }
  };
  BG.update = function (dt, scroll) {
    BG.t += dt;
    if (!PP.quality.decorAnim) return;
    var d = AMB[BG.world], a = BG.amb, Hh = PP.R.H;
    for (var i = 0; i < a.length; i++) {
      var p = a[i];
      if (d.twinkle) { p.y += scroll * dt * 0.35; }
      else { p.y += (d.vy * p.s + scroll * 0.2) * dt; p.x += Math.sin(BG.t * 0.8 + p.ph) * d.vx * dt; }
      if (p.y > Hh + 12) { p.y = -12; if (!d.sides) p.x = Math.random() * 360; }
    }
  };
  BG.draw = function (dist) {
    var R = PP.R, t = BG.tile(BG.world), Hh = R.H;
    var off = dist % TH; if (off < 0) off += TH;
    for (var y = off - TH; y < Hh; y += TH) R.ctx.drawImage(t.c, 0, y, 360, TH + 0.5);
    R.draws += Math.ceil(Hh / TH) + 1;
  };
  BG.drawAmbient = function () {
    if (!PP.quality.decorAnim) return;
    var R = PP.R, d = AMB[BG.world], a = BG.amb, s = PP.spr[d.spr];
    for (var i = 0; i < a.length; i++) {
      var p = a[i], sc = d.sc * p.s, al = d.a;
      if (d.twinkle) { var k = 0.5 + 0.5 * Math.sin(BG.t * 2.4 + p.ph); al *= 0.25 + 0.75 * k; sc *= 0.7 + 0.5 * k; }
      R.ctx.globalAlpha = al;
      R.drawX(s, p.x, p.y, sc, sc, d.rot ? BG.t * d.rot * p.s + p.ph : 0);
    }
    R.ctx.globalAlpha = 1;
  };
})();
