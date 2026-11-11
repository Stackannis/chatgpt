/* Pompom Parade - application shell: boot/splash, screen flow, pause rules, run lifecycle */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util;
  var GM = PP.game = {
    screen: 'boot', paused: false, hidden: false, busy: false, isReady: false, lastStart: null, lastView: null,
    bootI: 0, bootT: 0, saveReady: false, firstFrame: false, pending: null, dbg: {}, noteT: 0
  };
  var SPLASH = ['pom_pip_0', 'pom_pip_1', 'logo', 'h_bar', 'h_barfill', 'pt_heart', 'pt_spark', 'pt_star', 'pt_snow', 'pt_conf_1'];

  GM.boot = function () {
    PP.quality.init();
    PP.R.init();
    PP.ui.init();
    PP.input.init();
    PP.sprites.rs = PP.R.spriteRs;
    PP.sprites.buildNames(SPLASH);
    PP.bg.setWorld(1);
    PP.audio.setPlatformEnabled(PP.platform.isAudioEnabled());
    PP.platform.onAudioEnabledChange(function (on) { PP.audio.setPlatformEnabled(on); });
    PP.platform.onPause(function () { GM.onPlatformPause(); });
    PP.platform.onResume(function () { GM.onPlatformResume(); });
    PP.save.load().then(function () { return PP.i18n.resolve(PP.save.data.settings.lang); })
      .then(function () { GM.saveReady = true; }, function () { GM.saveReady = true; });
    PP.events.emit('boot', { version: PP.version });
    PP.loop.start();
  };

  function bootFrame(dt) {
    var R = PP.R, spr = PP.spr, S = PP.sprites;
    GM.bootT += dt;
    R.begin();
    PP.bg.draw(GM.bootT * 40);
    var b = Math.abs(Math.sin(GM.bootT * 5));
    R.drawX(spr.logo, 180, R.H * 0.3, 0.92, 0.92, 0);
    R.drawX(spr.pom_pip_0, 180, R.H * 0.56 - b * 26, 2.6 * (1 + 0.08 * (1 - b)), 2.6 * (1 - 0.08 * (1 - b)), 0);
    var total = S.count(), frac = GM.bootI / total;
    R.draw(spr.h_bar, 80, R.H * 0.7);
    if (frac > 0) R.ctx.drawImage(spr.h_barfill.c, 0, 0, Math.max(1, spr.h_barfill.c.width * frac), spr.h_barfill.c.height, 80, R.H * 0.7 - 5, 200 * frac, 10);
    if (!GM.firstFrame) { GM.firstFrame = true; PP.platform.firstFrameReady(); return; }   // splash visible
    if (GM.bootI < total) GM.bootI = S.buildRange(GM.bootI, 40);
    else if (GM.saveReady && !GM.isReady) { S.finish(); GM.ready(); }
  }

  GM.ready = function () {
    GM.isReady = true;
    PP.ui.applySettings();
    PP.debug.applyParams();
    GM.goto('menu');
    PP.platform.gameReady();                     // main menu is interactive
    PP.events.emit('ready', {});
    PP.debug.afterReady();
  };

  function nextLevel() { return Math.min(30, PP.save.data.unlocked); }
  function ensureDemo() {
    var G = PP.G, n = nextLevel();
    if (G.on && G.mode === 'demo' && G.world === PP.bal.world(n)) return;
    PP.run.start({ demo: true, level: n, world: PP.bal.world(n), tutorial: false, seed: 12345 });
  }

  GM.goto = function (name, params) {
    params = params || {};
    GM.pending = null;
    if (name === 'win' || name === 'lose') {
      if (!GM.lastView) { GM.goto('menu'); return; }
      ensureDemo();
      GM.screen = name; PP.ui.show(name, { res: GM.lastView.res, out: GM.lastView.out, again: true });
      return;
    }
    if (name === 'ending') {
      PP.run.stop(); PP.ui.hint(null);
      GM.screen = 'ending';
      PP.ending.start(function () {
        if (GM.lastView && GM.lastView.res.level === 30 && GM.lastView.res.win) { ensureDemo(); GM.screen = 'win'; PP.ui.show('win', { res: GM.lastView.res, out: GM.lastView.out }); }
        else GM.goto('map');
      });
      return;
    }
    if (name !== 'menu' && name !== 'map' && name !== 'shop' && name !== 'settings') name = 'menu';
    if (GM.paused) { GM.paused = false; PP.audio.resume(); }
    PP.ui.hint(null);
    ensureDemo();
    GM.screen = name;
    if (name === 'shop' && !params.from) params.from = 'menu';
    PP.ui.show(name, params);
    PP.audio.music(PP.bal.world(nextLevel()), false);
  };

  function runOpts(extra) {
    var d = GM.dbg, o = {};
    if (d.god) o.god = true;
    if (d.autoplay) o.autoplay = true;
    if (d.seed !== undefined) o.seed = d.seed;
    if (d.squad) o.squad = d.squad;
    if (d.weapon) o.weapon = d.weapon;
    if (d.wlv) o.wlv = d.wlv;
    if (PP.params.tutorial === '0') o.tutorial = false;
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    return o;
  }
  function begin(o) {
    PP.ui.hide(); PP.ui.hint(null);
    GM.pending = null;
    if (GM.paused) { GM.paused = false; }
    PP.audio.resume();
    PP.run.start(o);
    PP.hud.onStart();
    PP.loop.acc = 0;
    GM.screen = 'play';
    PP.audio.music(PP.G.world, false);
  }
  GM.startLevel = function (n, opts) {
    opts = opts || {};
    n = U.clamp(Math.floor(n) || 1, 1, 30);
    if (!GM.isReady) return false;
    if (n > PP.save.data.unlocked && !opts.force && !PP.debugSession) return false;
    var o = runOpts(opts); o.level = n;
    GM.lastStart = { level: n, opts: opts };
    begin(o);
    return true;
  };
  GM.startEndless = function (opts) {
    opts = opts || {};
    if (!GM.isReady) return false;
    if (!PP.save.endlessUnlocked() && !opts.force && !PP.debugSession) return false;
    var o = runOpts(opts); o.endless = true;
    GM.lastStart = { endless: true, opts: opts };
    begin(o);
    return true;
  };
  GM.restart = function () {
    var l = GM.lastStart;
    if (!l) { GM.goto('menu'); return; }
    if (l.endless) GM.startEndless(l.opts); else GM.startLevel(l.level, l.opts);
  };
  GM.quitToMap = function () {
    var endless = PP.G.mode === 'endless';
    PP.run.stop();
    GM.goto(endless ? 'menu' : 'map');
  };

  /* ---- pause: stops simulation, input, audio (suspend) and rendering; never auto-resumes ---- */
  GM.pause = function () {
    if (GM.paused || (GM.screen !== 'play' && GM.screen !== 'cards')) return false;
    GM.paused = true;
    PP.input.reset();
    PP.audio.pause();
    PP.save.flush();
    GM.screen = 'pause';
    PP.ui.show('pause');
    return true;
  };
  GM.resume = function () {
    if (!GM.paused) return false;
    GM.paused = false;
    PP.audio.resume();
    PP.loop.acc = 0; PP.input.reset();
    if (PP.G.cards) { GM.screen = 'cards'; PP.ui.show('cards'); }
    else { PP.ui.hide(); GM.screen = 'play'; }
    return true;
  };
  GM.autoPause = function () { if (PP.params.nopause !== '1') GM.pause(); };
  GM.onPlatformPause = function () {
    GM.hidden = true;
    if (!GM.pause()) { PP.audio.pause(); if (PP.save.loaded) PP.save.flush(); }
  };
  GM.onPlatformResume = function () {
    GM.hidden = false;
    PP.loop.acc = 0;
    if (!GM.paused) PP.audio.resume();          // gameplay stays on the pause screen until the player taps Resume
  };

  /* ---- run callbacks ---- */
  GM.onCards = function () { GM.screen = 'cards'; PP.audio.sfx('card'); PP.ui.show('cards'); };
  GM.chooseCard = function (i) {
    if (!PP.G.cards) return false;
    PP.cards.choose(i);
    PP.tut.done('cards');
    PP.save.write();
    PP.audio.sfx('pickup');
    if (!GM.paused) { PP.ui.hide(); GM.screen = 'play'; PP.loop.acc = 0; }
    return true;
  };
  GM.onBossIntro = function () { PP.audio.music(PP.G.world, true); };
  GM.onBossEnd = function () { PP.audio.music(PP.G.world, false); };
  GM.onRunEnd = function (res) {
    var out = PP.econ.settle(res);
    GM.lastView = { res: res, out: out };
    PP.ui.hint(null);
    PP.audio.music(0);
    if (res.win) {
      PP.audio.sfx('win'); PP.fx.vibrate([30, 40, 30]);
      PP.fx.confetti(180, PP.G.sy - 120, 40, 380);
      if (res.level === 30 && out.firstClear) GM.pending = { name: 'ending', t: 1.2 };
      else GM.pending = { name: 'win', t: 0.7 };
    } else {
      PP.audio.sfx('lose');
      GM.pending = { name: 'lose', t: 0.5 };
    }
  };

  /* ---- input ---- */
  GM.onPointerDown = function (x, y) {
    if (GM.screen === 'play' && !GM.paused && PP.hud.hitPause(x, y)) { GM.pause(); return; }
    if (GM.screen === 'ending') PP.ending.next();
  };
  GM.onKey = function (key) {
    if (!GM.isReady) return;
    if (GM.screen === 'play') { if (key === 'esc' || key === 'p') GM.pause(); return; }
    PP.ui.key(key);
  };
  GM.onResize = function () { /* state is kept; the HUD is laid out in logical units */ };

  /* ---- per-frame ---- */
  GM.frame = function (delta) {
    if (GM.hidden || GM.busy) return;
    if (GM.screen === 'boot') { bootFrame(delta); return; }
    if (GM.paused) return;
    if (GM.screen === 'ending') { PP.ending.frame(delta); PP.debug.frame(); return; }
    var G = PP.G, L = PP.loop;
    if (!G.on) return;
    if (G.mode === 'demo') {
      PP.squad.botX = 180 + 96 * Math.sin(G.t * 0.55);
      var sp = L.speed; L.speed = 1; L.advance(delta, PP.run.step); L.speed = sp;
      GM.noteT -= delta;
      if (GM.noteT <= 0) { GM.noteT = 0.5; PP.fx.note(PP.squad.x + (Math.random() - 0.5) * 60, G.sy - 30); }
    } else if (!G.over) {
      if (G.cards) { if (G.autoplay) { PP.bot.chooseCard(); PP.ui.hide(); GM.screen = 'play'; } }
      else L.advance(delta, PP.run.step);
    }
    PP.fx.update(delta);
    PP.bg.update(delta, G.scroll);
    PP.run.draw();
    if (G.mode !== 'demo') { PP.hud.draw(); PP.tut.draw(delta); }
    if (GM.pending) {
      GM.pending.t -= delta;
      if (GM.pending.t <= 0) {
        var p = GM.pending; GM.pending = null;
        if (p.name === 'ending') GM.goto('ending');
        else { GM.screen = p.name; PP.ui.show(p.name, { res: GM.lastView.res, out: GM.lastView.out }); }
      }
    }
    PP.debug.frame();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GM.boot); else GM.boot();
})();
