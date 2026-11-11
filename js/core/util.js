/* Pompom Parade - math helpers, seeded RNG (mulberry32), object pool */
(function () {
  'use strict';
  var PP = window.PP;
  var U = PP.util = {};
  U.TAU = Math.PI * 2;
  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.approach = function (v, target, maxDelta) {
    if (v < target) { v += maxDelta; return v > target ? target : v; }
    v -= maxDelta; return v < target ? target : v;
  };
  U.easeOutBack = function (t) { var c = 1.70158; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  U.easeOut = function (t) { return 1 - (1 - t) * (1 - t); };
  U.laneOf = function (x) { return U.clamp(Math.floor((x - 30) / 75), 0, 3); };
  U.laneX = function (i) { return 67.5 + 75 * i; };

  /* mulberry32 seeded RNG. r() -> [0,1) */
  U.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    var r = function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = function (lo, hi) { return lo + (hi - lo) * r(); };
    r.int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
    r.chance = function (p) { return r() < p; };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    return r;
  };

  /* Fixed-capacity pool: active items are items[0..n-1]; removal by swap. */
  function Pool(cap, factory) {
    this.items = [];
    for (var i = 0; i < cap; i++) this.items.push(factory());
    this.n = 0; this.cap = cap;
  }
  Pool.prototype.spawn = function () {
    if (this.n >= this.cap) return null;
    return this.items[this.n++];
  };
  Pool.prototype.killAt = function (i) {
    var a = this.items, last = --this.n;
    if (i !== last) { var t = a[i]; a[i] = a[last]; a[last] = t; }
  };
  Pool.prototype.clear = function () { this.n = 0; };
  U.Pool = Pool;

  /* colour helpers (build-time only) */
  U.hex = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.mix = function (a, b, t) {
    var x = U.hex(a), y = U.hex(b);
    var r = Math.round(x[0] + (y[0] - x[0]) * t), g = Math.round(x[1] + (y[1] - x[1]) * t), bl = Math.round(x[2] + (y[2] - x[2]) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  };
  U.light = function (c, t) { return U.mix(c, '#ffffff', t); };
  U.dark = function (c, t) { return U.mix(c, '#3a2a48', t); };
  U.rgba = function (c, a) { var x = U.hex(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; };
})();
