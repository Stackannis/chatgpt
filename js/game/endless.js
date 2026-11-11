/* Pompom Parade - Endless "Parade Marathon": procedural waves/gates from the same pattern library.
 * Starts fair (FIX_PLAN_R1 gameplay-7): level-equivalent Le = 10 + t/15, squad = mid(10) + Buddy Start,
 * first gate row after 4 s. Real late escalation between Le 20 and Le 40 (t = 150 s .. 450 s):
 * stingy gate rows 0 -> 60 %, Elites 0 -> 35 %, hazard spacing 15 s -> 7 s, and a mini-boss every 90 s
 * whose HP goes from 50 % to 100 % of the formula. Score = metres. */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, B = PP.bal, D = PP.data;
  var EL = PP.endless = { LE0: 10, LE_RATE: 15, BOSS_EVERY: 90, nextWave: 0, nextGate: 0, lastGate: -99, nextBoss: 90, nextObj: 0, nextHaz: 0, sameSide: 0, lastSide: -1,
    wave: { p: 'line', e: 'jelly', n: 3, el: 0 }, row: { g: ['+5', '+2'], move: 0 }, beat: [0, 'wave', null] };
  var BOSS_T = [0, 25, 30, 35, 40];
  var PATS = ['line', 'column', 'v', 'wall', 'zigzag', 'cluster', 'sides', 'stream', 'pincer'];

  EL.Le = function (t) { return EL.LE0 + t / EL.LE_RATE; };
  /* escalation 0..1 between Le 20 and Le 40 */
  EL.esc = function (Le) { return U.clamp((Le - 20) / 20, 0, 1); };
  EL.stingyShare = function (Le) { return 0.6 * EL.esc(Le); };
  EL.eliteShare = function (Le) { return 0.35 * EL.esc(Le); };
  EL.hazardGap = function (Le) { return 15 - 8 * EL.esc(Le); };
  EL.bossHp = function (Le, type) {
    var formula = 1.4 * B.mid(Le) * 24 * B.M(Le) * BOSS_T[type] * 0.85 * (B.hpMult(Le) / (B.hpMult(Math.min(30, Le)) || 1));
    return Math.max(100, Math.round(formula * (0.5 + 0.5 * EL.esc(Le)) * EL.BOSS_K / 100) * 100);
  };
  EL.BOSS_K = 0.4;       // the mini-boss formula: 40 % of a campaign boss of that level-equivalent
  EL.HP_K = 14; EL.LATE = 1.09;
  /* toughness factor: HP_K, and past Le 40 another 9 % per level so that nobody marches forever */
  EL.hpK = function (Le) { return EL.HP_K * (Le > 40 ? Math.pow(EL.LATE, Le - 40) : 1); };
  /* late Grumblies also bump harder: x1 until Le 18, then with the size of the squads they meet */
  EL.bumpK = function (Le) { var k = B.mid(Le) / B.mid(18); return k <= 1 ? 1 : Math.pow(k, 1.5); };
  EL.start = function () {
    EL.nextWave = 2.0; EL.nextGate = 4; EL.lastGate = -99; EL.nextBoss = EL.BOSS_EVERY; EL.nextObj = 12; EL.nextHaz = 9; EL.sameSide = 0; EL.lastSide = -1;
    EL.sync();
  };
  EL.sync = function () {
    var G = PP.G, Le = EL.Le(G.tl);
    // Marathon squads carry every upgrade, gate and card bonus, so its Grumblies are HP_K times tougher than the
    // campaign's at the same level-equivalent
    G.L = Le; G.hpMult = B.hpMult(Le) * EL.hpK(Le); G.scrollBase = B.scroll(Le); G.mid = B.mid(Le); G.A = B.A(Math.round(Le));
    G.star2 = 99999; G.star3 = 99999;
    G.bumpK = EL.bumpK(Le);
  };
  function pickEnemy(rng, Le) {
    var ids = D.grumblyIds, pool = [], i;
    for (i = 0; i < ids.length; i++) if (D.enemies[ids[i]].intro <= Le) pool.push(ids[i]);
    var id = rng.pick(pool);
    if (id === 'cloud' && rng() < 0.5) id = 'jelly';
    return id;
  }
  function shuffle(g, rng) { for (var i = g.length - 1; i > 0; i--) { var j = rng.int(0, i), t = g[i]; g[i] = g[j]; g[j] = t; } return g; }
  function gateRow(rng, Le, A, n) {
    var g, tri = Le >= 13, mid = B.mid(Le);
    // stingy rows: always for an oversized squad, and for a growing share of all rows late in the run
    if (n > 1.3 * mid || rng() < EL.stingyShare(Le)) {
      var s = rng.int(0, 3), sm = Math.max(2, Math.round(0.35 * A));
      g = s === 0 ? ['pop', '-' + A, '/2'] : (s === 1 ? ['spd', '-' + Math.round(1.5 * A), '/2'] : (s === 2 ? ['pop', 'spd', '-' + A] : ['+' + (n > 2 * mid ? 1 : sm), '-' + Math.round(1.5 * A), '/2']));
      if (!tri) g = s % 2 ? ['+' + sm, '-' + A] : ['pop', '-' + A];
      return shuffle(g, rng);
    }
    if (!tri) {
      var k = rng.int(0, 4);
      g = k === 0 ? ['+' + A, 'x2'] : (k === 1 ? ['+' + A, '-' + Math.round(A * 0.7)] : (k === 2 ? ['pop', '+' + A] : (k === 3 ? ['grow', '+' + Math.round(0.6 * A)] : ['spd', '+' + A])));
      if (k === 0 && n > 0.8 * mid) g = ['+' + A, '+' + Math.round(0.5 * A)];
    } else {
      var t = rng.int(0, 5);
      g = t === 0 ? ['x2', '+' + Math.round(1.5 * A), '-' + A] : (t === 1 ? ['x2', '/2', '+' + A] : (t === 2 ? ['pop', 'spd', '+' + A] :
        (t === 3 ? ['grow', 'grow', '-' + Math.round(0.7 * A)] : (t === 4 ? ['+' + A, '-' + Math.round(0.6 * A), '+' + Math.round(0.5 * A)] : ['+' + Math.round(1.2 * A), '/2', 'grow']))));
      if ((t === 0 || t === 1) && n > 0.8 * mid) g[0] = '+' + Math.round(0.8 * A);       // no doubling of an already big squad
    }
    return shuffle(g, rng);
  }
  EL.update = function () {
    var G = PP.G, rng = G.rng, tl = G.tl;
    EL.sync();
    var Le = G.L, esc = EL.esc(Le);
    if (tl >= EL.nextBoss) {
      EL.nextBoss += EL.BOSS_EVERY;
      var type = rng.int(1, 4);
      PP.run.bossIntro(type, EL.bossHp(Le, type), true);
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
        var w = EL.wave, den = Math.min(26, 5 + 0.45 * (Le - 1));
        w.e = pickEnemy(rng, Le);
        w.p = (w.e === 'cloud') ? 'line' : rng.pick(PATS);
        var nmax = Math.min(10, Math.floor(3 + Le / 5));
        w.n = w.e === 'cloud' ? 2 : (w.e === 'snail' || w.e === 'twin' ? rng.int(2, 4) : rng.int(3, nmax));
        w.el = rng() < EL.eliteShare(Le) ? 1 : 0;
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
    var free = !blocked && tl > EL.lastGate + 4.5 && tl < EL.nextGate - 4;
    var OB = PP.obst, EN = PP.enemies, lane, x, r;
    // hazards: their own clock, every 15 s early and every 7 s late; half of them block the centre
    if (tl >= EL.nextHaz && free) {
      EL.nextHaz = tl + EL.hazardGap(Le) * rng.range(0.85, 1.15);
      r = rng(); x = rng() < 0.5 ? 180 : U.laneX(rng.int(0, 3));
      if (r < 0.4 || Le < 11) OB.spawn('spinner', x);
      else if (r < 0.75 || Le < 20) OB.spawn('roller', x);
      else OB.spawn('fence', rng() < 0.5 ? rng.range(70, 100) : rng.range(260, 290));
      EL.nextObj = Math.max(EL.nextObj, tl + 2.5);
    } else if (tl >= EL.nextObj && free) {
      EL.nextObj = tl + rng.range(9, 15) * (1 + 0.5 * esc);
      r = rng(); lane = rng.int(0, 3); x = U.laneX(lane);
      if (r < 0.25) EN.spawn('crate', x, G.oy - 40, false);
      else if (r < 0.37) EN.spawn('jar', x, G.oy - 40, false);
      else if (r < 0.5 && Le >= 16) OB.spawn('syrup', x);
      else if (r < 0.58 && Le >= 21) OB.spawn('ice', 180);
      else PP.pickups.spawn(rng.pick(['heart', 'heart', 'shield', 'frenzy', 'magnet', 'stack']), x, G.oy - 30, false);
      EL.nextHaz = Math.max(EL.nextHaz, tl + 2.5);
    }
  };
  EL.bossDone = function () {
    var G = PP.G;
    EL.lastGate = G.tl; EL.nextGate = G.tl + 3.5; EL.nextWave = G.tl + 6; EL.nextObj = G.tl + 9; EL.nextHaz = Math.max(EL.nextHaz, G.tl + 7);
    PP.pickups.spawn('heart', 140, G.oy + 60, true); PP.pickups.spawn('stack', 180, G.oy + 60, true); PP.pickups.spawn('stack', 220, G.oy + 60, true);
    if (PP.game && !PP.headless) PP.game.onBossEnd();
  };
})();
