/* Pompom Parade - canvas HUD (drawImage only): pause button, progress bar with gate/boss marks,
 * Buttons counter, Sparkle Meter, squad badge with live star ticks, boss HP bar, banners. */
(function () {
  'use strict';
  var PP = window.PP;
  var HUD = PP.hud = { marks: new Float32Array(12), nMarks: 0, bossMark: -1, PAUSE: { x: 8, y: 48, w: 46, h: 46 } };
  var BX = 66, BY = 62, BW = 200;

  /* precompute the gate marks of the level's progress bar */
  HUD.onStart = function () {
    var G = PP.G, def = G.def;
    HUD.nMarks = 0; HUD.bossMark = -1;
    if (!def) return;
    var travel = (G.sy + 60) / G.scrollBase, total = G.len + travel;
    for (var i = 0; i < def.beats.length && HUD.nMarks < 12; i++) {
      var b = def.beats[i];
      if (b[1] === 'gates') HUD.marks[HUD.nMarks++] = G.isBoss ? 0.6 * Math.min(1, (b[0] + travel) / G.len) : (b[0] + travel) / total;
    }
    if (G.isBoss) HUD.bossMark = 0.6;
  };
  function cropFill(s, x, y, w, h, frac) {
    if (frac <= 0) return;
    if (frac > 1) frac = 1;
    var R = PP.R, c = s.c;
    R.ctx.drawImage(c, 0, 0, Math.max(1, c.width * frac), c.height, x, y - h / 2, w * frac, h); R.draws++;
  }

  HUD.draw = function () {
    var G = PP.G, R = PP.R, spr = PP.spr, AT = PP.atlas, SQ = PP.squad, BS = PP.boss, ctx = R.ctx, i;
    if (!G.on || G.mode === 'demo') return;
    var k = R.rs;
    ctx.setTransform(k, 0, 0, k, 0, 0);   // the HUD does not shake
    ctx.globalAlpha = 1;
    // --- squad badge (count + star ticks) ---
    if (SQ.n > 0 && G.state !== 'bridge') {
      var bx = SQ.x, by = G.sy - SQ.VR - 24;
      if (by < 110) by = 110;
      R.draw(spr.h_badge, bx, by);
      AT.drawNum(SQ.n, bx, by, 0, 0, 0.5, 1, SQ.n > 30 ? AT.TIMES : -1, -1);
      if (G.mode === 'level') {
        R.draw(SQ.n >= G.star2 ? spr.h_star_on : spr.h_star_off, bx - 8, by - 13);
        R.draw(SQ.n >= G.star3 ? spr.h_star_on : spr.h_star_off, bx + 8, by - 13);
      }
      if (SQ.frenzy > 0 && (SQ.frenzy > 1 || ((G.t * 8) | 0) % 2)) R.drawS(spr.k_frenzy, bx - 38, by, 0.8);
      if (SQ.magnet > 0 && (SQ.magnet > 1 || ((G.t * 8) | 0) % 2)) R.drawS(spr.k_magnet, bx + 38, by, 0.8);
      if (G.helping > 0 && G.t < 2.5) { R.drawS(spr.i_glove, bx - 20, by - 34, 0.6); AT.drawNum(G.helping, bx + 6, by - 34, 1, 1, 0.5, 1, AT.PLUS, -1); }
    }
    // --- top row ---
    R.draw(spr.h_pause, 31, 71);
    var bossBar = BS.on && G.state !== 'bossintro';
    if (bossBar) {
      R.draw(spr.h_bar, BX, BY);
      cropFill(spr.h_bossfill, BX, BY, BW, 10, BS.hp / BS.maxHp);
      R.drawS(spr[BS.type === 2 ? 'b_snail' : (BS.type === 1 ? 'b_wobble' : (BS.type === 3 ? 'b_donut' : (BS.type === 4 ? 'b_puff' : 'b_queen')))], BX - 2, BY + 2, 0.24);
    } else if (G.mode === 'level') {
      R.draw(spr.h_bar, BX, BY);
      cropFill(spr.h_barfill, BX, BY, BW, 10, G.progress);
      for (i = 0; i < HUD.nMarks; i++) if (HUD.marks[i] <= 1) R.draw(spr.h_gate, BX + HUD.marks[i] * BW, BY);
      if (HUD.bossMark >= 0) R.draw(spr.h_bossico, BX + HUD.bossMark * BW, BY); else R.drawS(spr.i_flag, BX + BW - 1, BY - 3, 0.42);
      R.drawS(spr.pom_pip_0, BX + G.progress * BW, BY + 3, 0.55);
    } else {
      // endless: distance in metres
      R.drawS(spr.i_flag, BX + 54, BY, 0.5);
      AT.drawNum(Math.floor(G.dist / 10), BX + 70, BY, 1, 0, 0, 1);
    }
    if ((G.mode === 'level' && G.L >= 5 && G.meterTotal > 0) || G.mode === 'endless') {
      R.draw(spr.h_meter, BX, BY + 15);
      cropFill(spr.h_meterfill, BX, BY + 15, BW, 6, PP.cards.meterFrac());
      if (G.mode === 'level') { R.draw(spr.h_tick, BX + BW * 0.5, BY + 15); R.draw(spr.h_tick, BX + BW - 2, BY + 15); }
      else R.draw(spr.h_tick, BX + BW - 2, BY + 15);
    }
    // Buttons counter (top right)
    var len = AT.num(G.buttonsRun, -1, -1), w = AT.width(AT.buf, len, 1, 1);
    AT.draw(AT.buf, len, 352, BY, 1, 1, 1, 1);
    R.drawS(spr.k_button, 352 - w - 12, BY, 1.15);
    // --- banners ---
    if (G.banner > 0) {
      var p = 1.5 - G.banner, sc = p < 0.2 ? p / 0.2 * 1.15 : (p < 0.3 ? 1.15 - (p - 0.2) : 1.05);
      if (G.banner < 0.25) ctx.globalAlpha = G.banner / 0.25;
      R.drawX(spr.h_banner, 180, 210, sc, sc, 0);
      var ts = AT.text(PP.t('hud.boss'), 34, '#FFFFFF');
      R.drawX(ts, 180, 210, sc, sc, 0);
      ctx.globalAlpha = 1;
    } else if (G.mode === 'level' && G.t < 1.8 && !G.hold) {
      var a = G.t < 1.3 ? 1 : (1.8 - G.t) / 0.5, sc2 = G.t < 0.2 ? G.t / 0.2 : 1;
      ctx.globalAlpha = a;
      var tl = AT.text(PP.t('hud.level', { n: G.levelId }), 30, '#FFFFFF');
      R.drawX(tl, 180, 170, sc2, sc2, 0);
      ctx.globalAlpha = 1;
    }
    if (PP.debug && PP.debug.hitbox) PP.debug.drawHitboxes();
  };

  HUD.hitPause = function (x, y) { var p = HUD.PAUSE; return x >= p.x - 4 && x <= p.x + p.w + 6 && y >= p.y - 6 && y <= p.y + p.h + 6; };
})();
