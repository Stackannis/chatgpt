/* Pompom Parade - balance harness (debug tooling, standalone web build only).
 * Balance is judged with the simulated-human models of js/debug/humans.js (good / avg / lazy / sloppy),
 * at screen heights 600 and 780, never with the perfect bot (the bot is only the "is it possible" check).
 *   ?balance=1&models=good,avg,lazy&H=600,780&runs=24   prints the win% / stars / progress table
 *   PP.balance.table(opts), .curve(), .campaign(opts), .weapons(opts), .endless(opts)  from tests/ */
(function () {
  'use strict';
  var PP = window.PP, B = PP.bal, D = PP.data;
  var BAL = PP.balance = {};
  var DT = 1 / 60;
  var WEAPONS = ['wand', 'shaker', 'gumball', 'star', 'cookie', 'confetti', 'beam'];

  /* target win-rate bands (FIX_PLAN_R1): [normal lo, normal hi, boss lo, boss hi] per world */
  BAL.BANDS = {
    good: [null, [95, 100, 85, 95], [88, 98, 75, 90], [82, 94, 65, 85], [78, 92, 60, 80], [72, 90, 55, 75]],
    avg: [null, [85, 100, 65, 85], [70, 88, 50, 70], [60, 80, 40, 60], [55, 75, 35, 55], [50, 70, 30, 50]]
  };

  /* run one level headless with the plain bot; returns the run result. o: {prof, god, seed, weapon, endless, H, maxTime} */
  BAL.simLevel = function (L, o) {
    o = o || {};
    var G = PP.G, prevH = PP.headless, prevE = PP.headlessEvents;
    PP.headless = true; PP.headlessEvents = false;
    var out;
    try {
      PP.run.start({ level: L, prof: o.prof || PP.save.defaults(), autoplay: true, god: !!o.god, seed: o.seed, tutorial: false, H: o.H || 640, weapon: o.weapon, endless: !!o.endless });
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
  function padr(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function list(v, def) { if (!v) return def; if (typeof v === 'string') return v.split(','); return v; }
  function profileFor(L, kind) { return kind === 'fresh' ? PP.save.defaults() : PP.econ.expectedProfile(L); }

  /* one table cell: `runs` seeds of level L for a player model at screen height H */
  BAL.cell = function (L, model, H, runs, o) {
    o = o || {};
    var def = D.levels[L], w = 0, st = 0, prog = 0, tm = 0, sq = 0, lostBy = { enemy: 0, hazard: 0, shot: 0, boss: 0, gate: 0 };
    for (var k = 0; k < runs; k++) {
      var prof = o.prof ? JSON.parse(JSON.stringify(o.prof)) : profileFor(L, o.profile);
      var r = PP.humans.run(L, prof, model, def.seed + 1000 * k, { H: H, weapon: o.weapon });
      if (r.win) { w++; st += r.stars; sq += r.endSquad; }
      prog += r.progress; tm += r.time;
      if (r.lostBy) for (var c in lostBy) lostBy[c] += r.lostBy[c] || 0;
    }
    return { w: Math.round(100 * w / runs), st: w ? Math.round(10 * st / w) / 10 : 0, prog: Math.round(100 * prog / runs), t: Math.round(tm / runs), squad: w ? Math.round(sq / w) : 0, lostBy: lostBy, runs: runs };
  };

  /* check a table against the bands + curve-shape rules. cells: {key: [cell for L=1..30]} keyed 'model@H' */
  BAL.check = function (rows, models, Hs) {
    var bad = [], i, m, h, L;
    function get(L, m, h) { return rows[L - 1] && rows[L - 1].cells[m + '@' + h]; }
    for (m = 0; m < models.length; m++) for (h = 0; h < Hs.length; h++) {
      var name = models[m], H = Hs[h], tag = name + '@' + H, band = BAL.BANDS[name];
      var have = function (l) { return !!get(l, name, H); };
      for (L = 1; L <= 30; L++) {
        var c = get(L, name, H); if (!c) continue;
        var w = B.world(L), boss = B.isBoss(L);
        if (band) {
          var lo = band[w][boss ? 2 : 0], hi = band[w][boss ? 3 : 1];
          if (c.w < lo || c.w > hi) bad.push(tag + ' L' + L + (boss ? '*' : '') + ' ' + c.w + '% outside ' + lo + '-' + hi);
          if (!boss) {     // never more than 10 points easier than an earlier normal level of the same world
            for (i = (w - 1) * 6 + 1; i < L; i++) if (have(i) && !B.isBoss(i) && c.w > get(i, name, H).w + 10) { bad.push(tag + ' L' + L + ' ' + c.w + '% is >10 pts easier than L' + i + ' ' + get(i, name, H).w + '%'); break; }
          } else {
            var nb = [];
            if (have(L - 1)) nb.push(get(L - 1, name, H).w);
            if (L < 30 && have(L + 1)) nb.push(get(L + 1, name, H).w);
            if (nb.length && c.w > Math.min.apply(null, nb)) bad.push(tag + ' boss L' + L + ' ' + c.w + '% above a neighbour (' + nb.join('/') + ')');
            if (L < 30 && have(L + 1) && get(L + 1, name, H).w < c.w + 10) bad.push(tag + ' L' + (L + 1) + ' ' + get(L + 1, name, H).w + '% < boss L' + L + ' ' + c.w + '% + 10');
          }
        }
        if (name === 'lazy') {
          if ((L === 6 || L === 12) && c.w > 30) bad.push(tag + ' L' + L + ' lazy ' + c.w + '% > 30');
          if (L >= 13 && c.w > 15) bad.push(tag + ' L' + L + ' lazy ' + c.w + '% > 15');
        }
        if (name === 'bot' && c.w < 95) bad.push(tag + ' L' + L + ' bot ' + c.w + '% < 95');
      }
      if (name === 'lazy' && have(4) && have(12)) {
        var s = 0; for (L = 4; L <= 12; L++) s += get(L, name, H).w;
        if (s / 9 > 50) bad.push(tag + ' lazy average over L4-12 = ' + Math.round(s / 9) + '% > 50');
      }
    }
    // screen-height invariance: the same cell at two heights may differ by at most 10 points
    for (m = 0; m < models.length; m++) for (L = 1; L <= 30; L++) for (h = 1; h < Hs.length; h++) {
      var a = get(L, models[m], Hs[0]), b = get(L, models[m], Hs[h]);
      if (a && b && Math.abs(a.w - b.w) > 10) bad.push(models[m] + ' L' + L + ': H=' + Hs[0] + ' ' + a.w + '% vs H=' + Hs[h] + ' ' + b.w + '%');
    }
    return bad;
  };

  /* opts: {models, H, runs, from, to, profile: 'expected' | 'fresh', levels} -> Promise<{rows, text, bad}> */
  BAL.table = function (opts) {
    opts = opts || {};
    var models = list(opts.models, ['good', 'avg', 'lazy']), Hs = list(opts.H, [600, 780]).map(Number), runs = opts.runs || 24;
    var levels = opts.levels || [], L;
    if (!levels.length) for (L = opts.from || 1; L <= (opts.to || 30); L++) levels.push(L);
    var rows = [], GM = PP.game, wasBusy = GM.busy;
    GM.busy = true;
    return new Promise(function (resolve) {
      var i = 0;
      function one() {
        if (i >= levels.length) { done(); return; }
        var L = levels[i++], prof = profileFor(L, opts.profile), row = { L: L, boss: B.isBoss(L), weapon: prof.equipped, toy: prof.toy, upg: prof.upg, M: Math.round(PP.econ.realM(prof) * 100) / 100, cells: {} };
        for (var m = 0; m < models.length; m++) for (var h = 0; h < Hs.length; h++) row.cells[models[m] + '@' + Hs[h]] = BAL.cell(L, models[m], Hs[h], runs, { profile: opts.profile });
        rows[L - 1] = row;
        setTimeout(one, 0);
      }
      function done() {
        GM.busy = wasBusy;
        var out = { rows: rows, models: models, H: Hs, runs: runs, bad: BAL.check(rows, models, Hs) };
        out.text = BAL.format(out);
        resolve(out);
      }
      one();
    });
  };
  BAL.format = function (t) {
    var keys = [], m, h, i, lines = [];
    for (m = 0; m < t.models.length; m++) for (h = 0; h < t.H.length; h++) keys.push(t.models[m] + '@' + t.H[h]);
    lines.push('runs=' + t.runs + ' per cell, expected profile.  cell = win% / avg stars / avg progress%   (* = boss level)');
    lines.push('  L  toy weapon    M   ' + keys.map(function (k) { return padr(k, 14); }).join(''));
    for (i = 0; i < t.rows.length; i++) {
      var r = t.rows[i]; if (!r) continue;
      lines.push(pad(r.L, 3) + (r.boss ? '*' : ' ') + pad(r.toy, 3) + ' ' + padr(r.weapon, 8) + pad(r.M.toFixed(2), 5) + '  ' +
        keys.map(function (k) { var c = r.cells[k]; return padr(c.w + '%/' + c.st.toFixed(1) + '/' + c.prog, 14); }).join(''));
    }
    lines.push(t.bad.length ? 'band / shape misses (' + t.bad.length + '):' : 'all bands and curve-shape rules hold');
    for (i = 0; i < t.bad.length; i++) lines.push('  ' + t.bad[i]);
    return lines.join('\n');
  };

  /* difficulty curve: wave HP per second per level + the monotonicity rules of the plan */
  BAL.curve = function () {
    var rows = [], bad = [], L;
    for (L = 1; L <= 30; L++) {
      var def = D.levels[L], hp = 0, n = 0, i;
      for (i = 0; i < def.beats.length; i++) {
        var b = def.beats[i]; if (b[1] !== 'wave') continue;
        var p = b[2], c = PP.patterns.count(p.p, p.n);
        n += c; hp += (c + (p.el || 0) * 2) * D.enemyHpUnits(p.e) * B.hpMult(L) * B.ramp(b[0], def.length);
      }
      rows.push({ L: L, hps: hp / def.length, target: B.hpsTarget(L), hpMult: B.hpMult(L), g: B.g(L), adj: B.ADJ[L] || 1, enemies: n, bossHp: B.isBoss(L) ? B.bossHp(L) : 0 });
    }
    for (L = 2; L <= 30; L++) {
      if (B.isBoss(L)) continue;
      var first = (L - 1) % 6 === 0, ref = rows[(first ? L - 2 : L - 1) - 1], k = rows[L - 1].hps / ref.hps;
      rows[L - 1].ratio = k;
      if (first ? (k < 0.85 || k > 0.95) : (k < 1.0 || k > 1.2)) bad.push('L' + L + ' = ' + k.toFixed(3) + ' x L' + ref.L + (first ? ' (world opener, want 0.85-0.95)' : ' (want 1.00-1.20)'));
    }
    for (L = 1; L <= 30; L++) { var a = B.ADJ[L]; if (a && (a < 0.92 || a > 1.08)) bad.push('L' + L + ' correction ' + a + ' outside +-8 %'); }
    var text = ['  L  hp/s  (target)  ratio  hpMult   g    adj  enemies  bossHp'];
    for (L = 1; L <= 30; L++) {
      var r = rows[L - 1];
      text.push(pad(L, 3) + (B.isBoss(L) ? '*' : ' ') + pad(r.hps.toFixed(1), 6) + pad('(' + r.target.toFixed(1) + ')', 9) + pad(r.ratio ? r.ratio.toFixed(3) : '-', 7) + pad(r.hpMult.toFixed(2), 7) + pad(r.g.toFixed(2), 6) + pad(r.adj.toFixed(2), 6) + pad(r.enemies, 7) + pad(r.bossHp || '', 9));
    }
    text.push(bad.length ? 'curve misses: ' + bad.join('; ') : 'curve is monotonic (normal levels x1.00-1.20, world openers x0.85-0.95 of L-2)');
    return { rows: rows, bad: bad, text: text.join('\n') };
  };

  /* full campaign from a fresh save: greedy spending, Helping Hand on, "Go to boss" when offered.
   * opts: {model, H, maxAttempts, seedBase} -> {rows, attempts, minutes, stars, stuck, worst} */
  BAL.campaign = function (opts) {
    opts = opts || {};
    var model = opts.model || 'good', maxAtt = opts.maxAttempts || 25, sb = opts.seedBase || 0, EC = PP.econ;
    var keep = PP.save.data, sv = PP.save.defaults(), rows = [], total = 0, time = 0, stuck = [], worst = 0;
    PP.save.data = sv;
    var prevNo = PP.noPersist; PP.noPersist = true;
    try {
      for (var L = 1; L <= 30; L++) {
        var def = D.levels[L], att = 0, won = false, last = null, progs = [], skips = 0;
        while (att < maxAtt) {
          EC.greedySpend(sv);
          var toBoss = EC.canSkipToBoss(L, sv) && opts.goToBoss !== false;
          var r = PP.humans.run(L, sv, model, def.seed + 1000 * (att + sb * 77), { H: opts.H || 640, toBoss: toBoss });
          if (toBoss) skips++;
          att++; time += r.time + 12;
          EC.settle(r);
          last = r; progs.push(Math.round(100 * r.progress));
          if (r.win) { won = true; break; }
        }
        total += att; if (att > worst) worst = att;
        rows.push({ L: L, att: att, won: won, stars: won ? last.stars : 0, buttons: sv.buttons, eq: sv.equipped, toy: sv.toy, upg: [sv.upg.power, sv.upg.rate, sv.upg.buddy, sv.upg.shield, sv.upg.luck].join('/'), progs: progs.join(','), help: last.helping, skips: skips });
        if (!won) { stuck.push(L); sv.unlocked = Math.max(sv.unlocked, L + 1); }
      }
      var stars = 0; for (var k in sv.levels) stars += sv.levels[k].s || 0;
      var text = rows.map(function (r) { return padr('L' + r.L, 4) + (r.won ? 'WIN ' : 'FAIL') + ' att=' + padr(r.att, 3) + ' stars=' + r.stars + ' btn=' + padr(r.buttons, 6) + ' ' + padr(r.eq, 8) + ' toy=' + r.toy + ' upg=' + padr(r.upg, 12) + ' help=' + r.help + (r.skips ? ' toBoss=' + r.skips : '') + ' prog=' + r.progs; });
      text.push('model=' + model + ' H=' + (opts.H || 640) + ': ' + total + ' attempts, ' + Math.round(time / 60) + ' min, worst level ' + worst + ' attempts, stuck: ' + (stuck.join(',') || 'none') + ', stars ' + stars + '/90');
      return { rows: rows, attempts: total, minutes: Math.round(time / 60), stars: stars, stuck: stuck, worst: worst, text: text.join('\n') };
    } finally { PP.save.data = keep; PP.noPersist = prevNo; }
  };

  /* weapon comparison: same level, same profile (same Toy Level), only the toy swapped.
   * opts: {model, runs, H, levels} -> {rows: {weapon: {L: win%}}, bad, text} */
  BAL.weapons = function (opts) {
    opts = opts || {};
    var model = opts.model || 'good', runs = opts.runs || 12, levels = opts.levels || [], L, i, w;
    if (!levels.length) for (L = 4; L <= 30; L++) levels.push(L);
    var res = {}, bad = [];
    for (i = 0; i < WEAPONS.length; i++) res[WEAPONS[i]] = {};
    for (i = 0; i < levels.length; i++) {
      L = levels[i];
      for (w = 0; w < WEAPONS.length; w++) {
        var def = D.weaponById[WEAPONS[w]];
        if (def.unlock >= L) continue;                    // not unlocked yet at this level
        var prof = PP.econ.expectedProfile(L); prof.weapons[def.id].own = 1; prof.equipped = def.id;
        if (opts.toy) prof.toy = opts.toy;
        res[def.id][L] = BAL.cell(L, model, opts.H || 640, runs, { prof: prof, weapon: def.id }).w;
      }
    }
    // per world: mean win% of each toy over the world's levels where it is available
    var worlds = [], text = ['weapon win% (' + model + ', ' + runs + ' runs, same Toy Level)  ' + levels.map(function (l) { return pad('L' + l, 5); }).join('')];
    for (w = 0; w < WEAPONS.length; w++) text.push(padr(WEAPONS[w], 44) + levels.map(function (l) { var v = res[WEAPONS[w]][l]; return pad(v === undefined ? '.' : v, 5); }).join(''));
    // one segment per unlocked toy: the levels of its world on which it is the newest toy
    for (var wi = 1; wi < WEAPONS.length; wi++) {
      var nw = D.weaponById[WEAPONS[wi]], from = nw.unlock + 1, wd = B.world(from), to = wd * 6;
      if (wi + 1 < WEAPONS.length) to = Math.min(to, D.weaponById[WEAPONS[wi + 1]].unlock);
      var cmp = {}, best = -1, used = 0;
      for (w = 0; w < WEAPONS.length; w++) {
        var id2 = WEAPONS[w], s2 = 0, n2 = 0;
        for (i = 0; i < levels.length; i++) { L = levels[i]; if (L >= from && L <= to && res[nw.id][L] !== undefined && res[id2][L] !== undefined) { s2 += res[id2][L]; n2++; } }
        if (n2) { cmp[id2] = Math.round(s2 / n2); used = n2; if (cmp[id2] > best) best = cmp[id2]; }
      }
      if (!used) continue;
      worlds.push({ world: wd, newest: nw.id, from: from, to: to, mean: cmp, best: best });
      text.push('W' + wd + ' L' + from + '-' + to + ' (newest: ' + nw.id + '): ' + WEAPONS.filter(function (x) { return cmp[x] !== undefined; }).map(function (x) { return x + ' ' + cmp[x] + '%'; }).join(', '));
      if (cmp[nw.id] < best - 5) bad.push('W' + wd + ' L' + from + '-' + to + ': newest toy ' + nw.id + ' ' + cmp[nw.id] + '% is more than 5 pts below the best (' + best + '%)');
      if (cmp.star !== undefined && nw.id !== 'star' && cmp[nw.id] < cmp.star - 5) bad.push('W' + wd + ': ' + nw.id + ' ' + cmp[nw.id] + '% < Star ' + cmp.star + '% - 5');
    }
    text.push(bad.length ? 'weapon-order misses: ' + bad.join('; ') : 'weapon order OK (newest toy best or within 5 pts; each world toy >= Star - 5)');
    return { res: res, worlds: worlds, bad: bad, text: text.join('\n') };
  };

  /* Endless survival: full L30 profile, newest toy. opts: {models, runs, maxMinutes, H} */
  BAL.endless = function (opts) {
    opts = opts || {};
    var models = list(opts.models, ['good', 'avg', 'bot']), runs = opts.runs || 24, cap = (opts.maxMinutes || 15) * 60, out = {}, text = [], bad = [];
    for (var m = 0; m < models.length; m++) {
      var t = [], died15 = 0;
      for (var k = 0; k < runs; k++) {
        var prof = PP.econ.expectedProfile(30);
        prof.weapons.beam.own = 1; prof.equipped = 'beam'; prof.unlocked = 31;
        var r = PP.humans.run('endless', prof, models[m], 1000 * (k + 1) + 7, { H: opts.H || 640, maxTime: cap, cfg: { cards: models[m] === 'bot' ? 'bot' : 'rand' } });
        t.push(Math.round(r.time)); if (!r.timeout) died15++;
      }
      t.sort(function (a, b) { return a - b; });
      var med = (t[(runs - 1) >> 1] + t[runs >> 1]) / 2;
      out[models[m]] = { median: med, min: t[0], max: t[runs - 1], diedShare: died15 / runs, times: t };
      text.push(padr(models[m], 6) + ' median ' + (med / 60).toFixed(1) + ' min (' + Math.round(med) + ' s), min ' + t[0] + ' s, max ' + t[runs - 1] + ' s, died before ' + (cap / 60) + ' min: ' + Math.round(100 * died15 / runs) + '%');
      if (models[m] === 'good' && (med < 240 || med > 420)) bad.push('good median ' + (med / 60).toFixed(1) + ' min outside 4-7');
      if (models[m] === 'avg' && (med < 120 || med > 240)) bad.push('avg median ' + (med / 60).toFixed(1) + ' min outside 2-4');
      if (models[m] === 'bot' && died15 / runs < 0.8) bad.push('bot dies before 15 min in only ' + Math.round(100 * died15 / runs) + '% of runs');
    }
    text.push(bad.length ? 'endless misses: ' + bad.join('; ') : 'endless targets hold');
    return { models: out, bad: bad, text: text.join('\n') };
  };

  /* ?balance=1 entry point. opts: {models, H, runs, from, to} */
  BAL.run = function (opts) {
    opts = opts || {};
    return BAL.table(opts).then(function (t) {
      var c = BAL.curve();
      t.curve = c; t.text = t.text + '\n\n' + c.text;
      if (PP.game.isReady && PP.game.screen !== 'boot') PP.game.goto('menu');
      return t;
    });
  };
})();
