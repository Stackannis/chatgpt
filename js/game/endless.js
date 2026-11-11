/* Pompom Parade - Endless "Parade Marathon": procedural waves/gates from the same pattern library.
 * Level-equivalent Le = 12 + t/20; gate row every 11 s; mini-boss every 100 s; score = metres. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, B = PP.bal, D = PP.data;
  var EL = PP.endless = { nextWave: 0, nextGate: 0, lastGate: -99, nextBoss: 100, nextObj: 0, sameSide: 0, lastSide: -1, wave: { p: 'line', e: 'jelly', n: 3, el: 0 }, row: { g: ['+5', '+2'], move: 0 }, beat: [0, 'wave', null] };
  var BOSS_T = [0, 25, 30, 35, 40];
  var PATS = ['line', 'column', 'v', 'wall', 'zigzag', 'cluster', 'sides', 'stream', 'pincer'];

  EL.start = function () { EL.nextWave = 2.5; EL.nextGate = 8; EL.lastGate = -99; EL.nextBoss = 100; EL.nextObj = 14; EL.sameSide = 0; EL.lastSide = -1; EL.sync(); };
  EL.sync = function () {
    var G = PP.G, Le = 12 + G.tl / 20;
    G.L = Le; G.hpMult = B.hpMult(Le); G.scrollBase = B.scroll(Le); G.mid = B.mid(Le); G.A = B.A(Math.round(Le));
    G.star2 = 99999; G.star3 = 99999;
  };
  function pickEnemy(rng, Le) {
    var ids = D.grumblyIds, pool = [], i;
    for (i = 0; i < ids.length; i++) if (D.enemies[ids[i]].intro <= Le) pool.push(ids[i]);
    var id = rng.pick(pool);
    if (id === 'cloud' && rng() < 0.5) id = 'jelly';
    return id;
  }
  function gateRow(rng, Le, A, n) {
    var g, tri = Le >= 13;
    if (n > 1.3 * B.mid(Le)) {
      // a big squad meets stingier rows, so the Marathon stays a challenge
      var s = rng.int(0, 3), sm = Math.max(2, Math.round(0.35 * A));
      g = s === 0 ? ['pop', '-' + A, '/2'] : (s === 1 ? ['spd', '-' + Math.round(1.5 * A), '/2'] : (s === 2 ? ['pop', 'spd', '-' + A] : ['+' + (n > 2 * B.mid(Le) ? 1 : sm), '-' + Math.round(1.5 * A), '/2']));
      for (var q = g.length - 1; q > 0; q--) { var w = rng.int(0, q), t2 = g[q]; g[q] = g[w]; g[w] = t2; }
      return g;
    }
    if (!tri) {
      var k = rng.int(0, 4);
      g = k === 0 ? ['+' + A, 'x2'] : (k === 1 ? ['+' + A, '-' + Math.round(A * 0.7)] : (k === 2 ? ['pop', '+' + A] : (k === 3 ? ['grow', '+' + Math.round(0.6 * A)] : ['spd', '+' + A])));
    } else {
      var t = rng.int(0, 5);
      g = t === 0 ? ['x2', '+' + Math.round(1.5 * A), '-' + A] : (t === 1 ? ['x2', '/2', '+' + A] : (t === 2 ? ['pop', 'spd', '+' + A] :
        (t === 3 ? ['grow', 'grow', '-' + Math.round(0.7 * A)] : (t === 4 ? ['+' + A, '-' + Math.round(0.6 * A), '+' + Math.round(0.5 * A)] : ['+' + Math.round(1.2 * A), '/2', 'grow']))));
    }
    // shuffle sides (seeded)
    for (var i = g.length - 1; i > 0; i--) { var j = rng.int(0, i), tmp = g[i]; g[i] = g[j]; g[j] = tmp; }
    return g;
  }
  EL.update = function () {
    var G = PP.G, rng = G.rng, tl = G.tl;
    EL.sync();
    var Le = G.L;
    if (tl >= EL.nextBoss) {
      EL.nextBoss += 100;
      var type = rng.int(1, 4);
      var hp = Math.round(1.4 * B.mid(Le) * 24 * B.M(Le) * BOSS_T[type] * 0.85 * 0.4 * (B.hpMult(Le) / (B.hpMult(Math.min(30, Le)) || 1)) / 100) * 100;
      PP.run.bossIntro(type, hp, true);
      return;
    }
    if (tl >= EL.nextGate) {
      EL.row.g = gateRow(rng, Le, G.A, PP.squad.n); EL.row.move = Le >= 25 && rng() < 0.3 ? 1 : 0;
      var row = PP.gates.spawnRow(EL.row);
      if (row) {      // rule 6: best side never the same more than 3 rows in a row
        var best = PP.gates.best(row, PP.squad.n);
        if (best === EL.lastSide) { EL.sameSide++; if (EL.sameSide > 3) { EL.sameSide = 0; } } else { EL.sameSide = 1; EL.lastSide = best; }
      }
      EL.lastGate = tl; EL.nextGate += 11;
    }
    var blocked = tl < EL.lastGate + 3.0 || tl > EL.nextGate - 2.2;
    if (tl >= EL.nextWave) {
      if (blocked) EL.nextWave = tl < EL.lastGate + 3.0 ? EL.lastGate + 3.0 : EL.nextGate + 3.0;
      else {
        var w = EL.wave, den = B.density(Le);
        w.e = pickEnemy(rng, Le);
        w.p = (w.e === 'cloud') ? 'line' : rng.pick(PATS);
        var nmax = Math.min(10, Math.floor(3 + Le / 5));
        w.n = w.e === 'cloud' ? 2 : (w.e === 'snail' || w.e === 'twin' ? rng.int(2, 4) : rng.int(3, nmax));
        w.el = Le >= 19 && rng() < Math.min(0.4, 0.18 + (Le - 19) * 0.006) ? 1 : 0;
        // the further you go, the more waves span the whole road and must be shot through
        if ((w.e === 'jelly' || w.e === 'dust' || w.e === 'bean' || w.e === 'twin') && rng() < Math.min(0.7, 0.2 + (Le - 12) * 0.012)) {
          w.p = (w.e === 'jelly' || w.e === 'dust') && rng() < 0.4 ? 'wall' : 'line';
          w.n = w.p === 'wall' ? 5 : (w.e === 'bean' ? 5 : (w.e === 'twin' ? 4 : 6));
        }
        w.x = undefined; w.lane = undefined; w.gap = undefined;
        EL.beat[1] = 'wave'; EL.beat[2] = w;
        PP.run.exec(EL.beat);
        EL.nextWave = tl + 6 * PP.patterns.count(w.p, w.n) / (den * 1.1);
      }
    }
    if (tl >= EL.nextObj && !blocked && tl > EL.lastGate + 4.5 && tl < EL.nextGate - 4) {
      EL.nextObj = tl + rng.range(9, 15);
      var r = rng(), lane = rng.int(0, 3), x = U.laneX(lane), OB = PP.obst, EN = PP.enemies;
      if (r < 0.2) EN.spawn('crate', x, -40, false);
      else if (r < 0.3) EN.spawn('jar', x, -40, false);
      else if (r < 0.45) OB.spawn('spinner', x);
      else if (r < 0.6) OB.spawn('roller', x);
      else if (r < 0.7 && Le >= 20) OB.spawn('fence', rng.range(90, 270));
      else if (r < 0.78 && Le >= 16) OB.spawn('syrup', x);
      else if (r < 0.84 && Le >= 21) OB.spawn('ice', 180);
      else PP.pickups.spawn(rng.pick(['heart', 'heart', 'shield', 'frenzy', 'magnet', 'stack']), x, -30, false);
    }
  };
  EL.bossDone = function () {
    var G = PP.G;
    EL.lastGate = G.tl; EL.nextGate = G.tl + 3.5; EL.nextWave = G.tl + 6; EL.nextObj = G.tl + 9;
    PP.pickups.spawn('heart', 140, 60, true); PP.pickups.spawn('stack', 180, 60, true); PP.pickups.spawn('stack', 220, 60, true);
    if (PP.game && !PP.headless) PP.game.onBossEnd();
  };
})();
