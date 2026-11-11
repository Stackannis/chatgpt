/* Pompom Parade - digit/symbol atlas (3 sizes x 3 colours), cached text sprites, HUD sprites and UI icons.
 * Gameplay never calls fillText per frame: numbers are blitted from the atlas. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, S = PP.sprites, H = S.h, TAU = Math.PI * 2;
  var OL = PP.cfg.OUTLINE;
  var FONT = 'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  var GLYPHS = '0123456789+-×÷%!./';
  var SIZES = [13, 20, 34];
  var COLORS = ['#FFFFFF', '#FFE27A', '#FFB3BC'];
  var AT = PP.atlas = {
    FONT: FONT, PLUS: 10, MINUS: 11, TIMES: 12, DIV: 13, PCT: 14, BANG: 15, DOT: 16, SLASH: 17,
    buf: new Int8Array(16), sets: [], texts: {}
  };

  AT.build = function () {
    var rs = S.rs;
    AT.sets = [];
    for (var si = 0; si < SIZES.length; si++) {
      var size = SIZES[si], pad = Math.ceil(size * 0.16) + 1, h = Math.ceil(size * 1.36);
      var probe = document.createElement('canvas').getContext('2d');
      probe.font = 'bold ' + size + 'px ' + FONT;
      var gx = [], gw = [], adv = [], x = 0;
      for (var i = 0; i < GLYPHS.length; i++) {
        var w = probe.measureText(GLYPHS[i]).width;
        adv.push(w * 0.94); gx.push(x); gw.push(w + pad * 2); x += Math.ceil(w + pad * 2) + 1;
      }
      var row = [];
      for (var ci = 0; ci < COLORS.length; ci++) {
        var c = document.createElement('canvas');
        c.width = Math.ceil(x * rs); c.height = Math.ceil(h * rs);
        var g = c.getContext('2d');
        g.scale(rs, rs);
        g.font = 'bold ' + size + 'px ' + FONT; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = Math.max(2.5, size * 0.2); g.strokeStyle = OL; g.fillStyle = COLORS[ci];
        for (var k = 0; k < GLYPHS.length; k++) {
          g.strokeText(GLYPHS[k], gx[k] + pad, h / 2 + size * 0.04);
          g.fillText(GLYPHS[k], gx[k] + pad, h / 2 + size * 0.04);
        }
        row.push(c);
      }
      AT.sets.push({ size: size, h: h, pad: pad, gx: gx, gw: gw, adv: adv, canv: row });
    }
    AT.texts = {};
  };

  /* write integer n into AT.buf with optional prefix/suffix glyph codes (-1 = none); returns length */
  AT.num = function (n, pre, post) {
    var b = AT.buf, len = 0, i;
    n = Math.floor(n < 0 ? -n : n);
    if (pre >= 0) b[len++] = pre;
    var start = len;
    if (n === 0) b[len++] = 0;
    else {
      while (n > 0 && len < 14) { b[len++] = n % 10; n = Math.floor(n / 10); }
      for (i = 0; i < (len - start) >> 1; i++) { var t = b[start + i]; b[start + i] = b[len - 1 - i]; b[len - 1 - i] = t; }
    }
    if (post >= 0) b[len++] = post;
    return len;
  };
  AT.copy = function (dst, len) { for (var i = 0; i < len; i++) dst[i] = AT.buf[i]; return len; };
  AT.width = function (buf, len, si, sc) {
    var a = AT.sets[si], w = 0;
    for (var i = 0; i < len; i++) w += a.adv[buf[i]];
    return w * (sc || 1);
  };
  /* draw glyph codes; (x,y) = anchor, align 0 left / 0.5 centre / 1 right, y = vertical centre */
  AT.draw = function (buf, len, x, y, si, ci, align, sc) {
    var a = AT.sets[si]; if (!a) return;
    sc = sc || 1;
    var rs = S.rs, ctx = PP.R.ctx, c = a.canv[ci || 0], i, w = 0;
    for (i = 0; i < len; i++) w += a.adv[buf[i]];
    var cx = x - w * sc * (align === undefined ? 0.5 : align);
    var hh = a.h * sc;
    for (i = 0; i < len; i++) {
      var k = buf[i];
      ctx.drawImage(c, a.gx[k] * rs, 0, a.gw[k] * rs, c.height, cx - a.pad * sc, y - hh / 2, a.gw[k] * sc, hh);
      cx += a.adv[k] * sc;
    }
    PP.R.draws += len;
  };
  AT.drawNum = function (n, x, y, si, ci, align, sc, pre, post) {
    var len = AT.num(n, pre === undefined ? -1 : pre, post === undefined ? -1 : post);
    AT.draw(AT.buf, len, x, y, si, ci, align, sc);
  };

  /* cached text sprite (localised words on canvas: rendered once, then blitted) */
  AT.text = function (str, size, fill, stroke) {
    var key = str + '|' + size + '|' + fill;
    var s = AT.texts[key];
    if (s) return s;
    var rs = S.rs, probe = document.createElement('canvas').getContext('2d');
    probe.font = 'bold ' + size + 'px ' + FONT;
    var lw = Math.max(3, size * 0.22);
    var w = Math.ceil(probe.measureText(str).width + lw * 2 + 4), h = Math.ceil(size * 1.5);
    var c = document.createElement('canvas');
    c.width = Math.ceil(w * rs); c.height = Math.ceil(h * rs);
    var g = c.getContext('2d');
    g.scale(rs, rs); g.font = 'bold ' + size + 'px ' + FONT; g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round';
    g.lineWidth = lw; g.strokeStyle = stroke || OL; g.strokeText(str, w / 2, h / 2);
    g.fillStyle = fill || '#fff'; g.fillText(str, w / 2, h / 2);
    s = AT.texts[key] = { c: c, w: w, h: h, ox: w / 2, oy: h / 2 };
    return s;
  };

  /* ================= HUD sprites ================= */
  var def = S.def, defc = S.defc, body = H.body, pe = H.pe, pr = H.pr, dot = H.dot, rr = H.rr;
  defc('h_pause', 22, 22, function (g) {
    body(g, pe(0, 0, 18.5, 18.5), '#FFFFFF', { lw: 2.2, shade: '#F3E3EE', hl: [-7, -9, 6, 3] });
    g.fillStyle = '#FF7AA8'; rr(g, -7.5, -8, 5.4, 16, 2.4); g.fill(); rr(g, 2.1, -8, 5.4, 16, 2.4); g.fill();
  });
  def('h_bar', 208, 18, 4, 9, function (g) {
    rr(g, -2, -7, 204, 14, 7); g.fillStyle = 'rgba(74,59,82,0.55)'; g.fill();
    rr(g, -2, -7, 204, 14, 7); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  });
  def('h_barfill', 200, 10, 0, 5, function (g) {
    rr(g, 0, -5, 200, 10, 5); g.fillStyle = '#FF8FB6'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, 3, -3.6, 194, 3, 1.5); g.fill();
  });
  def('h_meter', 208, 12, 4, 6, function (g) {
    rr(g, -2, -4.5, 204, 9, 4.5); g.fillStyle = 'rgba(74,59,82,0.5)'; g.fill();
    rr(g, -2, -4.5, 204, 9, 4.5); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  });
  def('h_meterfill', 200, 6, 0, 3, function (g) { rr(g, 0, -3, 200, 6, 3); g.fillStyle = '#FFE27A'; g.fill(); });
  defc('h_tick', 5, 7, function (g) { body(g, H.starP(0, 0, 5, 2.2, 4), '#fff', { lw: 1.2, flat: true }); });
  defc('h_gate', 5, 6, function (g) { g.fillStyle = '#fff'; rr(g, -4.4, -5, 8.8, 10, 2.5); g.fill(); g.fillStyle = '#3DB6FF'; rr(g, -3, -3.6, 6, 7.2, 1.6); g.fill(); });
  defc('h_bossico', 9, 9, function (g) {
    body(g, pe(0, 0, 7, 7), '#C29BFF', { lw: 1.6, flat: true });
    H.brows(g, 0, -3, 2.8, 1.8, 0.9, 1.3); dot(g, -2.6, -0.4, 1.1, OL); dot(g, 2.6, -0.4, 1.1, OL); H.frown(g, 0, 2.6, 2, 1.2);
  });
  def('h_badge', 52, 22, 26, 11, function (g) { body(g, pr(-23, -8.5, 46, 17, 8.5), '#FFFFFF', { lw: 2, flat: true }); });
  defc('h_star_on', 7, 7, function (g) { body(g, H.starP(0, 0.4, 5.6, 2.6, 5), '#FFD23F', { lw: 1.4, flat: true }); });
  defc('h_star_off', 7, 7, function (g) { body(g, H.starP(0, 0.4, 5.6, 2.6, 5), '#D9CFE0', { lw: 1.4, flat: true }); });
  def('h_bossbar', 268, 22, 4, 11, function (g) {
    rr(g, -2, -8, 264, 16, 8); g.fillStyle = 'rgba(74,59,82,0.6)'; g.fill();
    rr(g, -2, -8, 264, 16, 8); g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.stroke();
  });
  def('h_bossfill', 260, 12, 0, 6, function (g) {
    var gr = g.createLinearGradient(0, 0, 260, 0); gr.addColorStop(0, '#FF5A8A'); gr.addColorStop(1, '#C29BFF');
    rr(g, 0, -6, 260, 12, 6); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; rr(g, 3, -4.4, 254, 3.4, 1.7); g.fill();
  });
  defc('h_shield', 50, 50, function (g) {
    g.fillStyle = 'rgba(160,235,255,0.22)'; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(95,200,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 48.2, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-22, -27, 11, 5, -0.7, 0, TAU); g.fill();
  });
  function hand(g, fill) {
    body(g, function (c) {
      c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(0, -24, 4, -20); c.lineTo(4, -4);
      c.quadraticCurveTo(15, -6, 15, 4); c.lineTo(14, 13); c.quadraticCurveTo(12, 21, 2, 21);
      c.quadraticCurveTo(-8, 21, -10, 13); c.lineTo(-14, 3); c.quadraticCurveTo(-13, -2, -8, 2); c.lineTo(-4, 6); c.closePath();
    }, fill, { lw: 2.2, shade: U.dark(fill, 0.12), sx: -1.5, sy: -2 });
  }
  defc('h_hand', 20, 27, function (g) { g.globalAlpha = 0.95; hand(g, '#FFFFFF'); });
  defc('h_arrow', 16, 18, function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(-6, -14); c.lineTo(6, -14); c.lineTo(6, -1); c.lineTo(13, -1); c.lineTo(0, 14); c.lineTo(-13, -1); c.lineTo(-6, -1); c.closePath(); }, '#FFE27A', { lw: 2.4, shade: '#FFC531' });
  });
  defc('h_dash', 3, 6, function (g) { rr(g, -1.8, -5, 3.6, 10, 1.8); g.fillStyle = 'rgba(255,63,164,0.75)'; g.fill(); });
  def('h_banner', 320, 70, 160, 35, function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(-150, -22); c.lineTo(150, -22); c.lineTo(136, 0); c.lineTo(150, 22); c.lineTo(-150, 22); c.lineTo(-136, 0); c.closePath(); }, '#FF7AA8', { lw: 3, shade: '#E85A8C', sx: 0, sy: -5 });
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-140, -19, 280, 5);
  });
  defc('h_spark', 10, 10, function (g) { body(g, H.starP(0, 0, 8.5, 3, 4), '#FFF6C8', { lw: 1.6, flat: true }); });

  /* ================= UI icons (48 x 48, used by DOM menus + cards) ================= */
  function ico(name, fn) { defc(name, 24, 24, fn); }
  function burst(g, col, c2) { body(g, H.starP(0, 0, 19, 10.5, 8), col, { lw: 2.4, shade: c2 }); dot(g, 0, 0, 6, '#fff'); dot(g, 0, 0, 3.4, '#FF7AA8'); }
  function bubbleI(g, r) { body(g, pe(0, 0, r, r), '#BFF2FF', { lw: 2.2, shade: '#8FDDF5', hl: [-r * 0.4, -r * 0.45, r * 0.3, r * 0.17] }); }
  function miniPom(g, x, y, sc, sp) { g.save(); g.translate(x, y); g.scale(sc, sc); S.pompom(g, sp, 0, false); g.restore(); }
  ico('i_w_wand', function (g) {
    H.line(g, -14, 16, 2, -2, 7.5); H.line(g, -14, 16, 2, -2, 3.5, '#FF8FB6');
    g.strokeStyle = OL; g.lineWidth = 7; g.beginPath(); g.arc(8, -8, 8.5, 0, TAU); g.stroke();
    g.strokeStyle = '#5FE3FF'; g.lineWidth = 3.2; g.beginPath(); g.arc(8, -8, 8.5, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(170,240,255,0.6)'; g.beginPath(); g.arc(8, -8, 6.8, 0, TAU); g.fill();
    g.save(); g.translate(-9, -11); bubbleI(g, 5); g.restore(); g.save(); g.translate(15, 10); bubbleI(g, 3.6); g.restore();
  });
  ico('i_w_shaker', function (g) {
    g.rotate(-0.35);
    body(g, pr(-9, -6, 18, 24, 6), '#FFE9F2', { lw: 2.2, shade: '#F7C6DA' });
    body(g, pr(-10, -15, 20, 10, 4), '#FF8FB6', { lw: 2.2, shade: '#EE6B9B' });
    dot(g, -4, -10, 1.3, OL); dot(g, 0, -11.5, 1.3, OL); dot(g, 4, -10, 1.3, OL);
    var cols = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'];
    for (var i = 0; i < 7; i++) { g.save(); g.translate(-5 + (i * 4.3) % 11, 1 + (i * 5.7) % 13); g.rotate(i * 1.1); g.fillStyle = cols[i % 5]; rr(g, -2.4, -1, 4.8, 2, 1); g.fill(); g.restore(); }
    for (var k = 0; k < 4; k++) { g.save(); g.translate(-8 + k * 6, -21 - (k % 2) * 3); g.rotate(k); g.fillStyle = cols[(k + 2) % 5]; rr(g, -2.6, -1.1, 5.2, 2.2, 1.1); g.fill(); g.restore(); }
  });
  ico('i_w_gumball', function (g) {
    body(g, pr(-11, 6, 22, 13, 4), '#FF8FB6', { lw: 2.2, shade: '#EE6B9B' });
    body(g, pe(0, -5, 14, 14), '#DDF6FF', { lw: 2.2, shade: '#B5E6F8', hl: [-6, -11, 4, 2.2] });
    var cols = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'], pos = [[-6, 0], [1, 2], [7, -2], [-2, -6], [4, -8], [-7, -7]];
    for (var i = 0; i < pos.length; i++) { dot(g, pos[i][0], pos[i][1], 3.6, OL); dot(g, pos[i][0], pos[i][1], 2.7, cols[i % 5]); }
    body(g, pr(-4, 9.5, 8, 6, 2), '#FFE27A', { lw: 1.6, flat: true });
  });
  ico('i_w_star', function (g) {
    H.line(g, -15, 17, -1, 3, 7.5); H.line(g, -15, 17, -1, 3, 3.5, '#C29BFF');
    g.save(); g.translate(6, -6); body(g, H.starP(0, 0, 14, 6.6, 5, -1.2), '#FFD23F', { lw: 2.4, shade: '#F0A81E', hl: [-3, -4, 3, 1.6] }); g.restore();
    g.fillStyle = '#fff'; H.starP(-12, -12, 4.5, 1.4, 4)(g); g.fill(); H.starP(17, 12, 3.6, 1.2, 4)(g); g.fill();
  });
  ico('i_w_cookie', function (g) {
    body(g, function (c) {
      c.beginPath(); c.moveTo(-17, 8); c.quadraticCurveTo(-18, -14, 6, -17); c.quadraticCurveTo(14, -17, 14, -11);
      c.quadraticCurveTo(13, -6, 6, -6); c.quadraticCurveTo(-6, -5, -6, 8); c.quadraticCurveTo(-6, 15, -11.5, 15); c.quadraticCurveTo(-17, 15, -17, 8); c.closePath();
    }, '#D9A066', { lw: 2.4, shade: '#B97E48' });
    dot(g, -11, 3, 2, '#7A4A2E'); dot(g, -9, -7, 2, '#7A4A2E'); dot(g, 0, -11.5, 2, '#7A4A2E'); dot(g, 8, -11.5, 1.7, '#7A4A2E');
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(4, 6, 12, -0.3, 1.2); g.stroke();
    g.beginPath(); g.moveTo(9.5, 19); g.lineTo(8, 16.4); g.lineTo(11.5, 16); g.closePath(); g.fillStyle = '#fff'; g.fill();
  });
  ico('i_w_confetti', function (g) {
    g.rotate(0.6);
    body(g, function (c) { c.beginPath(); c.moveTo(0, 20); c.lineTo(-9, -4); c.lineTo(9, -4); c.closePath(); }, '#C29BFF', { lw: 2.4, shade: '#9B6BFF' });
    g.fillStyle = '#FFE27A'; g.beginPath(); g.moveTo(-6.2, 4); g.lineTo(6.2, 4); g.lineTo(4.6, 8.4); g.lineTo(-4.6, 8.4); g.fill();
    var cols = ['#FF7AA8', '#FFD23F', '#7CE38B', '#5FC8FF'];
    for (var i = 0; i < 9; i++) { g.save(); g.translate(-12 + (i * 7.3) % 24, -9 - (i * 4.1) % 12); g.rotate(i * 0.9); g.fillStyle = cols[i % 4]; rr(g, -2.6, -1.3, 5.2, 2.6, 1); g.fill(); g.restore(); }
  });
  ico('i_w_beam', function (g) {
    var cols = ['#FF7AA8', '#FFB05E', '#FFE27A', '#8FF0A8', '#7FC8FF', '#C29BFF'];
    g.lineCap = 'butt';
    g.strokeStyle = OL; g.lineWidth = 21; g.beginPath(); g.arc(0, 10, 13, Math.PI, TAU); g.stroke();
    for (var i = 0; i < 6; i++) { g.strokeStyle = cols[i]; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 10, 20.5 - i * 3, Math.PI, TAU); g.stroke(); }
    g.lineCap = 'round';
    body(g, pe(-13, 12, 7, 5), '#fff', { lw: 2, flat: true }); body(g, pe(13, 12, 7, 5), '#fff', { lw: 2, flat: true });
  });
  ico('i_up_power', function (g) { burst(g, '#FFE27A', '#FFC531'); });
  function paw(g) {
    body(g, pe(0, 5, 9.5, 8), '#FF8FB6', { lw: 2.2, shade: '#EE6B9B' });
    body(g, pe(-9.5, -4.5, 3.8, 4.8), '#FF8FB6', { lw: 2, flat: true }); body(g, pe(-3.3, -9.5, 3.8, 4.8), '#FF8FB6', { lw: 2, flat: true });
    body(g, pe(3.8, -9.5, 3.8, 4.8), '#FF8FB6', { lw: 2, flat: true }); body(g, pe(10, -4.5, 3.8, 4.8), '#FF8FB6', { lw: 2, flat: true });
  }
  ico('i_up_rate', function (g) {
    g.save(); g.translate(4, 0); paw(g); g.restore();
    H.line(g, -21, -6, -13, -6, 3, '#FFE27A'); H.line(g, -22, 2, -12, 2, 3, '#FFE27A'); H.line(g, -21, 10, -13, 10, 3, '#FFE27A');
  });
  ico('i_up_buddy', function (g) {
    miniPom(g, -4, 4, 1.25, 'bunny');
    body(g, function (c) { c.beginPath(); c.rect(11, -16, 4, 14); c.rect(6, -11, 14, 4); }, '#7CE38B', { lw: 2, flat: true });
  });
  ico('i_up_shield', function (g) { bubbleI(g, 17); body(g, H.starP(0, 1, 8, 3.6, 5), '#fff', { lw: 1.6, flat: true, ol: '#3D9EC0' }); });
  ico('i_up_luck', function (g) {
    g.save(); g.translate(-3, 2); S.paintButton(g, 13, '#FFD23F'); g.restore();
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.78; body(g, pe(12 + 4 * Math.cos(a), -11 + 4 * Math.sin(a), 3.6, 3.6), '#7CE38B', { lw: 1.5, flat: true }); }
  });
  ico('i_up_magnet', function (g) {
    g.scale(1.45, 1.45); g.translate(0, 1);
    var p = function (c) { c.beginPath(); c.moveTo(-10, -10); c.lineTo(-4, -10); c.lineTo(-4, 1); c.arc(0, 1, 4, Math.PI, 0, true); c.lineTo(4, -10); c.lineTo(10, -10); c.lineTo(10, 1); c.arc(0, 1, 10, 0, Math.PI); c.closePath(); };
    body(g, p, '#9B6BFF', { lw: 1.7, shade: '#7B4BE0' });
    g.fillStyle = '#FFE27A'; g.fillRect(-10, -10, 6, 4.5); g.fillRect(4, -10, 6, 4.5); H.outline(g, p, 1.7);
  });
  ico('i_card_pop', function (g) { burst(g, '#FFE27A', '#FFC531'); });
  ico('i_card_rate', function (g) {
    g.save(); g.translate(4, 0); paw(g); g.restore();
    H.line(g, -21, -6, -13, -6, 3, '#FFE27A'); H.line(g, -22, 2, -12, 2, 3, '#FFE27A'); H.line(g, -21, 10, -13, 10, 3, '#FFE27A');
  });
  ico('i_card_buddy', function (g) { miniPom(g, -9, 5, 1.0, 'chick'); miniPom(g, 9, 5, 1.0, 'mouse'); miniPom(g, 0, -4, 1.0, 'bunny'); });
  ico('i_card_pierce', function (g) {
    body(g, pe(-9, 0, 7, 7), '#C29BFF', { lw: 2, shade: '#9B6BFF' }); body(g, pe(8, 0, 7, 7), '#C29BFF', { lw: 2, shade: '#9B6BFF' });
    body(g, function (c) { c.beginPath(); c.moveTo(-21, -2.4); c.lineTo(12, -2.4); c.lineTo(12, -7.5); c.lineTo(22, 0); c.lineTo(12, 7.5); c.lineTo(12, 2.4); c.lineTo(-21, 2.4); c.closePath(); }, '#FFE27A', { lw: 2, flat: true });
  });
  ico('i_card_big', function (g) { g.save(); g.translate(2, -1); bubbleI(g, 16); g.restore(); g.save(); g.translate(-15, 14); bubbleI(g, 5); g.restore(); });
  ico('i_card_shield', function (g) { bubbleI(g, 17); body(g, H.starP(0, 1, 8, 3.6, 5), '#fff', { lw: 1.6, flat: true, ol: '#3D9EC0' }); });
  ico('i_card_lucky', function (g) {
    g.save(); g.translate(-6, 5); S.paintButton(g, 10, '#FF8FB6'); g.restore();
    g.save(); g.translate(7, 6); S.paintButton(g, 10, '#8FD8FF'); g.restore();
    g.save(); g.translate(0, -7); S.paintButton(g, 11, '#FFD23F'); g.restore();
  });
  ico('i_button', function (g) { S.paintButton(g, 17, '#FFD23F'); });
  ico('i_star', function (g) { body(g, H.starP(0, 1, 20, 9.5, 5), '#FFD23F', { lw: 2.6, shade: '#F0A81E', hl: [-5, -5, 4, 2] }); });
  ico('i_star_off', function (g) { body(g, H.starP(0, 1, 20, 9.5, 5), '#E3DAE8', { lw: 2.6, shade: '#CFC3D6' }); });
  ico('i_lock', function (g) {
    g.strokeStyle = OL; g.lineWidth = 8.5; g.beginPath(); g.arc(0, -5, 8, Math.PI, TAU); g.stroke();
    g.strokeStyle = '#D9CFE0'; g.lineWidth = 4; g.beginPath(); g.arc(0, -5, 8, Math.PI, TAU); g.stroke();
    body(g, pr(-13, -5, 26, 21, 5), '#C9B8D6', { lw: 2.4, shade: '#B19FC0' }); dot(g, 0, 4, 3, OL); H.line(g, 0, 4, 0, 10, 2.6);
  });
  ico('i_glove', function (g) { g.rotate(-0.25); hand(g, '#FFE9F2'); dot(g, 14, -14, 0, '#fff'); body(g, function (c) { c.beginPath(); c.rect(12, -22, 3.6, 12); c.rect(7.8, -17.8, 12, 3.6); }, '#7CE38B', { lw: 1.8, flat: true }); });
  ico('i_gateblue', function (g) {
    body(g, pr(-21, -12, 19, 26, 5), '#3DB6FF', { lw: 2.2, shade: '#2796DE' }); body(g, pr(2, -12, 19, 26, 5), '#FF5A6E', { lw: 2.2, shade: '#DE3F54' });
    g.fillStyle = '#fff'; g.fillRect(-15.5, -1.4, 8, 2.8); g.fillRect(-12.9, -4, 2.8, 8); g.fillRect(7.5, -1.4, 8, 2.8);
    g.save(); g.translate(-11.5, -21); g.scale(0.5, 0.5);
    body(g, function (c) { c.beginPath(); c.moveTo(-6, -14); c.lineTo(6, -14); c.lineTo(6, -1); c.lineTo(13, -1); c.lineTo(0, 14); c.lineTo(-13, -1); c.lineTo(-6, -1); c.closePath(); }, '#FFE27A', { lw: 3.5, flat: true });
    g.restore();
  });
  ico('i_arrowup', function (g) {
    body(g, function (c) { c.beginPath(); c.moveTo(-7, 17); c.lineTo(7, 17); c.lineTo(7, 0); c.lineTo(16, 0); c.lineTo(0, -18); c.lineTo(-16, 0); c.lineTo(-7, 0); c.closePath(); }, '#7CE38B', { lw: 2.6, shade: '#4FC466' });
  });
  ico('i_bridge', function (g) {
    var cols = ['#FF7AA8', '#FFE27A', '#8FF0A8', '#7FC8FF'];
    g.lineCap = 'butt'; g.strokeStyle = OL; g.lineWidth = 15; g.beginPath(); g.arc(0, 10, 13, Math.PI, TAU); g.stroke();
    for (var i = 0; i < 4; i++) { g.strokeStyle = cols[i]; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 10, 18 - i * 3.2, Math.PI, TAU); g.stroke(); }
    g.lineCap = 'round';
  });
  ico('i_flag', function (g) {
    H.line(g, -9, -17, -9, 18, 5.5); H.line(g, -9, -17, -9, 18, 2, '#fff');
    body(g, function (c) { c.beginPath(); c.moveTo(-8, -16); c.lineTo(15, -10); c.lineTo(-8, -1); c.closePath(); }, '#FF7AA8', { lw: 2.2, shade: '#E85A8C' });
  });

  /* logo (same title in FR and EN) */
  def('logo', 330, 130, 165, 65, function (g) {
    var words = ['Pompom', 'Parade'], cols = [['#FF7AA8', '#FFB05E', '#FFD23F', '#7CE38B', '#5FC8FF', '#C29BFF'], ['#C29BFF', '#5FC8FF', '#7CE38B', '#FFD23F', '#FFB05E', '#FF7AA8']];
    g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (var w = 0; w < 2; w++) {
      var size = w === 0 ? 58 : 50;
      g.font = 'bold ' + size + 'px ' + FONT;
      var total = 0, i, ws = [];
      for (i = 0; i < words[w].length; i++) { var cw = g.measureText(words[w][i]).width; ws.push(cw); total += cw; }
      var sc = Math.min(1, 300 / total), x = -total * sc / 2, y = w === 0 ? -28 : 30;
      for (var pass = 0; pass < 3; pass++) {
        var cx = x;
        for (i = 0; i < words[w].length; i++) {
          var ch = words[w][i], yy = y + Math.sin(i * 1.3 + w) * 3;
          g.save(); g.translate(cx + ws[i] * sc / 2, yy); g.scale(sc, sc); g.rotate(Math.sin(i * 2.1 + w * 2) * 0.07); g.textAlign = 'center';
          if (pass === 0) { g.lineWidth = 15; g.strokeStyle = OL; g.strokeText(ch, 0, 3); }
          else if (pass === 1) { g.lineWidth = 8; g.strokeStyle = '#fff'; g.strokeText(ch, 0, 0); }
          else { g.fillStyle = cols[w][i % 6]; g.fillText(ch, 0, 0); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText(ch, -1.2, -1.6); g.fillStyle = cols[w][i % 6]; g.fillText(ch, 0, 0.6); }
          g.restore(); cx += ws[i] * sc;
        }
      }
    }
  });
})();
