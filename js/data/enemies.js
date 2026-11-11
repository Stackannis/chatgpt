/* Pompom Parade - Grumblies and other shootable things (GDD 3.4 / 3.5).
 * Everything that can be hit by a pompom shot lives in the same pool and uses these defs. */
(function () {
  'use strict';
  var PP = window.PP;
  // ai: behaviour id; grumbly: counts for density / Sparkle Meter; drop: [chance, buttons]
  var E = PP.data.enemies = {
    jelly: { id: 'jelly', intro: 1, hp: 24, speed: 20, bump: 1, r: 14, ai: 'walk', drop: [0.25, 1], grumbly: true, spr: 'e_jelly', color: '#9B7BFF' },
    dust: { id: 'dust', intro: 3, hp: 12, speed: 75, bump: 1, r: 11, ai: 'zigzag', drop: [0.20, 1], grumbly: true, spr: 'e_dust', color: '#9A9AB0' },
    bean: { id: 'bean', intro: 5, hp: 40, speed: 25, bump: 2, r: 13, ai: 'hop', drop: [0.30, 1], grumbly: true, spr: 'e_bean', color: '#6CCB7A' },
    twin: { id: 'twin', intro: 8, hp: 50, speed: 15, bump: 2, r: 18, ai: 'walk', drop: [0.40, 1], grumbly: true, spr: 'e_twin', color: '#4FD1C5', split: true },
    cloud: { id: 'cloud', intro: 9, hp: 70, speed: 40, bump: 2, r: 20, ai: 'cloud', drop: [0.50, 1], grumbly: true, spr: 'e_cloud', color: '#8E9AC9' },
    snail: { id: 'snail', intro: 14, hp: 40, shell: 100, speed: 12, bump: 3, r: 20, ai: 'walk', drop: [0.60, 2], grumbly: true, spr: 'e_snail', color: '#E07AC0' },
    dasher: { id: 'dasher', intro: 15, hp: 45, speed: 30, bump: 3, r: 16, ai: 'dash', drop: [0.50, 2], grumbly: true, spr: 'e_dasher', color: '#FF9E5E' },
    // derived / spawned by others
    mini: { id: 'mini', hp: 14, speed: 15, bump: 1, r: 10, ai: 'mini', drop: [0.15, 1], grumbly: true, spr: 'e_mini', color: '#4FD1C5' },
    minijelly: { id: 'minijelly', hp: 24 * 0.6, speed: 60, bump: 1, r: 12, ai: 'walk', drop: [0.1, 1], grumbly: false, spr: 'e_jelly', color: '#9B7BFF', scale: 0.85 },
    drop: { id: 'drop', hp: 1, speed: 0, bump: 1, r: 7, ai: 'shot', drop: [0, 0], grumbly: false, spr: 'e_drop', color: '#FF3FA4', fixedHp: true },
    snowball: { id: 'snowball', hp: 30, speed: 0, bump: 1, r: 11, ai: 'shot', drop: [0, 0], grumbly: false, spr: 'e_snowball', color: '#FF3FA4' },
    orb: { id: 'orb', hp: 1, speed: 0, bump: 1, r: 15, ai: 'orb', drop: [0, 0], grumbly: false, spr: 'e_orb', color: '#FF8AD8' },
    // destructible obstacles
    crate: { id: 'crate', intro: 2, hp: 40, speed: 0, bump: 2, r: 19, ai: 'static', drop: [1, 3], grumbly: false, obstacle: true, spr: 'o_crate', color: '#D9A066', dmgNum: true },
    gift: { id: 'gift', intro: 10, hp: 60, speed: 0, bump: 2, r: 19, ai: 'static', drop: [0, 0], grumbly: false, obstacle: true, spr: 'o_gift', color: '#FF7AA8', noRamp: true },
    jar: { id: 'jar', intro: 11, hp: 80, speed: 0, bump: 2, r: 18, ai: 'static', drop: [1, 10], grumbly: false, obstacle: true, spr: 'o_jar', color: '#8FD8FF', noRamp: true, dmgNum: true }
  };
  PP.data.grumblyIds = ['jelly', 'dust', 'bean', 'twin', 'cloud', 'snail', 'dasher'];
  /* average HP contribution of one spawned enemy of this type (for Sparkle Meter totals) */
  PP.data.enemyHpUnits = function (id) {
    var d = E[id]; if (!d) return 0;
    var h = d.hp + (d.shell || 0);
    if (d.split) h += 2 * E.mini.hp;
    return h;
  };
})();
