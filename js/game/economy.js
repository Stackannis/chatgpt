/* Pompom Parade - rewards, purchases, Helping Hand, and the "expected" greedy economy profile */
(function () {
  'use strict';
  var PP = window.PP, B = PP.bal, D = PP.data;
  var EC = PP.econ = {};

  EC.luckMult = function (prof) { return 1 + 0.10 * ((prof || PP.save.data).upg.luck || 0); };
  EC.helping = function (L, prof) { var f = ((prof || PP.save.data).fails || {})[L] || 0; return f >= 4 ? 6 : (f >= 2 ? 3 : 0); };

  /* apply a finished run to the save; returns the reward breakdown for the result screen */
  EC.settle = function (res) {
    var sv = PP.save.data, L = res.level, out = { base: 0, bridge: 0, collected: 0, starBonus: 0, total: 0, newStars: 0, newWeapon: null, newWorld: 0, firstClear: false, best: 0, endlessBest: false };
    var mult = EC.luckMult(sv) * (res.lucky || 1);
    sv.stats.plays++; sv.stats.pops += res.popped || 0;
    if (res.mode === 'endless') {
      out.collected = Math.round(res.buttons * mult);
      out.base = Math.round(Math.floor(res.score / 20) * mult);
      out.total = out.collected + out.base;
      if (res.score > sv.endlessBest) { sv.endlessBest = Math.floor(res.score); out.endlessBest = true; PP.platform.sendScore(sv.endlessBest); }
      out.best = sv.endlessBest;
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
        if (w && !sv.weapons[w.id].own) { sv.weapons[w.id].own = 1; out.newWeapon = w.id; }
        if (out.firstClear && L % 6 === 0 && L < 30) out.newWorld = L / 6 + 1;
        if (L === 30) sv.ended = 1;
      } else {
        out.collected = Math.round(res.buttons * mult);
        out.base = Math.round(Math.floor(B.winBase(L) * 0.5 * res.progress) * mult);
        var pct = Math.floor(res.progress * 100);
        if (rec.s === 0 && pct > rec.pct) rec.pct = pct > 99 ? 99 : pct;
        sv.fails[L] = (sv.fails[L] || 0) + 1;
        out.best = rec.pct;
      }
      out.total = out.base + out.bridge + out.collected + out.starBonus;
    }
    sv.buttons += out.total;
    PP.save.flush();
    return out;
  };

  EC.upgradeCost = function (id, prof) { var k = (prof || PP.save.data).upg[id] || 0; return k >= D.upgradeById[id].max ? -1 : D.upgradeCost(id, k); };
  EC.weaponCost = function (id, prof) { var w = (prof || PP.save.data).weapons[id]; return (!w || !w.own || w.lv >= 5) ? -1 : D.weaponCost(D.weaponById[id].idx, w.lv + 1); };
  EC.buyUpgrade = function (id) {
    var sv = PP.save.data, c = EC.upgradeCost(id);
    if (c < 0 || sv.buttons < c) return false;
    sv.buttons -= c; sv.upg[id]++;
    PP.events.emit('purchase', { kind: 'upgrade', id: id, level: sv.upg[id], cost: c });
    PP.save.flush(); return true;
  };
  EC.buyWeapon = function (id) {
    var sv = PP.save.data, c = EC.weaponCost(id);
    if (c < 0 || sv.buttons < c) return false;
    sv.buttons -= c; sv.weapons[id].lv++;
    PP.events.emit('purchase', { kind: 'weapon', id: id, level: sv.weapons[id].lv, cost: c });
    PP.save.flush(); return true;
  };
  EC.equip = function (id) {
    var sv = PP.save.data;
    if (!sv.weapons[id] || !sv.weapons[id].own) return false;
    sv.equipped = id; PP.save.write(); return true;
  };
  EC.canAffordAny = function () {
    var sv = PP.save.data, i, c;
    for (i = 0; i < D.upgrades.length; i++) { c = EC.upgradeCost(D.upgrades[i].id); if (c >= 0 && sv.buttons >= c) return true; }
    for (i = 0; i < D.weapons.length; i++) { c = EC.weaponCost(D.weapons[i].id); if (c >= 0 && sv.buttons >= c) return true; }
    return false;
  };

  /* real power multiplier of a profile (compare with the table's M) */
  EC.realM = function (prof) {
    var w = D.weaponById[prof.equipped];
    return (1 + 0.06 * prof.upg.power) * (1 + 0.04 * prof.upg.rate) * D.weaponLvMult(prof.weapons[prof.equipped].lv) * w.eff;
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
  /* Greedy economy profile a player is expected to have when first reaching level L:
   * average 2 stars, spends on the cheapest of Power / Quick Paws / equipped weapon level / Buddy Start,
   * Shield and Lucky x1 after L10, newest weapon equipped. */
  EC.expectedProfile = function (L) {
    var p = PP.save.defaults(), l, i;
    for (l = 1; l < L; l++) {
      var income = (B.winBase(l) + Math.floor(B.mid(l) * 0.9 / 2) + EC.collectEstimate(l)) * EC.luckMult(p) + 20;
      p.buttons += Math.round(income);
      var w = D.weaponUnlockedAt(l);
      if (w) { p.weapons[w.id].own = 1; p.equipped = w.id; }
      if (l >= 10) {
        if (p.upg.shield < 1 && p.buttons >= D.upgradeCost('shield', 0)) { p.buttons -= D.upgradeCost('shield', 0); p.upg.shield = 1; }
        if (p.upg.luck < 1 && p.buttons >= D.upgradeCost('luck', 0)) { p.buttons -= D.upgradeCost('luck', 0); p.upg.luck = 1; }
      }
      for (var guard = 0; guard < 60; guard++) {
        var opts = [], c;
        c = EC.upgradeCost('power', p); if (c >= 0) opts.push(['power', c]);
        c = EC.upgradeCost('rate', p); if (c >= 0) opts.push(['rate', c]);
        c = EC.upgradeCost('buddy', p); if (c >= 0) opts.push(['buddy', c]);
        c = EC.weaponCost(p.equipped, p); if (c >= 0) opts.push(['weapon', c]);
        var best = null;
        for (i = 0; i < opts.length; i++) if (!best || opts[i][1] < best[1]) best = opts[i];
        if (!best || best[1] > p.buttons) break;
        p.buttons -= best[1];
        if (best[0] === 'weapon') p.weapons[p.equipped].lv++; else p.upg[best[0]]++;
      }
      p.levels[l] = { s: 2, best: 0, pct: 100 };
    }
    p.unlocked = L;
    return p;
  };
})();
