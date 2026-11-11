/* Pompom Parade - single-canvas renderer: logical 360 x H space, letterbox, DPR cap, sprite blits */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util;
  var R = PP.R = {
    canvas: null, ctx: null, ui: null, W: 360, H: 640, scale: 1, rs: 1, ready: false,
    shx: 0, shy: 0, draws: 0, left: 0, top: 0,
    /* layout of the DOM UI (see R.resize): uiScale = CSS px per UI unit (--u); land = landscape layout;
     * sideHud = pause button + counters live in the side bars (column narrower than 300 CSS px);
     * inset = safe-area insets in CSS px; hudTop = top inset over the canvas in logical units */
    uiScale: 1, land: false, sideHud: false, bars3: false, vw: 360, vh: 640, cssW: 360, cssH: 640,
    inset: { t: 0, r: 0, b: 0, l: 0 }, hudTop: 0, probe: null,
    MAX_PIXELS: 1.2e6, SIDE_HUD_BELOW: 300
  };
  var timer = 0;

  /* safe-area insets come from the CSS custom properties --sat/--sar/--sab/--sal (default: env(safe-area-inset-*)),
   * read through a hidden probe element so that tests can override them */
  function readInsets() {
    var o = R.inset;
    try {
      if (!R.probe) {
        R.probe = document.createElement('div');
        R.probe.id = 'sa-probe';
        R.probe.setAttribute('aria-hidden', 'true');
        (document.getElementById('stage') || document.body).appendChild(R.probe);
      }
      var cs = window.getComputedStyle(R.probe);
      o.t = parseFloat(cs.paddingTop) || 0; o.r = parseFloat(cs.paddingRight) || 0;
      o.b = parseFloat(cs.paddingBottom) || 0; o.l = parseFloat(cs.paddingLeft) || 0;
    } catch (e) { o.t = o.r = o.b = o.l = 0; }
    return o;
  }

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
    // a backing store above 1.2 MP is rendered at DPR 1.5 at most (fill-rate on high-DPR phones)
    if (dpr > 1.5 && Math.round(360 * rs) * Math.round(H * rs) > R.MAX_PIXELS) { dpr = 1.5; rs = Math.min(scale * dpr, 3); }
    R.H = H; R.scale = scale; R.rs = rs; R.dpr = dpr;
    R.left = (vw - cssW) / 2; R.top = (vh - cssH) / 2;
    var c = R.canvas;
    var bw = Math.round(360 * rs), bh = Math.round(H * rs);
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    c.style.left = R.left + 'px'; c.style.top = R.top + 'px';
    R.layoutUi(vw, vh, cssW, cssH);
    // sprite cache scale: quantised so small resizes do not trigger a rebuild
    var srs = U.clamp(Math.ceil(rs * 2 - 0.001) / 2, 1, 3);
    if (PP.sprites && PP.sprites.built && (force || srs !== PP.sprites.rs)) {
      if (srs !== PP.sprites.rs) PP.sprites.buildAll(srs);
    }
    R.spriteRs = srs;
    if (PP.run && PP.run.reframe) PP.run.reframe(H);   // fixed design frame: shifts the live run, never changes gameplay
    if (PP.game && PP.game.onResize) PP.game.onResize();
  };

  /* DOM UI layout. The gameplay canvas is always a portrait column; the DOM UI gets its own box and scale:
   *  - portrait (vw <= vh): screens sit exactly on the column, --u = canvas scale (1 px per unit at 360 x 640);
   *  - landscape (vw > vh): screens use the whole viewport with a 640 x 360 design frame (two-column layouts),
   *    --u = min(vw/640, vh/360), capped on big screens so that desktop UI does not become huge.
   * CSS variables on #ui: --u (UI unit), --cu (canvas unit), --cl/--ct/--cw/--ch (column box),
   * --sl/--st/--sw/--sh (screen box), --it/--ir/--ib/--il (safe-area insets that intrude into the screen box),
   * --hud-top (inset over the canvas HUD), --mgap (gap kept free for the column on the landscape menu). */
  R.layoutUi = function (vw, vh, cssW, cssH) {
    var ui = R.ui, scale = R.scale, ins = readInsets();
    var land = vw > vh;
    var u = land ? Math.min(vw / 640, vh / 360, Math.max(1.5, scale)) : scale;
    var barW = R.left, gapY = R.top;
    var it, ir, ib, il;
    if (land) { it = ins.t; ir = ins.r; ib = ins.b; il = ins.l; }
    else { it = Math.max(0, ins.t - gapY); ib = Math.max(0, ins.b - gapY); il = Math.max(0, ins.l - barW); ir = Math.max(0, ins.r - barW); }
    R.vw = vw; R.vh = vh; R.cssW = cssW; R.cssH = cssH;
    R.land = land; R.uiScale = u;
    R.hudTop = Math.max(0, ins.t - gapY) / scale;
    R.sideHud = cssW < R.SIDE_HUD_BELOW && barW - Math.max(ins.l, ins.r) >= 64;
    R.bars3 = land && barW - Math.max(ins.l, ins.r) >= Math.max(190, 180 * u);
    var st = ui.style;
    st.setProperty('--u', u + 'px');
    st.setProperty('--cu', scale + 'px');
    st.setProperty('--cl', R.left + 'px'); st.setProperty('--ct', R.top + 'px');
    st.setProperty('--cw', cssW + 'px'); st.setProperty('--ch', cssH + 'px');
    st.setProperty('--sl', (land ? 0 : R.left) + 'px'); st.setProperty('--st', (land ? 0 : R.top) + 'px');
    st.setProperty('--sw', (land ? vw : cssW) + 'px'); st.setProperty('--sh', (land ? vh : cssH) + 'px');
    st.setProperty('--it', it + 'px'); st.setProperty('--ir', ir + 'px');
    st.setProperty('--ib', ib + 'px'); st.setProperty('--il', il + 'px');
    st.setProperty('--hud-top', (R.hudTop * scale) + 'px');
    st.setProperty('--mgap', (R.bars3 ? cssW : 0) + 'px');
    var cl = ui.classList;
    cl.toggle('land', land); cl.toggle('port', !land);
    cl.toggle('sidehud', R.sideHud); cl.toggle('bars3', R.bars3);
    cl.toggle('short', (land ? vh : cssH) / u < 620);     // less than 620 UI units of height: compact result panels
    if (PP.hud && PP.hud.layout) PP.hud.layout();
    if (PP.ui && PP.ui.onLayout) PP.ui.onLayout();
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
