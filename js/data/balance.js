/* Pompom Parade - difficulty curve (GDD 4.2, FIX_PLAN_R1). All balance lookups go through PP.bal.
 *
 * There is no per-level retune table any more. Enemy toughness is
 *     hpMult(L) = BASE(L) x g(L) x ADJ[L]
 * BASE: smooth analytic base curve, g(L): global piecewise-linear factor with 4 knots (L1, L12, L20, L30),
 * ADJ: optional per-level correction, never more than +-8 %.
 * The amount of enemies is set by hpsTarget(L), the level's wave HP per second, which rises 0-20 % from one
 * normal level to the next and dips to 85-95 % (of L-2) on the first level of each world. tools/gen_levels.js
 * composes every level to that budget and the validator checks it. */
(function () {
  'use strict';
  var PP = window.PP;
  var BOSS_T = { 6: 25, 12: 30, 18: 35, 24: 40, 30: 50 };            // design time-to-kill (s) at mid squad
  /* global smooth factor: [level, factor] knots, linear in between */
  var G_KNOTS = [[1, 1.00], [12, 1.00], [20, 1.00], [30, 1.00]];
  /* per-level correction, each within 0.92 .. 1.08 */
  var ADJ = {};
  /* one boss HP factor per world (index = world 1..5) */
  var BOSS_TUNE = [0, 0.75, 0.46, 1.80, 1.25, 0.80];
  /* wave HP per second: start value, growth per normal level (per world), world-opening dip (vs L-2) */
  var HPS = { a: 24, r: [0, 1.18, 1.18, 1.14, 1.18, 1.18], d: [0, 1, 0.92, 0.92, 0.92, 0.92], boss: 1.0 };
  /* Boss hit costs are softer in the first two worlds */
  var BOSS_COST_W = [0, 0.6, 0.75, 1, 1, 1];
  var B = PP.bal = { G_KNOTS: G_KNOTS, ADJ: ADJ, BOSS_TUNE: BOSS_TUNE, HPS: HPS, BOSS_T: BOSS_T, BOSS_COST_W: BOSS_COST_W };

  B.mid = function (L) { return 5 + 1.6 * (L - 1); };
  B.peak = function (L) { return 1.4 * B.mid(L); };
  B.M = function (L) { return 1 + 0.045 * (L - 1); };
  B.expDps = function (L) { return B.mid(L) * 24 * B.M(L); };
  B.runLen = function (L) { return Math.round(60 + 1.5 * (L - 1)); };
  B.scroll = function (L) { return Math.min(132, Math.round(80 + 1.5 * (L - 1))); };
  B.A = function (L) { return Math.round(3 + 0.55 * L); };
  B.isBoss = function (L) { return L % 6 === 0 && L <= 30; };
  B.world = function (L) { return Math.min(5, Math.floor((L - 1) / 6) + 1); };

  B.g = function (L) {
    var k = G_KNOTS, i;
    if (L <= k[0][0]) return k[0][1];
    for (i = 1; i < k.length; i++) if (L <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (L - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
    return k[k.length - 1][1];
  };
  /* smooth base toughness: 1.25 at L1, about x1.07 per level */
  B.base = function (L) { return 1.25 * Math.pow(1.072, L - 1); };
  function hpInt(L) { var a = ADJ[L] || 1; if (a < 0.92) a = 0.92; if (a > 1.08) a = 1.08; return B.base(L) * B.g(L) * a; }
  /* hpMult for integer levels 1..30, continuous in between and above (Endless) */
  B.hpMult = function (L) {
    if (L <= 1) return hpInt(1);
    if (L >= 30) return hpInt(30) * Math.pow(1.08, L - 30);
    var a = Math.floor(L), f = L - a, v = hpInt(a);
    if (f > 0) v += (hpInt(a + 1) - v) * f;
    return v;
  };
  /* target wave HP per second of level L (monotonic by construction, see the header) */
  var hpsCache = null;
  B.hpsTarget = function (L) {
    if (!hpsCache) {
      hpsCache = [0];
      for (var l = 1; l <= 30; l++) {
        var w = B.world(l), v;
        if (l === 1) v = HPS.a;
        else if (B.isBoss(l)) v = hpsCache[l - 1] * HPS.boss;            // boss run-in: like the level before it
        else if ((l - 1) % 6 === 0) v = hpsCache[l - 2] * HPS.d[w];      // first level of a world: breather
        else v = hpsCache[l - 1] * HPS.r[w];
        hpsCache.push(v);
      }
    }
    L = Math.round(L);
    return hpsCache[L < 1 ? 1 : (L > 30 ? 30 : L)];
  };
  B.resetCache = function () { hpsCache = null; };
  /* enemies per 10 s that the budget buys with an average enemy of `units` HP units (info only) */
  B.density = function (L, units) { return 10 * B.hpsTarget(L) / (B.hpMult(L) * (units || 30)); };

  B.bossHp = function (L) {
    var w = B.world(L), t = BOSS_T[L] || 30;
    return Math.round(1.4 * B.mid(L) * 24 * B.M(L) * t * 0.85 * (B.isBoss(L) ? BOSS_TUNE[w] : 1) / 100) * 100;
  };
  B.star2 = function (L) { return Math.round(0.8 * B.mid(L)); };
  B.star3 = function (L) { return Math.round(1.15 * B.mid(L)); };
  B.hazardCost = function (listed, L) { return Math.max(listed, Math.round(0.05 * B.mid(L))); };
  B.bossCost = function (f, L) { return Math.max(1, Math.round(f * B.mid(L) * BOSS_COST_W[B.world(L)])); };
  /* shortest telegraph of any attack: 1.0 s in worlds 1-2, 0.8 s afterwards */
  B.telegraph = function (L) { return L <= 12 ? 1.0 : 0.8; };
  B.heartGain = function (L) { return Math.max(3, Math.round(0.1 * B.mid(L))); };
  B.ramp = function (t, T) { var k = T > 0 ? t / T : 0.5; if (k > 1) k = 1; if (k < 0) k = 0; return 0.6 + 0.8 * k; };
  B.winBase = function (L) { return 20 + 6 * L; };
  /* read-only views for reports (review/gameplay/curve.js prints them): base curve and g(L) x ADJ per level */
  B.HP = [0]; B.TUNE = [0];
  for (var l = 1; l <= 30; l++) { B.HP.push(Math.round(B.base(l) * 100) / 100); B.TUNE.push(Math.round(B.g(l) * (ADJ[l] || 1) * 1000) / 1000); }
})();
