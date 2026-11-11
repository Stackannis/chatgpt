/* Pompom Parade - rewards, purchases, Helping Hand, lose hints, and the "expected" greedy economy profile */
(function () {
  'use strict';
  var PP = window.PP, B = PP.bal, D = PP.data;
  var EC = PP.econ = {};

  EC.luckMult = function (prof) { return 1 + 0.10 * ((prof || PP.save.data).upg.luck || 0); };

  /* ---- Helping Hand: grows with consecutive fails on the same level ----
   * >=2: + max(3, 10 % of mid) pompoms | >=3: + 1 Shield charge | >=4: +15 % damage, pompoms 20 % of mid | >=6: +30 % damage */
  EC.helpTier = function (f) { return f >= 6 ? 4 : (f >= 4 ? 3 : (f >= 3 ? 2 : (f >= 2 ? 1 : 0))); };
  EC.helpingFor = function (L, f) {
    var mid = B.mid(L), t = EC.helpTier(f);
    return {
      tier: t, fails: f,
      pom: t >= 3 ? Math.max(3, Math.round(0.2 * mid)) : (t >= 1 ? Math.max(3, Math.round(0.1 * mid)) : 0),
      shield: t >= 2 ? 1 : 0,
      dmg: t >= 4 ? 1.30 : (t >= 3 ? 1.15 : 1)
    };
  };
  EC.helping = function (L, prof) { return EC.helpingFor(L, ((prof || PP.save.data).fails || {})[L] || 0); };
  /* boss levels: after 3 fails the level card offers "Go to boss" (skips the run-in) */
  EC.canSkipToBoss = function (L, prof) { return B.isBoss(L) && (((prof || PP.save.data).fails || {})[L] || 0) >= 3; };

  /* what the lose screen should point at: glove (Helping Hand just grew) > affordable upgrade > biggest loss source */
  EC.loseHint = function (res, helpUp) {
    if (helpUp) return 'glove';
    if (EC.canAffordAny()) return 'upgrade';
    var lb = res.lostBy || {}, boss = lb.boss || 0, haz = lb.hazard || 0, en = (lb.enemy || 0) + (lb.shot || 0), gate = lb.gate || 0;
    var tot = boss + haz + en + gate;
    if (tot <= 0) return res.mode === 'endless' ? 'enemy' : 'gates';
    if (gate >= 0.3 * tot) return 'gates';
    if (boss >= haz && boss >= en) return 'boss';
    return haz >= en ? 'hazard' : 'enemy';
  };

  /* apply a finished run to the save; returns the reward breakdown for the result screen */
  EC.settle = function (res) {
    var sv = PP.save.data, L = res.level, out = { base: 0, bridge: 0, collected: 0, starBonus: 0, total: 0, newStars: 0, newWeapon: null, prevWeapon: null, newWorld: 0,
      firstClear: false, best: 0, endlessBest: false, helpUp: false, hint: null };
    var mult = EC.luckMult(sv) * (res.lucky || 1);
    // a cheated / debug run never touches the leaderboard or the Endless record (checked again in platform.sendScore)
    var clean = !PP.cheated && !res.cheat;
    sv.stats.plays++; sv.stats.pops += res.popped || 0;
    if (res.mode === 'endless') {
      out.collected = Math.round(res.buttons * mult);
      out.base = Math.round(Math.floor(res.score / 20) * mult);
      out.total = out.collected + out.base;
      if (clean && res.score > sv.endlessBest) { sv.endlessBest = Math.floor(res.score); out.endlessBest = true; PP.platform.sendScore(sv.endlessBest); }
      out.best = sv.endlessBest;
      sv.buttons += out.total;
      out.hint = EC.loseHint(res, false);
    } else {
      var rec = sv.levels[L] || (sv.levels[L] = { s: 0, best: 0, pct: 0 });
      if (res.win) {
        out.base = Math.round(B.winBase(L) * mult);
        out.bridge = Math.round(Math.floor(res.endSquad / 2) * mult);
        out.collected = Math.round(res.buttons * mult);
        out.firstClear = rec.s === 0;
        if (res.stars > rec.s) { out.newStars = res.stars - rec.s; rec.s = res.stars; }
        out.starBonus = 10 * out.newStars;
        if (res.endSquad > rec.best) rec.best = res.endSquad;
        rec.pct = 100;
        if (sv.fails[L]) delete sv.fails[L];
        if (L >= sv.unlocked && L < 31) sv.unlocked = L + 1;
        var w = D.weaponUnlockedAt(L);
        if (w && !sv.weapons[w.id].own) {
          // a new toy is equipped right away; the result card offers "Keep <old toy>"
          sv.weapons[w.id].own = 1; out.newWeapon = w.id; out.prevWeapon = sv.equipped; sv.equipped = w.id;
        }
        if (out.firstClear && L % 6 === 0 && L < 30) out.newWorld = L / 6 + 1;
        out.total = out.base + out.bridge + out.collected + out.starBonus;
        sv.buttons += out.total;
      } else {
        // a failed attempt still pays: everything collected + 15 % .. 75 % of the win base by progress
        out.collected = Math.round(res.buttons * mult);
        out.base = Math.round(Math.floor(B.winBase(L) * (0.15 + 0.6 * res.progress)) * mult);
        var pct = Math.floor(res.progress * 100);
        if (rec.s === 0 && pct > rec.pct) rec.pct = pct > 99 ? 99 : pct;
        var before = EC.helpTier(sv.fails[L] || 0);
        sv.fails[L] = (sv.fails[L] || 0) + 1;
        out.helpUp = EC.helpTier(sv.fails[L]) > before;
        out.best = rec.pct;
        out.total = out.base + out.collected;
        sv.buttons += out.total;
        out.hint = EC.loseHint(res, out.helpUp);
      }
    }
    PP.save.flush();
    return out;
  };

  EC.upgradeCost = function (id, prof) { var k = (prof || PP.save.data).upg[id] || 0; return k >= D.upgradeById[id].max ? -1 : D.upgradeCost(id, k); };
  /* shared Toy Level: one price list, no weapon-tier factor */
  EC.toyCost = function (prof) { var t = (prof || PP.save.data).toy || 1; return t >= 5 ? -1 : D.toyCost(t + 1); };
  EC.buyUpgrade = function (id) {
    var sv = PP.save.data, c = EC.upgradeCost(id);
    if (c < 0 || sv.buttons < c) return false;
    sv.buttons -= c; sv.upg[id]++;
    PP.events.emit('purchase', { kind: 'upgrade', id: id, level: sv.upg[id], cost: c });
    PP.save.flush(); return true;
  };
  EC.buyToy = function () {
    var sv = PP.save.data, c = EC.toyCost();
    if (c < 0 || sv.buttons < c) return false;
    sv.buttons -= c; sv.toy = (sv.toy || 1) + 1;
    PP.events.emit('purchase', { kind: 'toy', id: 'toy', level: sv.toy, cost: c });
    PP.save.flush(); return true;
  };
  /* kept for older scripts: every weapon shares the Toy Level */
  EC.weaponCost = function (id, prof) { var w = (prof || PP.save.data).weapons[id]; return (!w || !w.own) ? -1 : EC.toyCost(prof); };
  EC.buyWeapon = function () { return EC.buyToy(); };
  EC.equip = function (id) {
    var sv = PP.save.data;
    if (!sv.weapons[id] || !sv.weapons[id].own) return false;
    sv.equipped = id; PP.save.write(); return true;
  };
  EC.canAffordAny = function () {
    var sv = PP.save.data, i, c;
    for (i = 0; i < D.upgrades.length; i++) { c = EC.upgradeCost(D.upgrades[i].id); if (c >= 0 && sv.buttons >= c) return true; }
    c = EC.toyCost(); if (c >= 0 && sv.buttons >= c) return true;
    return false;
  };

  /* real power multiplier of a profile (compare with the table's M) */
  EC.realM = function (prof) {
    var w = D.weaponById[prof.equipped];
    return (1 + 0.06 * prof.upg.power) * (1 + 0.04 * prof.upg.rate) * D.weaponLvMult(prof.toy || 1) * w.eff;
  };
  /* estimated Buttons collected in a level (drops + crates/jars), used by the expected profile */
  EC.collectEstimate = function (L) {
    var def = D.levels && D.levels[L], n = 0;
    if (!def) return 20 + 2 * L;
    for (var i = 0; i < def.beats.length; i++) {
      var b = def.beats[i], p = b[2] || {};
      if (b[1] === 'wave') { var e = D.enemies[p.e]; n += p.n * e.drop[0] * e.drop[1] * 0.7 + (p.el || 0) * 5 * 0.7; }
      else if (b[1] === 'obj') { if (p.o === 'crate') n += 3 * 0.7; else if (p.o === 'jar') n += 10 * 0.7; }
      else if (b[1] === 'pick') { if (p.k === 'button') n += 0.8; else if (p.k === 'stack') n += 4; }
    }
    return Math.round(n);
  };
  /* greedy spending used by the expected profile and the campaign simulation:
   * Shield and Lucky x1 once level 10 is reached, then always the cheapest of Power / Quick Paws / Buddy Start / Toy Level */
  EC.greedySpend = function (p, buy) {
    var i;
    if (p.unlocked >= 10) {
      if (p.upg.shield < 1 && p.buttons >= D.upgradeCost('shield', 0)) { p.buttons -= D.upgradeCost('shield', 0); p.upg.shield = 1; }
      if (p.upg.luck < 1 && p.buttons >= D.upgradeCost('luck', 0)) { p.buttons -= D.upgradeCost('luck', 0); p.upg.luck = 1; }
    }
    for (var guard = 0; guard < 80; guard++) {
      var opts = [], c;
      c = EC.upgradeCost('power', p); if (c >= 0) opts.push(['power', c]);
      c = EC.upgradeCost('rate', p); if (c >= 0) opts.push(['rate', c]);
      c = EC.upgradeCost('buddy', p); if (c >= 0) opts.push(['buddy', c]);
      c = EC.toyCost(p); if (c >= 0) opts.push(['toy', c]);
      var best = null;
      for (i = 0; i < opts.length; i++) if (!best || opts[i][1] < best[1]) best = opts[i];
      if (!best || best[1] > p.buttons) break;
      p.buttons -= best[1];
      if (best[0] === 'toy') p.toy = (p.toy || 1) + 1; else p.upg[best[0]]++;
    }
    return p;
  };
  /* Greedy economy profile a player is expected to have when first reaching level L:
   * average 2 stars, 0.5 failed attempts per level (at half progress), newest toy auto-equipped,
   * shared Toy Level, greedy spending (see greedySpend). */
  EC.expectedProfile = function (L) {
    var p = PP.save.defaults(), l;
    for (l = 1; l < L; l++) {
      var luck = EC.luckMult(p), col = EC.collectEstimate(l);
      var win = (B.winBase(l) + Math.floor(B.mid(l) * 0.9 / 2) + col) * luck + 20;
      var fail = 0.5 * (Math.floor(B.winBase(l) * (0.15 + 0.6 * 0.5)) + 0.4 * col) * luck;
      p.buttons += Math.round(win + fail);
      var w = D.weaponUnlockedAt(l);
      if (w) { p.weapons[w.id].own = 1; p.equipped = w.id; }
      p.levels[l] = { s: 2, best: 0, pct: 100 };
      p.unlocked = l + 1;
      EC.greedySpend(p);
    }
    p.unlocked = L;
    return p;
  };
})();
