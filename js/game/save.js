/* Pompom Parade - save data: versioned JSON (< 4 KB), migration, debounced async writes.
 * Never writes before the first load has resolved (writes are queued). */
(function () {
  'use strict';
  var PP = window.PP;
  var SV = PP.save = { data: null, loaded: false, queued: false, timer: 0, writes: 0 };
  var WEAPONS = ['wand', 'shaker', 'gumball', 'star', 'cookie', 'confetti', 'beam'];
  var UPG = ['power', 'rate', 'buddy', 'shield', 'luck', 'magnet'];
  var UPG_MAX = { power: 15, rate: 12, buddy: 6, shield: 3, luck: 5, magnet: 4 };

  SV.defaults = function () {
    var d = {
      v: 2, unlocked: 1, levels: {}, buttons: 0,
      upg: { power: 0, rate: 0, buddy: 0, shield: 0, luck: 0, magnet: 0 },
      weapons: {}, equipped: 'wand', toy: 1,            // toy: the shared Toy Level (1-5) of every weapon
      settings: { music: 1, sfx: 1, vib: 1, shake: 1, sens: 1, lang: 'auto' },
      hints: {}, endlessBest: 0, fails: {}, stats: { pops: 0, plays: 0 }, ended: 0
    };
    for (var i = 0; i < WEAPONS.length; i++) d.weapons[WEAPONS[i]] = { own: i === 0 ? 1 : 0 };
    return d;
  };
  function num(v, def, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) return def;
    v = Math.floor(v);
    if (v < lo) v = lo; if (v > hi) v = hi;
    return v;
  }
  /* fill defaults, clamp, tolerate unknown / old versions. Never throws. */
  SV.migrate = function (o) {
    var d = SV.defaults(), i, k;
    if (!o || typeof o !== 'object') return d;
    try {
      d.unlocked = num(o.unlocked, 1, 1, 31);
      d.buttons = num(o.buttons, 0, 0, 9999999);
      d.endlessBest = num(o.endlessBest, 0, 0, 99999999);
      d.ended = o.ended ? 1 : 0;
      if (o.levels && typeof o.levels === 'object') {
        for (k in o.levels) {
          var L = num(k, 0, 0, 30), lv = o.levels[k];
          if (L >= 1 && lv && typeof lv === 'object') d.levels[L] = { s: num(lv.s, 0, 0, 3), best: num(lv.best, 0, 0, 999), pct: num(lv.pct, 0, 0, 100) };
        }
      }
      if (o.upg && typeof o.upg === 'object') for (i = 0; i < UPG.length; i++) d.upg[UPG[i]] = num(o.upg[UPG[i]], 0, 0, UPG_MAX[UPG[i]]);
      var toy = num(o.toy, 1, 1, 5);
      if (o.weapons && typeof o.weapons === 'object') {
        for (i = 0; i < WEAPONS.length; i++) {
          var w = o.weapons[WEAPONS[i]];
          if (w && typeof w === 'object') {
            d.weapons[WEAPONS[i]] = { own: (w.own || i === 0) ? 1 : 0 };
            // v1 saves had one level per weapon: the shared Toy Level starts at the highest owned one
            if ((w.own || i === 0) && num(w.lv, 1, 1, 5) > toy) toy = num(w.lv, 1, 1, 5);
          }
        }
      }
      d.toy = toy;
      if (typeof o.equipped === 'string' && d.weapons[o.equipped] && d.weapons[o.equipped].own) d.equipped = o.equipped;
      if (o.settings && typeof o.settings === 'object') {
        var s = o.settings;
        d.settings.music = s.music === 0 || s.music === false ? 0 : 1;
        d.settings.sfx = s.sfx === 0 || s.sfx === false ? 0 : 1;
        d.settings.vib = s.vib === 0 || s.vib === false ? 0 : 1;
        d.settings.shake = s.shake === 0 || s.shake === false ? 0 : 1;
        d.settings.sens = (s.sens === 0.8 || s.sens === 1.3) ? s.sens : 1;
        d.settings.lang = (s.lang === 'en' || s.lang === 'fr') ? s.lang : 'auto';
      }
      if (o.hints && typeof o.hints === 'object') for (k in o.hints) if (o.hints[k] && k.length < 24) d.hints[k] = 1;
      if (o.fails && typeof o.fails === 'object') for (k in o.fails) { var f = num(o.fails[k], 0, 0, 99); if (f > 0 && num(k, 0, 0, 30) >= 1) d.fails[num(k, 0, 0, 30)] = f; }
      if (o.stats && typeof o.stats === 'object') { d.stats.pops = num(o.stats.pops, 0, 0, 1e9); d.stats.plays = num(o.stats.plays, 0, 0, 1e9); }
    } catch (e) { return SV.defaults(); }
    return d;
  };
  SV.parse = function (str) {
    if (!str) return SV.defaults();
    var o = null;
    try { o = JSON.parse(str); } catch (e) { o = null; }   // corrupt -> defaults, never crash
    return SV.migrate(o);
  };
  SV.load = function () {
    return PP.storage.load().then(function (str) {
      SV.data = PP.params.reset === '1' ? SV.defaults() : SV.parse(str);
      SV.loaded = true;
      if (SV.queued || PP.params.reset === '1') { SV.queued = false; SV.write(); }
      return SV.data;
    }, function () { SV.data = SV.defaults(); SV.loaded = true; return SV.data; });
  };
  function doWrite() {
    SV.timer = 0;
    if (!SV.loaded || !SV.data) return Promise.resolve(false);
    var str = '';
    try { str = JSON.stringify(SV.data); } catch (e) { return Promise.resolve(false); }
    SV.writes++;
    SV.lastSize = str.length;
    PP.events.emit('save', { bytes: str.length });
    return PP.storage.save(str);
  }
  /* debounced 500 ms */
  SV.write = function () {
    if (!SV.loaded) { SV.queued = true; return; }
    if (SV.timer) return;
    SV.timer = setTimeout(doWrite, 500);
  };
  SV.flush = function () {
    if (!SV.loaded) { SV.queued = true; return Promise.resolve(false); }
    if (SV.timer) { clearTimeout(SV.timer); SV.timer = 0; }
    return doWrite();
  };
  SV.reset = function () { SV.data = SV.defaults(); return SV.flush(); };
  SV.totalStars = function () { var n = 0, l = SV.data.levels; for (var k in l) n += l[k].s || 0; return n; };
  SV.cleared = function (L) { var l = SV.data.levels[L]; return !!(l && l.s > 0); };
  SV.endlessUnlocked = function () { return SV.cleared(30) || !!SV.data.ended; };
})();
