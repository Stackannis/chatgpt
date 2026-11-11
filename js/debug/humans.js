/* Pompom Parade - simulated-human player models (debug / test tooling only, never shipped in Playables).
 * Ported 1:1 from the round-1 gameplay review (review/gameplay/lib.js) so that balance is tuned and reported
 * against imperfect players, never against the perfect bot:
 *   bot     the autoplay bot as it is (its own 0.25 s reaction), best gate every time
 *   good    +0.15 s reaction, 12 u steering noise, finger speed 520 u/s, best gate 90 % of the time
 *   avg     +0.30 s reaction, 20 u noise, 420 u/s, best gate 75 %
 *   sloppy  +0.50 s reaction, 30 u noise, 330 u/s, best gate 50 %
 *   lazy    drifts around the centre (180 +- 45 u, 60 u/s), random gates
 *   badgates  like good, but always the worst gate
 * The model wraps the bot: the bot decides where it wants to be, the human gets there late, slowly and
 * inaccurately. Cards are picked at random (cfg.cards = 'bot' uses the bot's fixed order). Fully seeded. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, BOT = PP.bot;
  var H = PP.humans = { cfg: null, rng: null, buf: [], cur: 180, err: 0, gateRng: null, lazyT: 180, lazyN: 0, on: false };
  var origUpdate = BOT.update, origBest = PP.gates.best;

  function gauss(r) { return (r() + r() + r() + r() - 2) * 1.7; }

  H.PROFILES = {
    bot: { delay: 0, noise: 0, speed: 620, gates: 'best' },
    good: { delay: 0.15, noise: 12, speed: 520, gates: 'p', pBest: 0.9 },
    avg: { delay: 0.3, noise: 20, speed: 420, gates: 'p', pBest: 0.75 },
    sloppy: { delay: 0.5, noise: 30, speed: 330, gates: 'p', pBest: 0.5 },
    lazy: { lazy: true, lazyRange: 90, delay: 0, noise: 6, speed: 60, gates: 'random' },
    badgates: { delay: 0.15, noise: 12, speed: 520, gates: 'worst' }
  };

  H.install = function (cfg, seed) {
    var G = PP.G;
    H.cfg = cfg; H.rng = U.rng((seed >>> 0) || 1); H.gateRng = U.rng(((seed * 7) >>> 0) || 3);
    H.buf = []; H.cur = 180; H.err = 0; H.lazyT = 180; H.lazyN = 0; H.on = true;
    BOT.update = function (dt) {
      origUpdate(dt);
      var SQ = PP.squad;
      var raw = SQ.botX >= 0 ? SQ.botX : 180;
      H.buf.push([G.t, raw]);
      var target = raw;
      if (cfg.lazy) {
        H.lazyN -= dt; if (H.lazyN <= 0) { H.lazyN = 2 + H.rng() * 4; H.lazyT = 180 + (H.rng() - 0.5) * cfg.lazyRange; }
        target = H.lazyT;
      } else {
        var tt = G.t - cfg.delay, k = H.buf.length - 1;
        while (k > 0 && H.buf[k][0] > tt) k--;
        target = H.buf[k][1];
        if (H.buf.length > 200) H.buf.splice(0, 100);
      }
      H.err = H.err * 0.97 + gauss(H.rng) * cfg.noise * 0.15;
      var want = U.clamp(target + H.err, 42, 318);
      H.cur = U.approach(H.cur, want, cfg.speed * dt);
      SQ.botX = H.cur;
    };
    PP.gates.best = function (row, n) {
      var m = cfg.gates;
      if (m === 'best') return origBest(row, n);
      if (m === 'p') return H.gateRng() < cfg.pBest ? origBest(row, n) : Math.floor(H.gateRng() * row.n);
      if (m === 'random') return Math.floor(H.gateRng() * row.n);
      if (m === 'worst') { var b = 0, bs = 1e9; for (var k = 0; k < row.n; k++) { var s = PP.gates.score(row.g[k], n); if (s < bs) { bs = s; b = k; } } return b; }
      return origBest(row, n);
    };
  };
  H.uninstall = function () { BOT.update = origUpdate; PP.gates.best = origBest; H.on = false; };

  /* one headless run. kind: level number, or 'endless'. opt: {H, weapon, cfg, maxTime, toBoss, onStep}
   * returns the run result (+ helping tier, timeout flag) */
  H.run = function (L, prof, pname, seed, opt) {
    opt = opt || {};
    var G = PP.G, cfg = {}, src = H.PROFILES[pname] || H.PROFILES.good, k;
    for (k in src) if (src.hasOwnProperty(k)) cfg[k] = src[k];
    if (opt.cfg) for (k in opt.cfg) if (opt.cfg.hasOwnProperty(k)) cfg[k] = opt.cfg[k];
    var prevH = PP.headless, prevE = PP.headlessEvents, res;
    PP.headless = true; PP.headlessEvents = false;
    try {
      var endless = L === 'endless', def = endless ? null : PP.data.levels[L], base = seed || (def ? def.seed : 1);
      PP.run.start({ level: endless ? 1 : L, endless: endless, prof: prof, autoplay: true, god: false, seed: seed, tutorial: false, H: opt.H || 640, weapon: opt.weapon, toBoss: !!opt.toBoss });
      H.install(cfg, base + 17);
      var cr = U.rng(((base * 3 + 5) >>> 0)), max = Math.round(60 * (opt.maxTime || 400));
      for (var i = 0; i < max && !G.over; i++) {
        if (G.cards) { if (cfg.cards === 'bot') PP.bot.chooseCard(); else PP.cards.choose(cr() < 0.5 ? 0 : 1); }
        PP.run.step(1 / 60);
        if (opt.onStep) opt.onStep(i);
      }
      res = G.result || { win: false, stars: 0, progress: G.progress, time: G.t, endSquad: PP.squad.n, timeout: true, score: Math.floor(G.dist / 10), lost: G.lostTotal, buttons: G.buttonsRun, squadPeak: G.squadPeak };
      var out = {};
      for (k in res) if (res.hasOwnProperty(k)) out[k] = res[k];
      out.helping = G.helpTier; out.time = res.time !== undefined ? res.time : G.t;
      res = out;
    } finally { H.uninstall(); PP.run.stop(); PP.headless = prevH; PP.headlessEvents = prevE; }
    return res;
  };
})();
