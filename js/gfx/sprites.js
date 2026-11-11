/* Pompom Parade - procedural sprite painters + offscreen cache.
 * Every sprite is painted once into an offscreen canvas at (size x renderScale);
 * gameplay then only uses drawImage. PP.spr[name] = {c, w, h, ox, oy} (logical units). */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var OL = PP.cfg.OUTLINE, LW = 2.5;
  var S = PP.sprites = { rs: 1, built: false, defs: [], index: {} };
  var light = U.light, dark = U.dark;

  /* ---------- registry ---------- */
  function def(name, w, h, ox, oy, fn) {
    var d = { name: name, w: w, h: h, ox: ox, oy: oy, fn: fn, src: null };
    S.index[name] = d; S.defs.push(d);
    if (!PP.spr[name]) PP.spr[name] = { c: null, w: w, h: h, ox: ox, oy: oy };
    return d;
  }
  /* centred sprite of half-size (hw, hh) */
  function defc(name, hw, hh, fn) { return def(name, hw * 2, hh * 2, hw, hh, fn); }
  /* white "hit flash" copy of an existing sprite */
  function flash(name) {
    var b = S.index[name];
    var d = def(name + '_f', b.w, b.h, b.ox, b.oy, null);
    d.src = name;
  }
  function buildOne(d) {
    var rs = S.rs;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(d.w * rs)); c.height = Math.max(1, Math.ceil(d.h * rs));
    var g = c.getContext('2d');
    if (d.src) {
      g.drawImage(PP.spr[d.src].c, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillRect(0, 0, c.width, c.height);
    } else {
      g.scale(rs, rs); g.translate(d.ox, d.oy);
      g.lineJoin = 'round'; g.lineCap = 'round';
      d.fn(g);
    }
    var s = PP.spr[d.name];
    s.c = c; s.w = d.w; s.h = d.h; s.ox = d.ox; s.oy = d.oy;
  }
  S.def = def; S.defc = defc; S.flash = flash;
  S.count = function () { return S.defs.length; };
  /* build defs[i0 .. i0+n) ; returns next index */
  S.buildRange = function (i0, n) {
    var end = Math.min(S.defs.length, i0 + n);
    for (var i = i0; i < end; i++) buildOne(S.defs[i]);
    return end;
  };
  /* boot helpers: build a few named sprites first (splash), then the rest in chunks */
  S.buildNames = function (names) { for (var i = 0; i < names.length; i++) if (S.index[names[i]]) buildOne(S.index[names[i]]); };
  S.finish = function () { S.built = true; if (PP.atlas) PP.atlas.build(); if (PP.bg) PP.bg.invalidate(); };
  S.buildAll = function (rs) {
    S.rs = rs;
    for (var i = 0; i < S.defs.length; i++) buildOne(S.defs[i]);
    S.built = true;
    if (PP.atlas) PP.atlas.build();
    if (PP.bg) PP.bg.invalidate();
  };
  /* new <canvas> element showing a sprite (for DOM menus) */
  S.toCanvas = function (name, cssSize) {
    var s = PP.spr[name], c = document.createElement('canvas');
    if (!s || !s.c) return c;
    c.width = s.c.width; c.height = s.c.height;
    c.getContext('2d').drawImage(s.c, 0, 0);
    c.className = 'ico';
    if (cssSize) { c.style.width = 'calc(var(--u) * ' + cssSize + ')'; c.style.height = 'calc(var(--u) * ' + (cssSize * s.h / s.w) + ')'; }
    return c;
  };

  /* ---------- drawing helpers (build time only) ---------- */
  function pe(x, y, rx, ry, rot) { return function (g) { g.beginPath(); g.ellipse(x, y, rx, ry === undefined ? rx : ry, rot || 0, 0, TAU); }; }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function pr(x, y, w, h, r) { return function (g) { rr(g, x, y, w, h, r); }; }
  function fluffP(x, y, R, amp, n, ph) {
    return function (g) {
      g.beginPath();
      for (var i = 0; i <= 60; i++) {
        var a = i / 60 * TAU, r = R + amp * Math.sin(a * n + (ph || 0));
        if (i) g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); else g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
      g.closePath();
    };
  }
  function jellyP(x, y, w, h, n) {
    return function (g) {
      g.beginPath(); g.moveTo(x - w, y);
      g.bezierCurveTo(x - w, y - h * 1.3, x + w, y - h * 1.3, x + w, y);
      var sw = 2 * w / n;
      for (var i = 0; i < n; i++) { var x0 = x + w - i * sw; g.quadraticCurveTo(x0 - sw / 2, y + sw * 0.6, x0 - sw, y); }
      g.closePath();
    };
  }
  function starP(x, y, R, r, n, rot) {
    return function (g) {
      g.beginPath();
      for (var i = 0; i < n * 2; i++) {
        var a = (rot || -Math.PI / 2) + i * Math.PI / n, rad = i % 2 ? r : R;
        if (i) g.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a)); else g.moveTo(x + rad * Math.cos(a), y + rad * Math.sin(a));
      }
      g.closePath();
    };
  }
  function heartP(x, y, s) {
    return function (g) {
      g.beginPath(); g.moveTo(x, y + s * 0.9);
      g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.8, y - s * 1.2, x, y - s * 0.35);
      g.bezierCurveTo(x + s * 0.8, y - s * 1.2, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
      g.closePath();
    };
  }
  /* sticker body: plum outline, flat fill, darker bottom crescent, light top-left blob */
  function body(g, path, fill, o) {
    o = o || {};
    var lw = o.lw === undefined ? LW : o.lw;
    if (lw > 0) { path(g); g.lineWidth = lw * 2; g.strokeStyle = o.ol || OL; g.stroke(); }
    path(g); g.fillStyle = fill; g.fill();
    if (o.flat) return;
    g.save(); path(g); g.clip();
    g.fillStyle = o.shade || dark(fill, 0.2); g.fillRect(-400, -400, 800, 800);
    var sx = o.sx === undefined ? -1.5 : o.sx, sy = o.sy === undefined ? -2.5 : o.sy;
    g.translate(sx, sy); path(g); g.fillStyle = fill; g.fill(); g.translate(-sx, -sy);
    if (o.hl) { g.fillStyle = 'rgba(255,255,255,' + (o.hla || 0.5) + ')'; g.beginPath(); g.ellipse(o.hl[0], o.hl[1], o.hl[2], o.hl[3], o.hl[4] || -0.5, 0, TAU); g.fill(); }
    g.restore();
  }
  function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function eye(g, x, y, r) { dot(g, x, y, r, OL); dot(g, x - r * 0.3, y - r * 0.35, r * 0.4, '#fff'); }
  function eyes(g, x, y, dx, r) { eye(g, x - dx, y, r); eye(g, x + dx, y, r); }
  function line(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col || OL; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function brows(g, x, y, dx, l, a, w) {
    line(g, x - dx - l, y - a, x - dx + l, y + a, w || 1.8);
    line(g, x + dx + l, y - a, x + dx - l, y + a, w || 1.8);
  }
  function blush(g, x, y, dx, r, col) {
    g.fillStyle = col || 'rgba(255,120,160,0.55)';
    g.beginPath(); g.ellipse(x - dx, y, r * 1.25, r * 0.8, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x + dx, y, r * 1.25, r * 0.8, 0, 0, TAU); g.fill();
  }
  function smile(g, x, y, w, lw) { g.strokeStyle = OL; g.lineWidth = lw || 1.5; g.beginPath(); g.arc(x, y - w * 0.6, w, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke(); }
  function frown(g, x, y, w, lw) { g.strokeStyle = OL; g.lineWidth = lw || 1.6; g.beginPath(); g.arc(x, y + w * 0.9, w, 1.22 * Math.PI, 1.78 * Math.PI); g.stroke(); }
  function grumpFace(g, x, y, dx, r, o) {
    o = o || {};
    eyes(g, x, y, dx, r);
    brows(g, x, y - r * 1.9, dx, r * 1.35, r * 0.7, Math.max(1.6, r * 0.75));
    frown(g, x, y + r * 2.1 + (o.my || 0), o.mw || r * 1.5, Math.max(1.5, r * 0.6));
    if (!o.noBlush) blush(g, x, y + r * 1.6, dx + r * 1.9, r * 0.8, 'rgba(255,140,190,0.45)');
  }
  function shine(g, x, y, r) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, -0.6, 0, TAU); g.fill(); }
  /* candy stripes (hazards only): clip to path, red/white diagonal bands */
  function stripes(g, path, band, c1, c2, ang) {
    g.save(); path(g); g.clip();
    g.fillStyle = c2 || '#fff'; g.fillRect(-400, -400, 800, 800);
    g.rotate(ang === undefined ? Math.PI / 4 : ang);
    g.fillStyle = c1 || '#FF4A5E';
    for (var x = -420; x < 420; x += band * 2) g.fillRect(x, -420, band, 840);
    g.restore();
  }
  function outline(g, path, lw) { path(g); g.strokeStyle = OL; g.lineWidth = lw || LW; g.stroke(); }
  S.h = { pe: pe, pr: pr, rr: rr, body: body, dot: dot, eye: eye, eyes: eyes, line: line, brows: brows, blush: blush, smile: smile, frown: frown,
    grumpFace: grumpFace, shine: shine, stripes: stripes, outline: outline, starP: starP, heartP: heartP, jellyP: jellyP, fluffP: fluffP, OL: OL, LW: LW };

  /* ================= POMPOMS ================= */
  var SPECIES = { bunny: '#FFD6E5', chick: '#FFE98A', kitten: '#FFC79E', mouse: '#C8F5DC', pip: '#FFF6E0' };
  S.speciesList = ['bunny', 'chick', 'kitten', 'mouse'];
  function pompom(g, sp, frame, happy) {
    var col = SPECIES[sp], R = sp === 'pip' ? 11 : 10;
    if (frame) { g.translate(0, R); g.scale(1.05, 0.95); g.translate(0, -R); }
    // feet
    var fc = dark(col, 0.3);
    body(g, pe(-4.2, R - 1 + (frame ? 0.6 : -1.2), 3.4, 2.4), fc, { lw: 2, flat: true });
    body(g, pe(4.2, R - 1 + (frame ? -1.2 : 0.6), 3.4, 2.4), fc, { lw: 2, flat: true });
    // ears
    if (sp === 'bunny' || sp === 'pip') {
      body(g, pe(-4.6, -R - 4.5, 3, 7, -0.22), col, { lw: 2, flat: true });
      body(g, pe(4.6, -R - 4.5, 3, 7, 0.22), col, { lw: 2, flat: true });
      g.fillStyle = '#FF9DBB';
      g.beginPath(); g.ellipse(-4.6, -R - 4.2, 1.3, 4.4, -0.22, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(4.6, -R - 4.2, 1.3, 4.4, 0.22, 0, TAU); g.fill();
    } else if (sp === 'kitten') {
      body(g, function (c) { c.beginPath(); c.moveTo(-9.5, -4); c.lineTo(-8.5, -13.5); c.lineTo(-1.5, -8.5); c.closePath(); }, col, { lw: 2, flat: true });
      body(g, function (c) { c.beginPath(); c.moveTo(9.5, -4); c.lineTo(8.5, -13.5); c.lineTo(1.5, -8.5); c.closePath(); }, col, { lw: 2, flat: true });
      g.fillStyle = '#FF9DBB';
      g.beginPath(); g.moveTo(-8, -6.5); g.lineTo(-7.6, -11); g.lineTo(-4.2, -8.4); g.fill();
      g.beginPath(); g.moveTo(8, -6.5); g.lineTo(7.6, -11); g.lineTo(4.2, -8.4); g.fill();
    } else if (sp === 'mouse') {
      body(g, pe(-8, -7.5, 4.6, 4.6), col, { lw: 2, flat: true });
      body(g, pe(8, -7.5, 4.6, 4.6), col, { lw: 2, flat: true });
      dot(g, -8, -7.5, 2.4, '#FF9DBB'); dot(g, 8, -7.5, 2.4, '#FF9DBB');
    } else if (sp === 'chick') {
      body(g, pe(0, -R - 2.5, 2, 3.6, 0), col, { lw: 2, flat: true });
      body(g, pe(-2.8, -R - 1.2, 1.7, 3, -0.6), col, { lw: 2, flat: true });
      body(g, pe(2.8, -R - 1.2, 1.7, 3, 0.6), col, { lw: 2, flat: true });
    }
    // fluffy body
    body(g, fluffP(0, 0, R, 0.7, 11), col, { hl: [-3.6, -4.4, 3.6, 2.3] });
    // face
    if (happy) {
      g.strokeStyle = OL; g.lineWidth = 1.6;
      g.beginPath(); g.arc(-3.7, -0.4, 1.8, Math.PI, TAU); g.stroke();
      g.beginPath(); g.arc(3.7, -0.4, 1.8, Math.PI, TAU); g.stroke();
    } else eyes(g, 0, -0.8, 3.7, 1.75);
    blush(g, 0, 2.3, 6.3, 1.7);
    if (sp === 'chick') {
      body(g, function (c) { c.beginPath(); c.moveTo(-2, 1.4); c.lineTo(2, 1.4); c.lineTo(0, 4.2); c.closePath(); }, '#FFA53C', { lw: 1, flat: true });
    } else {
      smile(g, 0, 2.5, 1.9, 1.4);
      if (sp === 'kitten' || sp === 'mouse') dot(g, 0, 1.2, 0.9, '#FF7AA8');
    }
    if (sp === 'pip') {
      // pink scarf
      body(g, function (c) { c.beginPath(); c.moveTo(-9.4, 4.6); c.quadraticCurveTo(0, 9.6, 9.4, 4.6); c.lineTo(8.4, 8.2); c.quadraticCurveTo(0, 12.6, -8.4, 8.2); c.closePath(); }, '#FF7AA8', { lw: 1.6, flat: true });
      body(g, function (c) { c.beginPath(); c.moveTo(4.5, 9); c.lineTo(9.5, 14.5); c.lineTo(5.6, 15); c.lineTo(2.6, 10.4); c.closePath(); }, '#FF7AA8', { lw: 1.6, flat: true });
    }
  }
  var spn = ['bunny', 'chick', 'kitten', 'mouse', 'pip'];
  spn.forEach(function (sp) {
    [0, 1].forEach(function (f) {
      def('pom_' + sp + '_' + f, 36, 46, 18, 26, function (g) { pompom(g, sp, f, false); });
    });
  });
  def('pom_pip_happy', 36, 46, 18, 26, function (g) { pompom(g, 'pip', 0, true); });
  S.pompom = pompom;

  /* ================= GRUMBLIES ================= */
  defc('e_jelly', 22, 22, function (g) {
    body(g, jellyP(0, 10, 14, 19, 4), '#9B7BFF', { hl: [-6, -6.5, 4.5, 2.6], shade: '#7A5BE0' });
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(0, 4, 9, 5.5, 0, 0, TAU); g.fill();
    grumpFace(g, 0, 0, 4.6, 2.2);
  });
  defc('e_dust', 19, 19, function (g) {
    body(g, pe(-4.5, 10.5, 3, 2.2), '#6E6E88', { lw: 2, flat: true });
    body(g, pe(4.5, 10.5, 3, 2.2), '#6E6E88', { lw: 2, flat: true });
    body(g, fluffP(0, 0, 11, 2, 9, 0.6), '#9A9AB0', { hl: [-4, -5, 3.5, 2.2], shade: '#7C7C96' });
    grumpFace(g, 0, -0.5, 3.8, 1.9, { noBlush: true, mw: 2.4 });
  });
  defc('e_bean', 21, 23, function (g) {
    body(g, pe(-4.5, 14.5, 3.4, 2.5), '#3E9B50', { lw: 2, flat: true });
    body(g, pe(4.5, 14.5, 3.4, 2.5), '#3E9B50', { lw: 2, flat: true });
    body(g, function (c) {
      c.beginPath(); c.moveTo(-3, -15); c.bezierCurveTo(9, -17, 13, -6, 10.5, 2);
      c.bezierCurveTo(13.5, 9, 7, 15.5, -1, 14.5); c.bezierCurveTo(-11, 14, -13, 6, -10, 0);
      c.bezierCurveTo(-13.5, -6, -11, -14, -3, -15); c.closePath();
    }, '#6CCB7A', { hl: [-4.5, -9, 3.6, 2.2], shade: '#4FAE5F' });
    grumpFace(g, 0, -1.5, 4.3, 2.1);
    // little sprout
    line(g, 0, -15, 1.5, -19, 2); body(g, pe(4.2, -19.4, 3.4, 1.9, -0.4), '#9BE08A', { lw: 1.6, flat: true });
  });
  defc('e_twin', 27, 26, function (g) {
    body(g, function (c) {
      c.beginPath(); c.moveTo(-19, 12);
      c.bezierCurveTo(-21, -10, -12, -19, -6, -17); c.bezierCurveTo(-2, -16, -1, -11, 0, -8);
      c.bezierCurveTo(1, -11, 2, -16, 6, -17); c.bezierCurveTo(12, -19, 21, -10, 19, 12);
      for (var i = 0; i < 5; i++) { var x0 = 19 - i * 7.6; c.quadraticCurveTo(x0 - 3.8, 17, x0 - 7.6, 12); }
      c.closePath();
    }, '#4FD1C5', { hl: [-11, -9, 4.5, 2.6], shade: '#35AFA6' });
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(7, -11, 3.4, 2, -0.5, 0, TAU); g.fill();
    eyes(g, -9.5, -2, 3.2, 1.9); brows(g, -9.5, -5.6, 3.2, 2.4, 1.2, 1.6); frown(g, -9.5, 2.6, 2.6, 1.5);
    eyes(g, 9.5, -2, 3.2, 1.9); brows(g, 9.5, -5.6, 3.2, 2.4, 1.2, 1.6); frown(g, 9.5, 2.6, 2.6, 1.5);
    blush(g, 0, 4, 16, 1.5, 'rgba(255,140,190,0.45)');
  });
  defc('e_mini', 16, 16, function (g) {
    body(g, jellyP(0, 7, 10, 14, 3), '#4FD1C5', { hl: [-4, -5, 3, 1.8], shade: '#35AFA6', lw: 2.2 });
    grumpFace(g, 0, -0.5, 3.3, 1.6, { noBlush: true, mw: 2 });
  });
  function cloudP(s) {
    return function (g) {
      g.beginPath();
      g.arc(-11 * s, 3 * s, 9.5 * s, 0, TAU); g.moveTo(21 * s, 3 * s); g.arc(11 * s, 3 * s, 9.5 * s, 0, TAU);
      g.moveTo(7 * s, -6 * s); g.arc(-4 * s, -6 * s, 11 * s, 0, TAU); g.moveTo(16 * s, -4 * s); g.arc(7 * s, -4 * s, 9 * s, 0, TAU);
      g.rect(-11 * s, 2 * s, 22 * s, 10.5 * s);
    };
  }
  function cloud(g, col, shadeC, darkMode) {
    body(g, cloudP(1), col, { hl: [-8, -11, 5, 2.8], shade: shadeC });
    grumpFace(g, 0, 1, 5.2, 2.3, { noBlush: darkMode });
    if (darkMode) {
      body(g, function (c) { c.beginPath(); c.moveTo(0, 13); c.quadraticCurveTo(5, 20, 0, 23); c.quadraticCurveTo(-5, 20, 0, 13); c.closePath(); }, '#FF3FA4', { lw: 1.5, flat: true });
      dot(g, 0, 19.5, 1.6, '#fff');
    }
  }
  def('e_cloud', 56, 54, 28, 24, function (g) { cloud(g, '#8E9AC9', '#7380B4', false); });
  def('e_cloud_d', 56, 54, 28, 24, function (g) { cloud(g, '#5E6796', '#4A5280', true); });
  /* snail head (facing the parade): face on the head, little antennae */
  function snailHead(g, col, y) {
    line(g, -7, y - 4, -13, y - 11, 4.6); line(g, 7, y - 4, 13, y - 11, 4.6);
    line(g, -7, y - 4, -13, y - 11, 2, col); line(g, 7, y - 4, 13, y - 11, 2, col);
    body(g, pe(-13.5, y - 12, 2.6, 2.6), '#FFE27A', { lw: 1.6, flat: true }); body(g, pe(13.5, y - 12, 2.6, 2.6), '#FFE27A', { lw: 1.6, flat: true });
    body(g, pe(0, y, 12.5, 10), col, { hl: [-5, y - 4.5, 3.6, 2] });
    eyes(g, 0, y - 1, 4.4, 2);
    brows(g, 0, y - 4.8, 4.4, 2.6, 1.3, 1.7);
    frown(g, 0, y + 3.6, 2.6, 1.5); blush(g, 0, y + 2.4, 8.2, 1.5, 'rgba(255,140,190,0.5)');
  }
  def('e_snail', 54, 62, 27, 32, function (g) {
    body(g, pe(0, -9, 18, 17), '#E07AC0', { hl: [-8, -18, 5.5, 3], shade: '#C45BA4' });
    g.strokeStyle = '#FFD0EE'; g.lineWidth = 3; g.beginPath();
    for (var i = 0; i <= 40; i++) { var a = i / 40 * 4.2 * Math.PI, r = 1 + i * 0.33; var x = r * Math.cos(a), y = -9 + r * Math.sin(a) * 0.95; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    snailHead(g, '#D9CCF2', 13);
  });
  def('e_snail_n', 54, 62, 27, 32, function (g) {
    body(g, pe(0, -6, 9, 13), '#C9B8E8', { lw: 2.2, shade: '#B3A0D6' });
    snailHead(g, '#D9CCF2', 11);
  });
  function donut(g, R, glaze, dough, face, hole) {
    body(g, pe(0, 0, R, R), dough, { hl: [-R * 0.45, -R * 0.55, R * 0.3, R * 0.17] });
    // glaze with drips
    g.save(); pe(0, 0, R - 0.5, R - 0.5)(g); g.clip();
    g.fillStyle = glaze; g.beginPath();
    for (var i = 0; i <= 48; i++) {
      var a = i / 48 * TAU, r = R * (0.84 + 0.07 * Math.sin(a * 7));
      if (i) g.lineTo(r * Math.cos(a), r * Math.sin(a)); else g.moveTo(r * Math.cos(a), r * Math.sin(a));
    }
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-R * 0.4, -R * 0.5, R * 0.3, R * 0.16, -0.6, 0, TAU); g.fill();
    g.restore();
    // sprinkles
    var cols = ['#FFF6A8', '#8FD8FF', '#FFFFFF', '#B9F5C8', '#C9B8FF'];
    for (var k = 0; k < 9; k++) {
      var a2 = k * 2.4 + 0.5, rr2 = R * (0.52 + 0.2 * ((k * 7) % 3) / 2);
      var sx = rr2 * Math.cos(a2), sy = rr2 * Math.sin(a2);
      if (sy > R * 0.05 && Math.abs(sx) < R * 0.6) continue; // keep the face clear
      g.save(); g.translate(sx, sy); g.rotate(k * 1.3); g.fillStyle = cols[k % 5];
      rr(g, -R * 0.11, -R * 0.045, R * 0.22, R * 0.09, R * 0.04); g.fill(); g.restore();
    }
    // hole
    body(g, pe(0, -R * 0.2, hole, hole * 0.9), dark(dough, 0.45), { lw: R > 30 ? 2.5 : 2, flat: true });
    face(g);
  }
  defc('e_dasher', 23, 23, function (g) {
    donut(g, 16, '#FF9E5E', '#EDBE7E', function (c) { grumpFace(c, 0, 5.2, 5, 2, { noBlush: true, my: -0.6, mw: 2.6 }); }, 3.6);
  });
  defc('e_crown', 12, 9, function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(-9, 6); c.lineTo(-10, -4); c.lineTo(-5, 0.5); c.lineTo(0, -6.5); c.lineTo(5, 0.5); c.lineTo(10, -4); c.lineTo(9, 6); c.closePath(); }, '#FFD23F', { lw: 2, shade: '#F0A81E', sx: 0, sy: -2.5 });
    dot(g, 0, 2, 1.7, '#FF7AA8'); dot(g, -5.5, 2.6, 1.1, '#8FD8FF'); dot(g, 5.5, 2.6, 1.1, '#8FD8FF');
  });
  /* enemy projectiles: ALWAYS magenta with a white core */
  defc('e_shot', 9, 9, function (g) { body(g, pe(0, 0, 6, 6), '#FF3FA4', { lw: 1.6, flat: true }); dot(g, 0, 0, 2.8, '#fff'); });
  defc('e_drop', 10, 13, function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(0, -11); c.bezierCurveTo(8, -2, 8, 9, 0, 9); c.bezierCurveTo(-8, 9, -8, -2, 0, -11); c.closePath(); }, '#FF3FA4', { lw: 1.8, flat: true });
    dot(g, 0, 2.5, 3, '#fff');
  });
  defc('e_snowball', 15, 15, function (g) {
    body(g, fluffP(0, 0, 11, 0.9, 8), '#FF3FA4', { lw: 2, flat: true });
    dot(g, 0, 0, 6, '#fff'); dot(g, -2, -2, 1.6, '#FFD0EA'); dot(g, 2.5, 1.5, 1.3, '#FFD0EA');
  });
  defc('e_orb', 20, 20, function (g) {
    body(g, pe(0, 0, 15, 15), '#FF8AD8', { hl: [-6, -7.5, 4.5, 2.6], shade: '#E064B8' });
    g.strokeStyle = '#FFD6F2'; g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, 10.5, 0.4, 2.2); g.stroke();
    g.beginPath(); g.arc(0, 0, 10.5, 3.5, 5.3); g.stroke();
    grumpFace(g, 0, -0.5, 4.2, 1.9, { noBlush: true, mw: 2.4 });
  });
  ['e_jelly', 'e_dust', 'e_bean', 'e_twin', 'e_mini', 'e_cloud', 'e_cloud_d', 'e_snail', 'e_snail_n', 'e_dasher', 'e_snowball', 'e_orb'].forEach(flash);

  /* ================= OBSTACLES / HAZARDS / ZONES ================= */
  defc('o_crate', 24, 24, function (g) {
    body(g, pr(-19, -19, 38, 38, 7), '#D9A066', { hl: [-10, -13, 6, 2.6], shade: '#B97E48' });
    g.strokeStyle = '#B97E48'; g.lineWidth = 2; g.beginPath(); g.moveTo(-19, -7); g.lineTo(19, -7); g.moveTo(-19, 8); g.lineTo(19, 8); g.stroke();
    body(g, pe(0, 0.5, 10.5, 10.5), '#F2CC8C', { lw: 2, shade: '#DDB06A' });
    dot(g, -4, -3, 1.9, '#7A4A2E'); dot(g, 3.5, -4.5, 1.6, '#7A4A2E'); dot(g, 4.5, 3.5, 1.9, '#7A4A2E'); dot(g, -3, 5, 1.6, '#7A4A2E'); dot(g, 0, 0, 1.3, '#7A4A2E');
  });
  defc('o_gift', 25, 27, function (g) {
    body(g, pr(-18, -11, 36, 30, 5), '#FF8FB6', { hl: [-10, -5, 5, 2.4], shade: '#F0699A' });
    body(g, pr(-20, -16, 40, 10, 4), '#FFA9C8', { lw: 2.2, shade: '#F0699A' });
    g.fillStyle = '#FFE27A'; g.fillRect(-4, -15, 8, 33);
    body(g, pe(-6.5, -19.5, 6.5, 4.2, 0.5), '#FFE27A', { lw: 2, flat: true }); body(g, pe(6.5, -19.5, 6.5, 4.2, -0.5), '#FFE27A', { lw: 2, flat: true });
    dot(g, 0, -17.5, 3, '#FFC531'); outline(g, pe(0, -17.5, 3, 3), 1.6);
  });
  defc('o_jar', 22, 26, function (g) {
    body(g, pr(-15, -13, 30, 34, 9), '#CDEEFF', { hl: [-9, -6, 2.5, 7, 0], shade: '#A6D9F5' });
    var cols = ['#FFD23F', '#FF8FB6', '#8FD8FF', '#B9F5C8', '#C9B8FF', '#FFD23F', '#FF9E5E'];
    var pos = [[-7, 14], [2, 15], [8, 11], [-3, 8], [5, 4], [-8, 4], [0, 0]];
    for (var i = 0; i < pos.length; i++) { body(g, pe(pos[i][0], pos[i][1], 4.6, 4.6), cols[i], { lw: 1.4, flat: true }); dot(g, pos[i][0] - 1.2, pos[i][1], 0.8, OL); dot(g, pos[i][0] + 1.2, pos[i][1], 0.8, OL); }
    body(g, pr(-13, -21, 26, 9, 3.5), '#FF9E5E', { lw: 2.2, shade: '#E87F3C' });
    g.fillStyle = 'rgba(255,255,255,0.55)'; rr(g, -11, -8, 3.4, 20, 1.7); g.fill();
  });
  ['o_crate', 'o_gift', 'o_jar'].forEach(flash);
  def('z_bar', 118, 20, 59, 10, function (g) {
    var p = pr(-55, -6.5, 110, 13, 6.5);
    body(g, p, '#fff', { flat: true }); stripes(g, p, 7); outline(g, p, LW);
    g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, -50, -4.6, 100, 2.6, 1.3); g.fill();
  });
  defc('z_hub', 16, 16, function (g) {
    var p = pe(0, 0, 12, 12);
    body(g, p, '#fff', { flat: true });
    g.save(); p(g); g.clip(); g.fillStyle = '#FF4A5E';
    for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 14, k * Math.PI / 2, k * Math.PI / 2 + Math.PI / 4); g.closePath(); g.fill(); }
    g.restore(); outline(g, p, LW); dot(g, 0, 0, 3, '#fff'); outline(g, pe(0, 0, 3, 3), 1.6); shine(g, -5, -6, 3);
  });
  defc('z_roller', 31, 31, function (g) {
    var p = pe(0, 0, 26, 26);
    body(g, p, '#fff', { flat: true }); stripes(g, p, 9, '#FF4A5E', '#fff', 0.6);
    g.save(); p(g); g.clip(); g.fillStyle = 'rgba(74,59,82,0.16)'; g.beginPath(); g.arc(4, 6, 27, 0, TAU); g.arc(-3, -5, 25, 0, TAU, true); g.fill(); g.restore();
    outline(g, p, LW); shine(g, -11, -13, 6.5);
  });
  def('z_fence', 300, 26, 0, 13, function (g) {
    var p = pr(1, -6.5, 298, 13, 6.5);
    body(g, p, '#fff', { flat: true }); stripes(g, p, 8); outline(g, p, LW);
    g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, 5, -4.6, 290, 2.6, 1.3); g.fill();
  });
  defc('z_post', 9, 13, function (g) {
    var p = pr(-6, -10, 12, 20, 5);
    body(g, p, '#fff', { flat: true }); stripes(g, p, 4, '#FF4A5E', '#fff', -0.6); outline(g, p, LW);
  });
  defc('z_warn', 17, 19, function (g) {
    var p = function (c) { c.beginPath(); c.moveTo(-7, -15); c.lineTo(7, -15); c.lineTo(7, -1); c.lineTo(14, -1); c.lineTo(0, 15); c.lineTo(-14, -1); c.lineTo(-7, -1); c.closePath(); };
    body(g, p, '#fff', { flat: true }); stripes(g, p, 5); outline(g, p, LW);
  });
  /* lane telegraph: translucent candy stripes, tiled vertically */
  def('z_lane', 75, 128, 0, 0, function (g) {
    g.save(); g.beginPath(); g.rect(2, 0, 71, 128); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, 75, 128);
    g.fillStyle = 'rgba(255,74,94,0.6)';
    for (var y = -80; y < 220; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(75, y + 40); g.lineTo(75, y + 56); g.lineTo(0, y + 16); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(255,74,94,0.9)'; g.fillRect(0, 0, 3, 128); g.fillRect(72, 0, 3, 128);
  });
  def('z_snow', 75, 128, 0, 0, function (g) {
    g.fillStyle = 'rgba(255,255,255,0.42)'; g.fillRect(2, 0, 71, 128);
    var r = U.rng(77);
    for (var i = 0; i < 26; i++) {
      var x = 6 + r() * 63, y = r() * 128, s = 1.6 + r() * 2.4;
      g.fillStyle = '#FF3FA4'; g.beginPath(); g.arc(x, y, s + 1.2, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      if (y < 8) { g.fillStyle = '#FF3FA4'; g.beginPath(); g.arc(x, y + 128, s + 1.2, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y + 128, s, 0, TAU); g.fill(); }
    }
    g.fillStyle = 'rgba(255,63,164,0.75)'; g.fillRect(0, 0, 3, 128); g.fillRect(72, 0, 3, 128);
  });
  def('z_shimmer', 75, 128, 0, 0, function (g) {
    g.fillStyle = 'rgba(255,63,164,0.20)'; g.fillRect(2, 0, 71, 128);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    var r = U.rng(31);
    for (var i = 0; i < 12; i++) { var x = 8 + r() * 59, y = 6 + r() * 116; starP(x, y, 4, 1.4, 4)(g); g.fill(); }
    g.fillStyle = 'rgba(255,63,164,0.75)'; g.fillRect(0, 0, 3, 128); g.fillRect(72, 0, 3, 128);
  });
  def('z_syrup', 128, 88, 64, 44, function (g) {
    var p = function (c) {
      c.beginPath();
      for (var i = 0; i <= 60; i++) { var a = i / 60 * TAU, rx = 58 + 3.5 * Math.sin(a * 5), ry = 38 + 3 * Math.sin(a * 4 + 1); if (i) c.lineTo(rx * Math.cos(a), ry * Math.sin(a)); else c.moveTo(rx * Math.cos(a), ry * Math.sin(a)); }
      c.closePath();
    };
    body(g, p, '#C9772E', { lw: 2, shade: '#A85C1C', ol: '#8A4A18', hl: [-24, -18, 14, 5, -0.2], hla: 0.4 });
    g.fillStyle = 'rgba(255,230,170,0.5)'; g.beginPath(); g.ellipse(20, 12, 9, 3.4, 0.2, 0, TAU); g.fill();
    dot(g, 34, -8, 2.4, 'rgba(255,230,170,0.6)'); dot(g, -30, 14, 3, 'rgba(255,230,170,0.5)');
  });
  def('z_ice', 300, 100, 0, 0, function (g) {
    var p = pr(3, 3, 294, 94, 22);
    p(g); g.fillStyle = 'rgba(190,236,255,0.9)'; g.fill();
    g.save(); p(g); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5;
    for (var i = 0; i < 9; i++) { var x = 14 + i * 34; g.beginPath(); g.moveTo(x, 78 - (i % 3) * 9); g.lineTo(x + 26, 22 + (i % 2) * 12); g.stroke(); }
    g.restore();
    p(g); g.strokeStyle = '#7FC8FF'; g.lineWidth = 3; g.stroke();
  });
  /* boss ripple band segment (enemy colour language: magenta + white core) */
  def('z_ripple', 60, 28, 0, 14, function (g) {
    g.fillStyle = '#FF3FA4'; g.beginPath(); g.moveTo(0, -9);
    for (var x = 0; x <= 60; x += 3) g.lineTo(x, -9 - 3 * Math.sin(x / 60 * TAU * 2));
    for (var x2 = 60; x2 >= 0; x2 -= 3) g.lineTo(x2, 9 + 3 * Math.sin(x2 / 60 * TAU * 2));
    g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(0, -3, 60, 6);
  });

  /* ================= PICKUPS ================= */
  function button(g, R, col) {
    body(g, pe(0, 0, R, R), col, { lw: R > 6 ? 2 : 1.6, hl: [-R * 0.35, -R * 0.45, R * 0.35, R * 0.2] });
    outline(g, pe(0, 0, R * 0.68, R * 0.68), 1);
    var d = R * 0.24;
    dot(g, -d, -d, R * 0.14, OL); dot(g, d, -d, R * 0.14, OL); dot(g, -d, d, R * 0.14, OL); dot(g, d, d, R * 0.14, OL);
  }
  S.paintButton = button;
  defc('k_button', 10, 10, function (g) { button(g, 7.5, '#FFD23F'); });
  defc('k_stack', 13, 15, function (g) {
    g.save(); g.translate(1.5, 6); button(g, 8, '#FF8FB6'); g.restore();
    g.save(); g.translate(-1.5, 0.5); button(g, 8, '#8FD8FF'); g.restore();
    g.save(); g.translate(1, -5); button(g, 8, '#FFD23F'); g.restore();
  });
  defc('k_heart', 15, 15, function (g) {
    body(g, heartP(0, 0.5, 9.5), '#FF6F9F', { hl: [-4.6, -4.2, 2.8, 1.7], shade: '#E84C82' });
    g.strokeStyle = OL; g.lineWidth = 1.4;
    g.beginPath(); g.arc(-3.2, -0.6, 1.5, Math.PI, TAU); g.stroke(); g.beginPath(); g.arc(3.2, -0.6, 1.5, Math.PI, TAU); g.stroke();
    smile(g, 0, 2.6, 1.8, 1.3);
  });
  defc('k_shield', 15, 15, function (g) {
    body(g, pe(0, 0, 11.5, 11.5), '#BFF2FF', { hl: [-4.6, -5.4, 3.6, 2], shade: '#8FDDF5', ol: '#3D9EC0' });
    body(g, starP(0, 0.5, 5.5, 2.5, 5), '#fff', { lw: 1.2, flat: true, ol: '#3D9EC0' });
  });
  defc('k_frenzy', 17, 12, function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(-7, 0); c.lineTo(-14, -6); c.lineTo(-14, 6); c.closePath(); }, '#FFE27A', { lw: 1.8, flat: true });
    body(g, function (c) { c.beginPath(); c.moveTo(7, 0); c.lineTo(14, -6); c.lineTo(14, 6); c.closePath(); }, '#FFE27A', { lw: 1.8, flat: true });
    body(g, pe(0, 0, 8.5, 7), '#FF9E5E', { hl: [-3, -3, 3, 1.5], shade: '#F07C34' });
    g.strokeStyle = '#FFE27A'; g.lineWidth = 2; g.beginPath(); g.arc(-1, 0, 4, -1, 1.2); g.stroke();
  });
  defc('k_magnet', 14, 15, function (g) {
    var p = function (c) { c.beginPath(); c.moveTo(-10, -10); c.lineTo(-4, -10); c.lineTo(-4, 1); c.arc(0, 1, 4, Math.PI, 0, true); c.lineTo(4, -10); c.lineTo(10, -10); c.lineTo(10, 1); c.arc(0, 1, 10, 0, Math.PI); c.closePath(); };
    body(g, p, '#9B6BFF', { lw: 2, shade: '#7B4BE0' });
    g.fillStyle = '#FFE27A'; g.fillRect(-10, -10, 6, 4.5); g.fillRect(4, -10, 6, 4.5);
    outline(g, p, 2);
  });

  /* ================= PROJECTILES ================= */
  defc('p_bubble', 8, 8, function (g) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 6.6, 0, TAU); g.fill();
    dot(g, 0, 0, 5.2, '#5FE3FF'); dot(g, 0.6, 0.8, 3.6, '#A8F2FF'); dot(g, -1.8, -2, 1.5, '#fff');
  });
  var SPR_COL = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'];
  SPR_COL.forEach(function (c, i) {
    defc('p_sprinkle_' + i, 4, 7, function (g) {
      g.fillStyle = '#fff'; rr(g, -3.2, -6.2, 6.4, 12.4, 3.2); g.fill();
      g.fillStyle = c; rr(g, -2, -5, 4, 10, 2); g.fill();
    });
  });
  defc('p_gumball', 11, 11, function (g) {
    dot(g, 0, 0, 9.6, '#fff'); dot(g, 0, 0, 8, '#FF7AA8'); dot(g, 1, 1.4, 5.6, '#FF9DC0'); shine(g, -3, -3.4, 2.6);
  });
  defc('p_star', 9, 9, function (g) {
    starP(0, 0, 8.2, 4, 5)(g); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
    starP(0, 0, 6.4, 3.1, 5)(g); g.fillStyle = '#FFD23F'; g.fill(); dot(g, -1, -1, 1.2, '#FFF6C8');
  });
  defc('p_cookie', 12, 12, function (g) {
    dot(g, 0, 0, 10.6, '#fff'); dot(g, 0, 0, 9, '#D9A066'); dot(g, 1, 1.4, 6.6, '#E8B880');
    dot(g, -3.5, -2.5, 1.7, '#7A4A2E'); dot(g, 3, -3.5, 1.4, '#7A4A2E'); dot(g, 3.5, 3, 1.7, '#7A4A2E'); dot(g, -2.5, 4, 1.4, '#7A4A2E');
  });
  defc('p_confetti', 9, 9, function (g) {
    dot(g, 0, 0, 7.6, '#fff');
    var cols = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF'];
    for (var i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 6.2, i * Math.PI / 2, (i + 1) * Math.PI / 2); g.closePath(); g.fill(); }
    dot(g, -2, -2, 1.4, '#fff');
  });
  /* rainbow beam strip, pre-rendered gradient; stretched vertically at draw time */
  def('p_beam', 40, 32, 20, 0, function (g) {
    var gr = g.createLinearGradient(-20, 0, 20, 0);
    var cols = ['rgba(255,122,168,0)', '#FF7AA8', '#FFB05E', '#FFE27A', '#FFFFFF', '#8FF0A8', '#7FC8FF', '#C29BFF', 'rgba(194,155,255,0)'];
    for (var i = 0; i < cols.length; i++) gr.addColorStop(i / (cols.length - 1), cols[i]);
    g.fillStyle = gr; g.fillRect(-20, 0, 40, 32);
  });
  defc('p_beamcap', 26, 14, function (g) {
    var gr = g.createRadialGradient(0, 0, 2, 0, 0, 24);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,240,170,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 25, 13, 0, 0, TAU); g.fill();
  });
  defc('p_cloud', 40, 40, function (g) {
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fill();
    var cols = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'], r = U.rng(5);
    for (var i = 0; i < 40; i++) { var a = r() * TAU, d = Math.sqrt(r()) * 33; g.fillStyle = cols[i % 5]; g.save(); g.translate(d * Math.cos(a), d * Math.sin(a)); g.rotate(r() * 3); g.fillRect(-2, -1.2, 4, 2.4); g.restore(); }
  });

  /* ================= PARTICLES ================= */
  defc('pt_spark', 7, 7, function (g) { starP(0, 0, 6.5, 1.7, 4)(g); g.fillStyle = '#fff'; g.fill(); });
  defc('pt_star', 7, 7, function (g) { starP(0, 0, 6, 2.8, 5)(g); g.fillStyle = '#FFE27A'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); });
  var DOTS = { w: '#FFFFFF', p: '#FF8FC0', c: '#7FE6FF', y: '#FFE27A', v: '#B99BFF', g: '#8FE8A0', o: '#FFB070', m: '#FF3FA4' };
  Object.keys(DOTS).forEach(function (k) { defc('pt_dot_' + k, 4, 4, function (g) { dot(g, 0, 0, 3.4, DOTS[k]); }); });
  defc('pt_ring', 20, 20, function (g) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.stroke(); });
  ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'].forEach(function (c, i) {
    defc('pt_conf_' + i, 4, 3, function (g) { g.fillStyle = c; rr(g, -3.6, -2.2, 7.2, 4.4, 1); g.fill(); });
  });
  defc('pt_ghost', 9, 10, function (g) {
    g.globalAlpha = 0.92;
    body(g, function (c) { c.beginPath(); c.moveTo(-7, 7); c.lineTo(-7, -1); c.arc(0, -1, 7, Math.PI, 0); c.lineTo(7, 7); c.quadraticCurveTo(4.7, 4.5, 2.3, 7); c.quadraticCurveTo(0, 4.5, -2.3, 7); c.quadraticCurveTo(-4.7, 4.5, -7, 7); c.closePath(); }, '#fff', { lw: 1.2, flat: true, ol: '#C9B8FF' });
    g.strokeStyle = OL; g.lineWidth = 1.2;
    g.beginPath(); g.arc(-2.6, -1.6, 1.3, Math.PI, TAU); g.stroke(); g.beginPath(); g.arc(2.6, -1.6, 1.3, Math.PI, TAU); g.stroke();
    smile(g, 0, 1.6, 1.8, 1.2); blush(g, 0, 0.8, 4.8, 1, 'rgba(255,120,160,0.6)');
  });
  defc('pt_pop', 20, 16, function (g) {
    body(g, starP(0, 0, 18, 10.5, 9, 0.2), '#FFE27A', { lw: 2, flat: true });
    starP(0, 0, 11, 6.5, 9, 0.2)(g); g.fillStyle = '#fff'; g.fill();
    line(g, 0, -5.5, 0, 1.2, 3, '#FF5A8A'); dot(g, 0, 5.2, 1.7, '#FF5A8A');
  });
  defc('pt_heart', 6, 6, function (g) { heartP(0, 0, 4.6)(g); g.fillStyle = '#FF6F9F'; g.fill(); });
  defc('pt_dizzy', 7, 7, function (g) {
    g.strokeStyle = '#FFE27A'; g.lineWidth = 1.8; g.beginPath();
    for (var i = 0; i <= 30; i++) { var a = i / 30 * 3 * Math.PI, r = 0.6 + i * 0.18; if (i) g.lineTo(r * Math.cos(a), r * Math.sin(a)); else g.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    g.stroke();
  });
  defc('pt_snow', 4, 4, function (g) { dot(g, 0, 0, 3, 'rgba(255,255,255,0.95)'); });
  defc('pt_note', 7, 8, function (g) {
    line(g, 2, -6, 2, 3, 1.8, '#fff'); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-0.4, 3.6, 3, 2.3, -0.3, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(2, -6); g.quadraticCurveTo(6, -5, 5.5, -1.5); g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke();
  });
  defc('pt_shadow', 16, 6, function (g) { g.fillStyle = 'rgba(74,59,82,0.16)'; g.beginPath(); g.ellipse(0, 0, 15, 5, 0, 0, TAU); g.fill(); });

  /* ================= GATES ================= */
  var GCOL = { blue: '#3DB6FF', violet: '#9B6BFF', coral: '#FF5A6E', gold: '#FFC531' };
  S.gateColors = GCOL;
  function gatePanel(g, w, col) {
    var hw = w / 2;
    // translucent glass panel
    rr(g, -hw + 2, -22, w - 4, 46, 12); g.fillStyle = U.rgba(col, 0.78); g.fill();
    g.save(); rr(g, -hw + 2, -22, w - 4, 46, 12); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-hw, -22, w, 17);
    g.restore();
    rr(g, -hw + 2, -22, w - 4, 46, 12); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    // candy arch top bar
    body(g, pr(-hw + 1, -31, w - 2, 12, 6), col, { lw: 2.2, shade: dark(col, 0.25), hl: [-hw * 0.5, -28, hw * 0.3, 1.6, 0] });
    for (var i = 0; i < 5; i++) dot(g, -hw + 12 + i * (w - 24) / 4, -25, 1.8, '#fff');
  }
  [140, 92].forEach(function (w) {
    Object.keys(GCOL).forEach(function (k) { def('g_' + k + '_' + w, w, 62, w / 2, 34, function (g) { gatePanel(g, w, GCOL[k]); }); });
  });
  def('g_pillar', 22, 70, 11, 40, function (g) {
    var p = pr(-6, -34, 12, 58, 6);
    body(g, p, '#FFF6E0', { flat: true });
    g.save(); p(g); g.clip(); g.fillStyle = '#FFB6D3';
    for (var y = -44; y < 40; y += 12) { g.beginPath(); g.moveTo(-8, y); g.lineTo(8, y + 8); g.lineTo(8, y + 13); g.lineTo(-8, y + 5); g.closePath(); g.fill(); }
    g.restore(); outline(g, p, 2.2);
    body(g, pe(0, -35, 7.5, 7.5), '#FF8FB6', { lw: 2.2, hl: [-2.5, -38, 2.4, 1.4] });
  });
  def('g_fill', 60, 8, 30, 4, function (g) { rr(g, -30, -4, 60, 8, 4); g.fillStyle = 'rgba(74,59,82,0.35)'; g.fill(); });
  def('g_fill_on', 60, 8, 30, 4, function (g) { rr(g, -29, -3, 58, 6, 3); g.fillStyle = '#fff'; g.fill(); });
  defc('g_pop', 13, 13, function (g) {
    body(g, starP(0, 0, 11.5, 6, 8), '#FFF6C8', { lw: 2, flat: true });
    dot(g, 0, 0, 3.4, '#FF7AA8');
  });
  defc('g_spd', 13, 13, function (g) {
    var p = function (c) { c.beginPath(); c.moveTo(-9, -8); c.lineTo(0, 0); c.lineTo(-9, 8); c.lineTo(-4.5, 8); c.lineTo(4.5, 0); c.lineTo(-4.5, -8); c.closePath(); c.moveTo(0, -8); c.lineTo(9, 0); c.lineTo(0, 8); c.lineTo(4.5, 8); c.lineTo(13.5, 0); c.lineTo(4.5, -8); c.closePath(); };
    g.translate(-2, 0); body(g, p, '#FFF6C8', { lw: 2, flat: true });
  });
  defc('g_frown', 10, 10, function (g) {
    body(g, pe(0, 0, 8, 8), '#FFD0D6', { lw: 2, flat: true }); eyes(g, 0, -1.4, 2.8, 1.2); frown(g, 0, 2.6, 2.6, 1.4);
  });
  /* finish arch */
  def('g_finish', 330, 96, 165, 70, function (g) {
    // chequered line
    for (var i = 0; i < 20; i++) for (var j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#FF8FB6'; g.fillRect(-150 + i * 15, 4 + j * 8, 15, 8); }
    g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(-150, 4, 300, 16);
    // rainbow arch
    var cols = ['#FF7AA8', '#FFB05E', '#FFE27A', '#8FF0A8', '#7FC8FF', '#C29BFF'];
    g.lineCap = 'butt';
    g.lineWidth = 6 * cols.length + 5; g.strokeStyle = OL; g.beginPath(); g.ellipse(0, 12, 140, 62, 0, Math.PI, TAU); g.stroke();
    for (var k = 0; k < cols.length; k++) { g.strokeStyle = cols[k]; g.lineWidth = 6.4; g.beginPath(); g.ellipse(0, 12, 155 - k * 6, 77 - k * 6, 0, Math.PI, TAU); g.stroke(); }
    g.lineCap = 'round';
    // cloud feet
    g.save(); g.translate(-140, 10); body(g, cloudP(0.9), '#fff', { lw: 2, shade: '#E6DDF8' }); g.restore();
    g.save(); g.translate(140, 10); body(g, cloudP(0.9), '#fff', { lw: 2, shade: '#E6DDF8' }); g.restore();
    body(g, starP(0, -52, 13, 6, 5), '#FFE27A', { lw: 2.2, shade: '#FFC531' });
  });

  /* ================= BOSSES ================= */
  def('b_wobble', 150, 126, 75, 70, function (g) {
    body(g, jellyP(0, 44, 62, 100, 6), '#C9B0FF', { hl: [-28, -30, 17, 9], shade: '#A98BEA', lw: 3.5, sx: -4, sy: -6 });
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(0, 24, 44, 17, 0, 0, TAU); g.fill();
    dot(g, 30, -40, 4, 'rgba(255,255,255,0.55)'); dot(g, 38, -30, 2.4, 'rgba(255,255,255,0.55)');
    grumpFace(g, 0, -4, 19, 7.5, { mw: 13 });
    // tiny curl on top
    g.strokeStyle = OL; g.lineWidth = 7; g.beginPath(); g.arc(4, -60, 6, 2.2, 5.6); g.stroke();
    g.strokeStyle = '#C9B0FF'; g.lineWidth = 3; g.beginPath(); g.arc(4, -60, 6, 2.2, 5.6); g.stroke();
  });
  function bigShell(g, R) {
    body(g, pe(0, 0, R, R * 0.95), '#E07AC0', { hl: [-R * 0.42, -R * 0.52, R * 0.3, R * 0.16], shade: '#C45BA4', lw: 3.5, sx: -4, sy: -6 });
    g.strokeStyle = '#FFD0EE'; g.lineWidth = 7; g.beginPath();
    for (var i = 0; i <= 70; i++) { var a = i / 70 * 5 * Math.PI, r = 3 + i * (R * 0.78 / 70); var x = r * Math.cos(a), y = r * Math.sin(a) * 0.95; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    for (var k = 0; k < 6; k++) { var a2 = k * 1.05 + 0.3; dot(g, R * 0.86 * Math.cos(a2), R * 0.8 * Math.sin(a2), 3, '#FFF6A8'); }
  }
  def('b_snail', 160, 150, 80, 76, function (g) {
    g.save(); g.translate(0, -20); bigShell(g, 52); g.restore();
    // antennae + head with the face, in front of the shell
    line(g, -22, 22, -40, 2, 11); line(g, 22, 22, 40, 2, 11);
    line(g, -22, 22, -40, 2, 5.5, '#D9CCF2'); line(g, 22, 22, 40, 2, 5.5, '#D9CCF2');
    body(g, pe(-41, 0, 7, 7), '#FFE27A', { lw: 2.6, flat: true }); body(g, pe(41, 0, 7, 7), '#FFE27A', { lw: 2.6, flat: true });
    body(g, pe(0, 38, 38, 28), '#D9CCF2', { hl: [-17, 24, 11, 5], lw: 3.5, sx: -3, sy: -5 });
    grumpFace(g, 0, 33, 13.5, 5.6, { mw: 8 });
    body(g, function (c) { c.beginPath(); c.moveTo(0, 59); c.lineTo(-10, 53); c.lineTo(-10, 65); c.closePath(); c.moveTo(0, 59); c.lineTo(10, 53); c.lineTo(10, 65); c.closePath(); }, '#7FC8FF', { lw: 1.8, flat: true });
  });
  defc('b_snail_spin', 62, 60, function (g) { bigShell(g, 54); });
  defc('b_donut', 56, 56, function (g) {
    donut(g, 48, '#FF8FC0', '#EDBE7E', function (c) { grumpFace(c, 0, 14, 15, 5.6, { my: -1, mw: 9 }); }, 10);
  });
  def('b_puff', 170, 124, 85, 60, function (g) {
    // icicles
    for (var i = 0; i < 5; i++) { var x = -44 + i * 22; body(g, function (c) { c.beginPath(); c.moveTo(x - 7, 30); c.lineTo(x + 7, 30); c.lineTo(x, 52 + (i % 2) * 8); c.closePath(); }, '#BDEBFF', { lw: 2.5, flat: true }); }
    body(g, cloudP(3.1), '#F4FBFF', { hl: [-26, -34, 16, 8], shade: '#CFE6F7', lw: 3.5, sx: -4, sy: -6 });
    grumpFace(g, 0, 4, 20, 7.5, { mw: 12 });
    // frosty cheeks sparkles
    g.fillStyle = '#9AD3FA'; starP(-58, -8, 6, 2, 4)(g); g.fill(); starP(60, -14, 5, 1.6, 4)(g); g.fill(); starP(34, -44, 5, 1.6, 4)(g); g.fill();
  });
  function queen(g, happy) {
    // cape
    body(g, function (c) { c.beginPath(); c.moveTo(-50, -6); c.quadraticCurveTo(-78, 30, -66, 58); c.quadraticCurveTo(0, 44, 66, 58); c.quadraticCurveTo(78, 30, 50, -6); c.closePath(); }, '#7B4BE0', { lw: 3.5, shade: '#5E35BC', sx: 0, sy: -6 });
    for (var i = 0; i < 7; i++) dot(g, -56 + i * 18.6, 52 - Math.abs(i - 3) * -1.6, 3, '#FFE27A');
    body(g, jellyP(0, 46, 52, 92, 5), '#FF9DD6', { hl: [-24, -24, 14, 8], shade: '#E872B8', lw: 3.5, sx: -4, sy: -6 });
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(0, 28, 36, 14, 0, 0, TAU); g.fill();
    if (happy) {
      g.strokeStyle = OL; g.lineWidth = 4;
      g.beginPath(); g.arc(-17, 0, 7, Math.PI, TAU); g.stroke(); g.beginPath(); g.arc(17, 0, 7, Math.PI, TAU); g.stroke();
      smile(g, 0, 16, 10, 3.4); blush(g, 0, 12, 31, 5.5, 'rgba(255,90,150,0.5)');
    } else grumpFace(g, 0, -2, 17, 6.8, { mw: 11 });
    // crown
    g.save(); g.translate(0, -54); g.scale(2.7, 2.7);
    body(g, function (c) { c.beginPath(); c.moveTo(-9, 6); c.lineTo(-10, -4); c.lineTo(-5, 0.5); c.lineTo(0, -6.5); c.lineTo(5, 0.5); c.lineTo(10, -4); c.lineTo(9, 6); c.closePath(); }, '#FFD23F', { lw: 1.2, shade: '#F0A81E', sx: 0, sy: -2 });
    dot(g, 0, 2, 1.7, '#FF5A8A'); dot(g, -5.5, 2.6, 1.1, '#8FD8FF'); dot(g, 5.5, 2.6, 1.1, '#8FD8FF');
    dot(g, -10, -4.6, 1.3, '#FFF6C8'); dot(g, 0, -7, 1.3, '#FFF6C8'); dot(g, 10, -4.6, 1.3, '#FFF6C8');
    g.restore();
  }
  def('b_queen', 164, 150, 82, 80, function (g) { queen(g, false); });
  def('b_queen_happy', 164, 150, 82, 80, function (g) { queen(g, true); });
  ['b_wobble', 'b_snail', 'b_snail_spin', 'b_donut', 'b_puff', 'b_queen'].forEach(flash);
  defc('b_flower', 12, 16, function (g) {
    line(g, 0, 2, 0, 14, 2.4, '#4FAE5F');
    for (var i = 0; i < 5; i++) { var a = i * TAU / 5 - 1.57; body(g, pe(5 * Math.cos(a), -3 + 5 * Math.sin(a), 3.6, 3.6), '#FF9DC0', { lw: 1.2, flat: true }); }
    dot(g, 0, -3, 2.8, '#FFE27A');
  });
})();
