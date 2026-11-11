/* Pompom Parade - single-canvas renderer: logical 360 x H space, letterbox, DPR cap, sprite blits */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util;
  var R = PP.R = {
    canvas: null, ctx: null, ui: null, W: 360, H: 640, scale: 1, rs: 1, ready: false,
    shx: 0, shy: 0, draws: 0, left: 0, top: 0
  };
  var timer = 0;

  R.init = function () {
    R.canvas = document.getElementById('game');
    R.ui = document.getElementById('ui');
    R.ctx = R.canvas.getContext('2d', { alpha: false });
    R.resize(true);
    R.ready = true;
    var deb = function () { clearTimeout(timer); timer = setTimeout(function () { R.resize(false); }, 100); };
    window.addEventListener('resize', deb);
    window.addEventListener('orientationchange', deb);
  };

  R.resize = function (force) {
    var vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 360);
    var vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 640);
    var H = U.clamp(360 * vh / vw, 600, 780);
    var scale = Math.min(vw / 360, vh / H);
    var cssW = 360 * scale, cssH = H * scale;
    var dpr = Math.min(window.devicePixelRatio || 1, PP.quality.dprCap);
    var rs = Math.min(scale * dpr, 3);
    R.H = H; R.scale = scale; R.rs = rs;
    R.left = (vw - cssW) / 2; R.top = (vh - cssH) / 2;
    var c = R.canvas;
    var bw = Math.round(360 * rs), bh = Math.round(H * rs);
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    c.style.left = R.left + 'px'; c.style.top = R.top + 'px';
    var ui = R.ui;
    ui.style.width = cssW + 'px'; ui.style.height = cssH + 'px';
    ui.style.left = R.left + 'px'; ui.style.top = R.top + 'px';
    ui.style.setProperty('--u', scale + 'px');
    // sprite cache scale: quantised so small resizes do not trigger a rebuild
    var srs = U.clamp(Math.ceil(rs * 2 - 0.001) / 2, 1, 3);
    if (PP.sprites && PP.sprites.built && (force || srs !== PP.sprites.rs)) {
      if (srs !== PP.sprites.rs) PP.sprites.buildAll(srs);
    }
    R.spriteRs = srs;
    if (PP.G && PP.G.on) { PP.G.H = H; PP.G.sy = H - 110; }
    if (PP.game && PP.game.onResize) PP.game.onResize();
  };

  R.toLogicalX = function (clientX) { return (clientX - R.left) / R.scale; };
  R.toLogicalY = function (clientY) { return (clientY - R.top) / R.scale; };

  R.begin = function () {
    var k = R.rs;
    R.ctx.setTransform(k, 0, 0, k, k * R.shx, k * R.shy);
    R.ctx.globalAlpha = 1;
    R.draws = 0;
  };
  R.draw = function (s, x, y) {
    R.ctx.drawImage(s.c, x - s.ox, y - s.oy, s.w, s.h); R.draws++;
  };
  R.drawS = function (s, x, y, sc) {
    R.ctx.drawImage(s.c, x - s.ox * sc, y - s.oy * sc, s.w * sc, s.h * sc); R.draws++;
  };
  /* scaled / rotated blit */
  R.drawX = function (s, x, y, sx, sy, rot) {
    var k = R.rs, ctx = R.ctx;
    if (rot) {
      var c = Math.cos(rot), n = Math.sin(rot);
      ctx.setTransform(k * sx * c, k * sx * n, -k * sy * n, k * sy * c, k * (x + R.shx), k * (y + R.shy));
    } else ctx.setTransform(k * sx, 0, 0, k * sy, k * (x + R.shx), k * (y + R.shy));
    ctx.drawImage(s.c, -s.ox, -s.oy, s.w, s.h);
    ctx.setTransform(k, 0, 0, k, k * R.shx, k * R.shy);
    R.draws++;
  };
  /* stretched blit into a destination rect (bars, beams, lane stripes) */
  R.drawR = function (s, x, y, w, h) { R.ctx.drawImage(s.c, x, y, w, h); R.draws++; };
  /* cropped blit: frac of the sprite width (progress bars) */
  R.drawCrop = function (s, x, y, frac) {
    if (frac <= 0) return;
    if (frac > 1) frac = 1;
    var sw = Math.max(1, Math.round(s.c.width * frac));
    R.ctx.drawImage(s.c, 0, 0, sw, s.c.height, x - s.ox, y - s.oy, s.w * (sw / s.c.width), s.h); R.draws++;
  };
  R.alpha = function (a) { R.ctx.globalAlpha = a; };
})();
