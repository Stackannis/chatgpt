/* Pompom Parade - debug URL parameters (GDD 9), fps overlay, hitboxes and the window.__game test API */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util;
  var DBG = PP.debug = { hitbox: PP.params.hitbox === '1', fps: PP.params.fps === '1', el: null, t: 0, maxDraws: 0 };
  var P = PP.params;
  var WEAPONS = ['wand', 'shaker', 'gumball', 'star', 'cookie', 'confetti', 'beam'];

  function give(o) {
    var sv = PP.save.data, i;
    if (!o) return;
    if (o.buttons !== undefined) sv.buttons = Math.max(0, Math.floor(Number(o.buttons) || 0));
    if (o.unlock === 'all') { sv.unlocked = 30; sv.ended = 1; }
    else if (o.unlock) sv.unlocked = U.clamp(Math.floor(o.unlock), 1, 31);
    if (o.weapons === 'all') for (i = 0; i < WEAPONS.length; i++) sv.weapons[WEAPONS[i]].own = 1;
    PP.save.write();
  }

  /* applied once the save is loaded, before the menu shows */
  DBG.applyParams = function () {
    var sv = PP.save.data, d = PP.game.dbg, i;
    if (P.profile === 'expected') {
      var L = U.clamp(parseInt(P.level, 10) || sv.unlocked, 1, 30), prof = PP.econ.expectedProfile(L);
      prof.settings = sv.settings; prof.hints = sv.hints;
      PP.save.data = sv = prof;
    }
    if (P.unlockall === '1') give({ unlock: 'all', weapons: 'all' });
    if (P.buttons !== undefined) give({ buttons: P.buttons });
    if (P.upg) {
      var parts = P.upg.split(',');
      for (i = 0; i < parts.length; i++) {
        var kv = parts[i].split(':'), u = PP.data.upgradeById[kv[0]];
        if (u) sv.upg[kv[0]] = U.clamp(parseInt(kv[1], 10) || 0, 0, u.max);
      }
    }
    if (P.weapon && PP.data.weaponById[P.weapon]) { d.weapon = P.weapon; sv.weapons[P.weapon].own = 1; sv.equipped = P.weapon; }
    if (P.wlv) { d.wlv = U.clamp(parseInt(P.wlv, 10) || 1, 1, 5); if (d.weapon) sv.weapons[d.weapon].lv = d.wlv; else sv.weapons[sv.equipped].lv = d.wlv; }
    if (P.god === '1') d.god = true;
    if (P.autoplay === '1') d.autoplay = true;
    if (P.seed !== undefined) d.seed = (parseInt(P.seed, 10) || 0) >>> 0;
    if (P.squad) d.squad = U.clamp(parseInt(P.squad, 10) || 3, 1, 999);
    if (P.speed) PP.loop.speed = U.clamp(parseFloat(P.speed) || 1, 0.25, 8);
    if (P.tutorial === '0') { /* handled by the runner / tutorial */ }
  };
  function fakeResult(win) {
    var L = U.clamp(parseInt(P.level, 10) || 5, 1, 30);
    var res = { mode: 'level', level: L, win: win, stars: win ? 3 : 0, progress: win ? 1 : 0.62, endSquad: 14, squadPeak: 18, buttons: 23, time: 61, popped: 40, lucky: 1, score: 0, lost: 4, weapon: 'wand' };
    PP.game.lastView = { res: res, out: PP.econ.settle(res) };
  }
  DBG.afterReady = function () {
    var GM = PP.game;
    if (P.validate === '1') { var rep = PP.validator.run(); DBG.print('validator: ' + (rep.ok ? 'OK' : 'FAILED') + '\n' + rep.errors.concat(rep.warnings).join('\n')); window.__validate = rep; }
    if (P.balance === '1') { PP.balance.run({ runs: parseInt(P.runs, 10) || 1 }).then(function (r) { window.__balance = r; DBG.print(r.text); if (window.console) console.log(r.text); }); return; }
    if (P.screen) {
      if (P.screen === 'win' || P.screen === 'lose') { fakeResult(P.screen === 'win'); GM.goto(P.screen); }
      else if (P.screen === 'ending') { fakeResult(true); GM.lastView.res.level = 30; GM.goto('ending'); }
      else GM.goto(P.screen);
      return;
    }
    if (P.endless === '1') GM.startEndless({ force: true });
    else if (P.level) GM.startLevel(parseInt(P.level, 10) || 1, { force: true });
  };
  DBG.print = function (text) {
    var pre = document.getElementById('report');
    if (!pre) {
      pre = document.createElement('pre'); pre.id = 'report';
      pre.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;margin:0;padding:8px;overflow:auto;background:rgba(20,16,28,0.92);color:#fff;font:11px monospace;z-index:99;user-select:text;-webkit-user-select:text';
      document.body.appendChild(pre);
    }
    pre.textContent = text;
  };

  /* fps / entity overlay (?fps=1) - DOM, updated twice per second */
  DBG.frame = function () {
    if (PP.R.draws > DBG.maxDraws) DBG.maxDraws = PP.R.draws;
    if (!DBG.fps) return;
    var now = Date.now();
    if (now - DBG.t < 500) return;
    DBG.t = now;
    if (!DBG.el) { DBG.el = document.createElement('div'); DBG.el.id = 'dbg'; PP.ui.root.appendChild(DBG.el); }
    var G = PP.G, Q = PP.quality;
    DBG.el.textContent = 'fps ' + PP.loop.fps.toFixed(0) + '  ms ' + Q.avg.toFixed(1) + ' (work ' + Q.work.toFixed(1) + ')  q ' + Q.name + '/' + Q.level +
      '\nen ' + PP.enemies.pool.n + ' sh ' + (PP.shots.pool.n + PP.eshots.pool.n) + ' pt ' + PP.particles.pool.n + ' draws ' + PP.R.draws +
      '\nL ' + (G.levelId || G.mode) + ' t ' + G.t.toFixed(1) + ' n ' + PP.squad.n + ' x' + PP.loop.speed + ' rs ' + PP.R.rs.toFixed(2);
  };
  DBG.drawHitboxes = function () {
    var R = PP.R, ctx = R.ctx, G = PP.G, SQ = PP.squad, a = PP.enemies.pool.items, i;
    ctx.lineWidth = 1; ctx.strokeStyle = '#00E676';
    ctx.beginPath(); ctx.arc(SQ.x, G.sy, SQ.R, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,150,255,0.8)'; ctx.beginPath(); ctx.arc(SQ.x, G.sy, SQ.PR, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#FF1744';
    for (i = 0; i < PP.enemies.pool.n; i++) { ctx.beginPath(); ctx.arc(a[i].x, a[i].y, a[i].r, 0, 6.283); ctx.stroke(); }
    if (PP.boss.on) { ctx.beginPath(); ctx.ellipse(PP.boss.x, PP.boss.y, PP.boss.rx, PP.boss.ry, 0, 0, 6.283); ctx.stroke(); }
  };

  /* ---------------- window.__game ---------------- */
  function state() {
    var G = PP.G, GM = PP.game, SQ = PP.squad, BS = PP.boss, inRun = G.on && G.mode !== 'demo';
    var lr = GM.lastView ? { win: GM.lastView.res.win, stars: GM.lastView.res.stars, progress: GM.lastView.res.progress, buttons: GM.lastView.out.total } : null;
    return {
      screen: GM.screen, mode: inRun ? G.mode : 'menu', level: inRun ? G.levelId : 0, world: G.world || 1,
      t: inRun ? Math.round(G.t * 100) / 100 : 0, runLength: inRun && G.def ? G.def.length : 0, progress: inRun ? G.progress : 0,
      squad: inRun ? SQ.n : 0, squadX: Math.round(SQ.x * 10) / 10, squadPeak: inRun ? G.squadPeak : 0, stars: inRun && G.mode === 'level' ? PP.run.liveStars() : 0,
      buttonsRun: inRun ? G.buttonsRun : 0, buttonsTotal: PP.save.data ? PP.save.data.buttons : 0,
      enemies: { alive: PP.enemies.pool.n, popped: inRun ? G.popped : 0 },
      projectiles: PP.shots.pool.n + PP.eshots.pool.n, particles: PP.particles.pool.n,
      boss: BS.on ? { hp: Math.round(BS.hp), maxHp: BS.maxHp, phase: BS.phase } : null,
      weapon: SQ.weapon ? SQ.weapon.id : null, cardsPending: !!G.cards, paused: GM.paused, speed: PP.loop.speed,
      god: !!G.god, autoplay: !!G.autoplay, seed: G.seed, fps: Math.round(PP.loop.fps), quality: PP.quality.name,
      state: inRun ? G.state : '', over: !!G.over, distance: inRun ? Math.floor(G.dist / 10) : 0, draws: PP.R.draws, maxDraws: DBG.maxDraws,
      lang: PP.i18n.lang, lastResult: lr
    };
  }
  var API = window.__game = {
    version: PP.version,
    get ready() { return PP.game.isReady; },
    getState: state,
    startLevel: function (n, opts) { opts = opts || {}; if (opts.force === undefined) opts.force = true; return PP.game.startLevel(n, opts); },
    startEndless: function (opts) { opts = opts || {}; if (opts.force === undefined) opts.force = true; return PP.game.startEndless(opts); },
    goto: function (screen, params) {
      if ((screen === 'win' || screen === 'lose') && !PP.game.lastView) fakeResult(screen === 'win');
      PP.game.goto(screen, params);
    },
    setSpeed: function (k) { PP.loop.speed = U.clamp(Number(k) || 1, 0.25, 8); return PP.loop.speed; },
    setGod: function (b) { PP.game.dbg.god = !!b; PP.G.god = !!b; },
    setAutoplay: function (b) { PP.game.dbg.autoplay = !!b; PP.G.autoplay = !!b; if (b && PP.bot) PP.bot.reset(); if (b) PP.G.hold = false; },
    setSquad: function (n) { PP.squad.setCount(U.clamp(Math.floor(n), 1, 999)); },
    pause: function () { return PP.game.pause(); },
    resume: function () { return PP.game.resume(); },
    /* deterministic advance while paused (or running): n fixed steps, then one render */
    step: function (frames) {
      var G = PP.G, n = Math.max(1, Math.floor(frames || 1));
      for (var i = 0; i < n && G.on && !G.over; i++) { if (G.cards) break; PP.run.step(PP.loop.DT); }
      if (G.on) { PP.run.draw(); if (G.mode !== 'demo') PP.hud.draw(); }
      return state();
    },
    /* fast-simulate without rendering */
    skip: function (seconds) {
      var G = PP.G, n = Math.round((seconds || 1) * 60), i = 0;
      if (!G.on || G.mode === 'demo') return state();
      var wasCards = !!G.cards;
      PP.headless = true; PP.headlessEvents = true;
      try {
        for (; i < n && !G.over; i++) { if (G.cards) { if (PP.bot) PP.bot.chooseCard(); else PP.cards.choose(0); } PP.run.step(PP.loop.DT); }
      } finally { PP.headless = false; PP.headlessEvents = false; }
      if (wasCards && !G.cards && PP.game.screen === 'cards') { PP.ui.hide(); PP.game.screen = 'play'; }
      if (G.cards && PP.game.screen === 'play') PP.game.onCards();
      if (G.over && G.result && !PP.game.pending && PP.game.screen === 'play') PP.game.onRunEnd(G.result);
      return state();
    },
    chooseCard: function (i) { return PP.game.chooseCard(i); },
    forceWin: function () { if (PP.G.on && !PP.G.over && PP.G.mode !== 'demo') PP.run.finish(true); },
    forceLose: function () { if (PP.G.on && !PP.G.over && PP.G.mode !== 'demo') PP.run.finish(false); },
    give: give,
    getSave: function () { return JSON.parse(JSON.stringify(PP.save.data)); },
    resetSave: function () { return PP.save.reset().then(function () { PP.ui.applySettings(); if (PP.game.isReady) PP.game.goto('menu'); return true; }); },
    events: PP.events.buf,
    on: function (type, cb) { PP.events.on(type, cb); },
    validateLevels: function () { return PP.validator.run(); },
    runBalance: function (opts) { return PP.balance.run(opts); },
    simLevel: function (L, o) { return PP.balance.simLevel(L, o); },
    expectedProfile: function (L) { return PP.econ.expectedProfile(L); }
  };
})();
