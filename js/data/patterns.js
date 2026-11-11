/* Pompom Parade - wave pattern library (shared by authored levels, Endless and the validator).
 * place() fills X[] (road x) and DY[] (distance above the spawn line, i.e. arrival delay). */
(function () {
  'use strict';
  var PP = window.PP, U = PP.util, TAU = Math.PI * 2;
  var PT = PP.patterns = {
    list: ['line', 'column', 'v', 'wall', 'zigzag', 'cluster', 'sides', 'stream', 'pincer'],
    X: new Float32Array(24), DY: new Float32Array(24), MAX: 12
  };
  var ZZ = [0, 1, 2, 3, 2, 1];
  /* p: pattern id, n: enemy count, o: {x, lane, gap}, rng: seeded, vy: enemy screen speed (stream spacing) */
  PT.place = function (p, n, o, rng, vy) {
    var X = PT.X, DY = PT.DY, i, k, cx, cnt = 0;
    o = o || {};
    if (n > PT.MAX) n = PT.MAX;
    if (n < 1) n = 1;
    switch (p) {
      case 'column': {
        var lane = o.lane !== undefined ? o.lane : rng.int(0, 3);
        for (i = 0; i < n; i++) { X[i] = U.laneX(lane); DY[i] = 40 * i; }
        cnt = n; break;
      }
      case 'v':
        cx = o.x !== undefined ? o.x : 180;
        for (i = 0; i < n; i++) { k = (i + 1) >> 1; X[i] = U.clamp(cx + (i % 2 ? -1 : 1) * 36 * k, 46, 314); DY[i] = 30 * k; }
        cnt = n; break;
      case 'wall': {
        var gs = 6 - n; if (gs < 1) gs = 1; if (gs > 4) gs = 4;
        var g0 = o.gap !== undefined ? o.gap : rng.int(0, 6 - gs);
        if (g0 > 6 - gs) g0 = 6 - gs;
        for (i = 0; i < 6; i++) { if (i >= g0 && i < g0 + gs) continue; X[cnt] = 55 + 50 * i; DY[cnt] = 0; cnt++; }
        break;
      }
      case 'zigzag': {
        var st = o.lane !== undefined ? o.lane : 0;
        for (i = 0; i < n; i++) { X[i] = U.laneX(ZZ[(i + st) % 6]); DY[i] = 36 * i; }
        cnt = n; break;
      }
      case 'cluster': {
        cx = o.x !== undefined ? o.x : rng.range(90, 270);
        var R = 10 + 5 * n;
        for (i = 0; i < n; i++) { var a = i * TAU / n; X[i] = U.clamp(cx + R * Math.cos(a), 46, 314); DY[i] = R + R * Math.sin(a); }
        cnt = n; break;
      }
      case 'sides':
        for (i = 0; i < n; i++) { X[i] = i % 2 ? U.laneX(3) : U.laneX(0); DY[i] = 42 * (i >> 1); }
        cnt = n; break;
      case 'stream':
        for (i = 0; i < n; i++) { X[i] = rng.range(50, 310); DY[i] = i * 0.3 * (vy || 120); }
        cnt = n; break;
      case 'pincer':
        for (i = 0; i < n; i++) { k = i >> 1; X[i] = i % 2 ? 310 - 26 * k : 50 + 26 * k; DY[i] = 30 * k; }
        cnt = n; break;
      default: // 'line'
        if (o.x !== undefined && n <= 3) { for (i = 0; i < n; i++) { X[i] = U.clamp(o.x + (i - (n - 1) / 2) * 56, 46, 314); DY[i] = 0; } }
        else for (i = 0; i < n; i++) { X[i] = 30 + 300 * (i + 0.5) / n; DY[i] = 0; }
        cnt = n;
    }
    return cnt;
  };
  /* number of enemies a wave beat produces */
  PT.count = function (p, n) {
    if (n > PT.MAX) n = PT.MAX;
    if (p === 'wall') { var gs = 6 - n; if (gs < 1) gs = 1; if (gs > 4) gs = 4; return 6 - gs; }
    return n < 1 ? 1 : n;
  };
  /* extra delay (s) until the last enemy of the wave reaches the spawn line */
  PT.span = function (p, n, vy) {
    switch (p) {
      case 'column': return 40 * (n - 1) / vy;
      case 'v': return 30 * ((n) >> 1) / vy;
      case 'zigzag': return 36 * (n - 1) / vy;
      case 'cluster': return 2 * (10 + 5 * n) / vy;
      case 'sides': return 42 * ((n - 1) >> 1) / vy;
      case 'stream': return (n - 1) * 0.3;
      case 'pincer': return 30 * ((n - 1) >> 1) / vy;
      default: return 0;
    }
  };
})();
