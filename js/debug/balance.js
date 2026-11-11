/* Pompom Parade - balance harness (GDD 9): headless bot runs of L1-30.
 * Passes: "expected" economy profile, "no upgrades + Wand", and god mode (level duration). */
(function () {
  'use strict';
  var PP = window.PP, B = PP.bal;
  var BAL = PP.balance = {};
  var DT = 1 / 60;

  /* run one level headless; returns the run result (+ duration). o: {prof, god, seed, weapon} */
  BAL.simLevel = function (L, o) {
    o = o || {};
    var G = PP.G, prevH = PP.headless, prevE = PP.headlessEvents;
    PP.headless = true; PP.headlessEvents = false;
    var out;
    try {
      PP.run.start({ level: L, prof: o.prof || PP.save.defaults(), autoplay: true, god: !!o.god, seed: o.seed, tutorial: false, H: 640, weapon: o.weapon, endless: !!o.endless });
      var max = Math.round((o.maxTime || 400) * 60), i = 0;
      for (; i < max && !G.over; i++) {
        if (G.cards) PP.bot.chooseCard();
        PP.run.step(DT);
      }
      out = G.result || { win: false, stars: 0, endSquad: PP.squad.n, time: G.t, progress: G.progress, timeout: true, squadPeak: G.squadPeak, lost: G.lostTotal, score: Math.floor(G.dist / 10), buttons: G.buttonsRun };
    } finally {
      PP.run.stop();
      PP.headless = prevH; PP.headlessEvents = prevE;
    }
    return out;
  };

  function pad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
  /* opts: {runs: seeds per level for the win-rate estimate (default 1), from, to, noGod} -> Promise<report> */
  BAL.run = function (opts) {
    opts = opts || {};
    var runs = opts.runs || 1, from = opts.from || 1, to = opts.to || 30;
    var rep = { levels: [], targets: {}, text: '' };
    var GM = PP.game, wasBusy = GM.busy;
    GM.busy = true;
    return new Promise(function (resolve) {
      var L = from;
      function one() {
        if (L > to) { finish(); return; }
        var def = PP.data.levels[L], prof = PP.econ.expectedProfile(L), row = { L: L, boss: B.isBoss(L) };
        row.M = Math.round(PP.econ.realM(prof) * 100) / 100; row.Mtable = Math.round(B.M(L) * 100) / 100;
        row.weapon = prof.equipped; row.buddy = prof.upg.buddy;
        var wins = 0, stars = 0, sq = 0, k, r;
        for (k = 0; k < runs; k++) {
          r = BAL.simLevel(L, { prof: prof, seed: k === 0 ? def.seed : def.seed + 1000 * k });
          if (k === 0) row.exp = { win: r.win, squad: r.endSquad, stars: r.stars, time: r.time, peak: r.squadPeak, lost: r.lost, progress: Math.round((r.progress || 0) * 100) };
          if (r.win) { wins++; stars += r.stars; sq += r.endSquad; }
        }
        row.winRate = wins / runs; row.avgStars = wins ? stars / wins : 0; row.avgSquad = wins ? Math.round(sq / wins) : 0;
        var nw = 0;
        for (k = 0; k < runs; k++) { r = BAL.simLevel(L, { prof: PP.save.defaults(), seed: k === 0 ? def.seed : def.seed + 1000 * k }); if (k === 0) row.noupg = { win: r.win, squad: r.endSquad, stars: r.stars, progress: Math.round((r.progress || 0) * 100) }; if (r.win) nw++; }
        row.noupgRate = nw / runs;
        if (!opts.noGod) { r = BAL.simLevel(L, { prof: prof, god: true, seed: def.seed }); row.god = { time: r.time, win: r.win }; }
        rep.levels.push(row);
        L++;
        setTimeout(one, 0);
      }
      function finish() {
        var lv = rep.levels, i, a1 = 0, a2 = 0, b1 = 0, b2 = 0, c = 0, n = lv.length;
        var lines = ['  L  M(real/table) weapon    exp: win stars squad(peak) time  rate | noupg: win prog rate | god time'];
        for (i = 0; i < n; i++) {
          var x = lv[i];
          if (x.exp.win) a1++; if (x.exp.win && x.exp.stars >= 2) a2++;
          if (x.L <= 10 && x.noupg.win) b1++; if (x.L >= 19 && !x.noupg.win) b2++;
          if (x.god && (x.god.time < 60 || x.god.time > 120)) c++;
          lines.push(pad(x.L, 3) + (x.boss ? '*' : ' ') + pad(x.M.toFixed(2), 5) + '/' + pad(x.Mtable.toFixed(2), 4) + ' ' + pad(x.weapon, 8) + '   ' +
            pad(x.exp.win ? 'WIN' : 'fail', 4) + pad(x.exp.stars, 5) + pad(x.exp.squad, 6) + '(' + pad(x.exp.peak, 3) + ')' + pad(x.exp.time.toFixed(0), 5) + pad(Math.round(x.winRate * 100) + '%', 6) +
            ' |' + pad(x.noupg.win ? 'WIN' : 'fail', 10) + pad(x.noupg.progress + '%', 5) + pad(Math.round(x.noupgRate * 100) + '%', 5) + ' |' + pad(x.god ? x.god.time.toFixed(0) : '-', 6));
        }
        rep.targets = {
          a_expectedWinsAll: a1 === n, a_wins: a1, a_twoStarShare: n ? a2 / n : 0, a_ok: a1 === n && a2 / n >= 0.6,
          b_noupgClears1to10: b1, b_noupgFails19to30: b2, b_ok: (from > 1 || b1 >= Math.min(10, to)) && (to < 30 || b2 >= 3),
          c_outside60to120: c, c_ok: c === 0
        };
        lines.push('targets: (a) expected wins ' + a1 + '/' + n + ', >=2 stars on ' + Math.round(rep.targets.a_twoStarShare * 100) + '% -> ' + (rep.targets.a_ok ? 'OK' : 'MISS') +
          ' | (b) no-upgrade clears L1-10: ' + b1 + ', fails in L19-30: ' + b2 + ' -> ' + (rep.targets.b_ok ? 'OK' : 'MISS') +
          ' | (c) god runs outside 60-120 s: ' + c + ' -> ' + (rep.targets.c_ok ? 'OK' : 'MISS'));
        rep.text = lines.join('\n');
        GM.busy = wasBusy;
        if (GM.isReady && GM.screen !== 'boot') GM.goto('menu');
        resolve(rep);
      }
      one();
    });
  };
})();
