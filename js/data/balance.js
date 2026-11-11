/* Pompom Parade - difficulty curve (GDD 4.2). All balance lookups go through PP.bal. */
(function () {
  'use strict';
  var PP = window.PP;
  // authoritative hpMult table, index = level
  var HP = [0, 1.00, 1.39, 1.81, 2.26, 2.74, 3.25, 3.33, 4.37, 4.98, 5.61, 6.28, 6.98, 6.79, 8.47, 9.26, 10.1, 10.9, 11.8,
    11.2, 13.7, 14.7, 15.7, 16.7, 17.8, 16.6, 20.0, 21.2, 22.4, 23.6, 24.8];
  var BOSS_HP = { 6: 11400, 12: 29000, 18: 56800, 24: 97200, 30: 169200 };
  var BOSS_T = { 6: 25, 12: 30, 18: 35, 24: 40, 30: 50 };
  /* Retune factors found with the balance harness (GDD 4.2 "Retune procedure"):
   * multiplies hpMult (and boss HP) per level. 1 = table value. */
  var TUNE = [0,
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1];
  var B = PP.bal = { HP: HP, TUNE: TUNE, BOSS_HP: BOSS_HP };

  B.mid = function (L) { return 5 + 1.6 * (L - 1); };
  B.peak = function (L) { return 1.4 * B.mid(L); };
  B.M = function (L) { return 1 + 0.045 * (L - 1); };
  B.expDps = function (L) { return B.mid(L) * 24 * B.M(L); };
  B.density = function (L) { return Math.min(26, 5 + 0.45 * (L - 1)); };
  B.pressure = function (L) { var p = 0.125 + 0.012 * (L - 1); return ((L - 1) % 6 === 0) ? p * 0.88 : p; };
  B.runLen = function (L) { return Math.round(60 + 1.5 * (L - 1)); };
  B.scroll = function (L) { return Math.min(132, Math.round(80 + 1.5 * (L - 1))); };
  B.A = function (L) { return Math.round(3 + 0.55 * L); };
  B.isBoss = function (L) { return L % 6 === 0 && L <= 30; };
  B.world = function (L) { return Math.min(5, Math.floor((L - 1) / 6) + 1); };
  /* hpMult for integer levels 1..30, continuous above (endless) */
  B.hpMult = function (L) {
    if (L <= 1) return HP[1] * TUNE[1];
    if (L >= 30) return HP[30] * TUNE[30] * Math.pow(1.08, L - 30);
    var a = Math.floor(L), f = L - a;
    var v = HP[a] * TUNE[a];
    if (f > 0) v += (HP[a + 1] * TUNE[a + 1] - v) * f;
    return v;
  };
  B.bossHp = function (L) {
    if (BOSS_HP[L]) return Math.round(BOSS_HP[L] * TUNE[L] / 100) * 100;
    return Math.round(1.4 * B.mid(L) * 24 * B.M(L) * 30 * 0.85 / 100) * 100;
  };
  B.star2 = function (L) { return Math.round(0.8 * B.mid(L)); };
  B.star3 = function (L) { return Math.round(1.15 * B.mid(L)); };
  B.hazardCost = function (listed, L) { return Math.max(listed, Math.round(0.08 * B.mid(L))); };
  B.bossCost = function (f, L) { return Math.max(1, Math.round(f * B.mid(L))); };
  B.heartGain = function (L) { return Math.max(3, Math.round(0.1 * B.mid(L))); };
  B.ramp = function (t, T) { var k = T > 0 ? t / T : 0.5; if (k > 1) k = 1; if (k < 0) k = 0; return 0.6 + 0.8 * k; };
  B.winBase = function (L) { return 20 + 6 * L; };
})();
