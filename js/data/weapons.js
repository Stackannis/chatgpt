/* Pompom Parade - the 7 toy weapons (GDD 3.3) */
(function () {
  'use strict';
  var PP = window.PP;
  // maxVolley: volleys per second actually emitted; any extra fire rate is folded into damage
  // so projectile counts stay bounded.
  var W = PP.data.weapons = [
    { id: 'wand', idx: 0, unlock: 0, ecap: 10, dmg: 8, rate: 3.0, speed: 520, r: 5, eff: 1.00, maxVolley: 6, pierce: 0, color: '#5FE3FF', bars: [3, 4, 2] },
    { id: 'shaker', idx: 1, unlock: 3, ecap: 5, dmg: 3.5, rate: 3.0, speed: 600, r: 3, eff: 1.05, maxVolley: 5, pierce: 0, color: '#FF8AD8', bars: [3, 4, 4] },
    { id: 'gumball', idx: 2, unlock: 6, ecap: 6, dmg: 30, rate: 0.9, speed: 400, r: 8, eff: 1.10, maxVolley: 4, pierce: 2, color: '#FF7AA8', bars: [5, 1, 4] },
    { id: 'star', idx: 3, unlock: 10, ecap: 8, dmg: 9.5, rate: 2.8, speed: 420, r: 5, eff: 1.10, maxVolley: 5, pierce: 0, color: '#FFD23F', bars: [3, 4, 5] },
    { id: 'cookie', idx: 4, unlock: 14, ecap: 4, dmg: 15, rate: 1.25, speed: 380, r: 9, eff: 1.15, maxVolley: 3.75, pierce: 99, range: 260, color: '#C98A4A', bars: [4, 2, 5] },
    { id: 'confetti', idx: 5, unlock: 18, ecap: 5, dmg: 16, splash: 10, splashR: 36, rate: 1.5, speed: 450, r: 6, eff: 1.20, maxVolley: 4.5, pierce: 0, color: '#7CE38B', bars: [4, 3, 5] },
    // beam: dmg is per tick (10 ticks/s) => 24 DPS per pompom
    { id: 'beam', idx: 6, unlock: 24, ecap: 1, dmg: 2.4, rate: 10, speed: 0, r: 0, eff: 1.25, maxVolley: 10, pierce: 1, color: '#FFFFFF', bars: [5, 5, 4] }
  ];
  var byId = {};
  for (var i = 0; i < W.length; i++) byId[W[i].id] = W[i];
  PP.data.weaponById = byId;
  /* cost to reach level k (2..5) */
  PP.data.weaponCost = function (idx, k) { return Math.round(150 * Math.pow(1.8, k - 2) * (1 + 0.15 * idx)); };
  PP.data.weaponLvMult = function (lv) { return 1 + 0.10 * (lv - 1); };
  /* weapon unlocked by clearing level L (or null) */
  PP.data.weaponUnlockedAt = function (L) {
    for (var i = 1; i < W.length; i++) if (W[i].unlock === L) return W[i];
    return null;
  };
  PP.data.nextWeaponAfter = function (L) {
    for (var i = 1; i < W.length; i++) if (W[i].unlock > L) return W[i];
    return null;
  };
})();
