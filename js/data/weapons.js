/* Pompom Parade - the 7 toy weapons (GDD 3.3, FIX_PLAN_R1).
 * One shared Toy Level (1-5) applies to every weapon; the Lv3 / Lv5 perks belong to whichever toy is equipped.
 * eff = nominal strength relative to the Bubble Wand (24 DPS per pompom x eff on its favourite targets). */
(function () {
  'use strict';
  var PP = window.PP;
  // maxVolley: volleys per second actually emitted; any extra fire rate is folded into damage
  // so projectile counts stay bounded. role: what the toy is best at (icons on the Workshop card).
  var W = PP.data.weapons = [
    { id: 'wand', idx: 0, unlock: 0, ecap: 10, dmg: 8, rate: 3.0, speed: 520, r: 5, eff: 1.00, maxVolley: 6, pierce: 0, color: '#2FC8F0', bars: [3, 4, 2], role: ['e_jelly'] },
    { id: 'shaker', idx: 1, unlock: 3, ecap: 5, dmg: 3.5, rate: 3.0, speed: 600, r: 3, eff: 1.06, maxVolley: 5, pierce: 0, color: '#FF8AD8', bars: [3, 4, 4], role: ['e_dust', 'e_dust', 'e_dust'] },
    { id: 'gumball', idx: 2, unlock: 6, ecap: 6, dmg: 30, rate: 0.9, speed: 400, r: 8, eff: 1.12, maxVolley: 4, pierce: 2, color: '#FF7AA8', bars: [5, 1, 4], role: ['e_snail', 'o_crate', 'h_bossico'], bossMult: 1.5 },
    // star: the "easy aim" toy. It homes (50 degree cone, 4.5 rad/s) but pays for it: lowest eff, half damage to
    // shells and crates, and it never homes in on a boss.
    { id: 'star', idx: 3, unlock: 10, ecap: 8, dmg: 7.9, rate: 2.8, speed: 420, r: 5, eff: 0.92, maxVolley: 5, pierce: 0, color: '#FFD23F', bars: [2, 4, 5], role: ['h_hand'], turn: 4.5, cone: 50, hardMult: 0.5 },
    { id: 'cookie', idx: 4, unlock: 14, ecap: 5, dmg: 19, rate: 1.25, speed: 420, r: 9, eff: 1.24, maxVolley: 3.75, pierce: 99, range: 300, color: '#8A4F1F', bars: [4, 2, 5], role: ['e_jelly', 'e_jelly', 'e_jelly'], roleCol: true },
    { id: 'confetti', idx: 5, unlock: 18, ecap: 5, dmg: 21, splash: 13, splashR: 36, rate: 1.5, speed: 450, r: 6, eff: 1.32, maxVolley: 4.5, pierce: 0, color: '#7CE38B', bars: [4, 3, 5], role: ['e_twin', 'e_mini', 'e_mini'], twinMult: 1.5 },
    // beam: dmg is per tick (10 ticks/s) => 33.6 DPS per pompom (24 x eff)
    { id: 'beam', idx: 6, unlock: 24, ecap: 1, dmg: 3.36, rate: 10, speed: 0, r: 0, eff: 1.40, maxVolley: 10, pierce: 1, color: '#FFFFFF', bars: [5, 5, 4], role: ['h_bossico', 'e_crown'], bossMult: 1.4, eliteMult: 1.4 }
  ];
  var byId = {};
  for (var i = 0; i < W.length; i++) byId[W[i].id] = W[i];
  PP.data.weaponById = byId;
  /* cost to raise the shared Toy Level to k (2..5): 150, 270, 486, 875 */
  PP.data.toyCost = function (k) { return Math.round(150 * Math.pow(1.8, k - 2)); };
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
