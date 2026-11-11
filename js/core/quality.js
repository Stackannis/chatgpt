/* Pompom Parade - adaptive quality scaler.
 * Levels: 0 full, 1 particles x0.5, 2 DPR cap 1.5, 3 DPR cap 1, 4 no side-decor animation. */
(function () {
  'use strict';
  var PP = window.PP;
  var N = 90;
  var ring = new Float32Array(N), idx = 0, filled = 0, sum = 0;
  var Q = PP.quality = {
    level: 0, forced: false, avg: 16.7, particleCap: 220, dprCap: 2, decorAnim: true,
    goodTime: 0, lastChange: -1e9, changes: [], name: 'high'
  };
  function apply() {
    var l = Q.level;
    Q.particleCap = l >= 1 ? 90 : 220;
    var cap = l >= 3 ? 1 : (l >= 2 ? 1.5 : 2);
    Q.decorAnim = l < 4;
    Q.name = l === 0 ? 'high' : (l <= 2 ? 'mid' : 'low');
    if (cap !== Q.dprCap) { Q.dprCap = cap; if (PP.R && PP.R.ready) PP.R.resize(true); }
  }
  Q.set = function (l) { Q.level = l < 0 ? 0 : (l > 4 ? 4 : l); apply(); };
  Q.init = function () {
    var q = PP.params.quality;
    if (q === 'low') { Q.forced = true; Q.level = 4; }
    else if (q === 'mid') { Q.forced = true; Q.level = 2; }
    else if (q === 'high') { Q.forced = true; Q.level = 0; }
    var l = Q.level;
    Q.particleCap = l >= 1 ? 90 : 220;
    Q.dprCap = l >= 3 ? 1 : (l >= 2 ? 1.5 : 2);
    Q.decorAnim = l < 4;
    Q.name = l === 0 ? 'high' : (l <= 2 ? 'mid' : 'low');
  };
  function reset() { filled = 0; sum = 0; wsum = 0; idx = 0; ring.fill(0); wring.fill(0); Q.goodTime = 0; }
  var wring = new Float32Array(N), wsum = 0;
  Q.work = 0;
  /* Called once per rendered frame. ms = time since previous frame (vsync-quantised),
   * work = JS time spent in update+render. Step down when frames are late (> 20 ms);
   * step back up when the frame is on time and the work itself fits in < 12 ms for 5 s. */
  Q.frame = function (ms, work, now) {
    if (ms > 100) ms = 100;
    sum += ms - ring[idx]; ring[idx] = ms;
    wsum += work - wring[idx]; wring[idx] = work;
    idx = (idx + 1) % N; if (filled < N) filled++;
    Q.avg = sum / filled; Q.work = wsum / filled;
    if (Q.forced || filled < N) return;
    while (Q.changes.length && now - Q.changes[0] > 60000) Q.changes.shift(); // at most 2 changes per minute
    if (Q.changes.length >= 2) return;
    if (Q.avg > 20 && Q.level < 4) {
      Q.level++; Q.lastChange = now; Q.changes.push(now); reset(); apply();
    } else if (Q.avg < 18.5 && Q.work < 12 && Q.level > 0) {
      Q.goodTime += ms;
      if (Q.goodTime > 5000) { Q.level--; Q.lastChange = now; Q.changes.push(now); reset(); apply(); }
    } else Q.goodTime = 0;
  };
})();
