/* Pompom Parade - adaptive quality scaler.
 * Levels: 0 full, 1 particles x0.5, 2 DPR cap 1.5, 3 DPR cap 1, 4 no side-decor animation.
 * Decisions use a rolling window of 60 rendered frames:
 *  - average frame time > 30 ms: step DOWN two levels at once; > 20 ms: one level; at most 4 down-steps per minute;
 *  - step UP one level after 5 s of good frames (on time and work < 12 ms), and only while fewer than
 *    2 changes of any kind happened in the last minute (so the scaler cannot oscillate).
 * (Independently of the level, the renderer caps the DPR at 1.5 when the backing store exceeds 1.2 MP.) */
(function () {
  'use strict';
  var PP = window.PP;
  var N = 60, MINUTE = 60000, MAX_DOWN = 4, MAX_UP_CHANGES = 2;
  var ring = new Float32Array(N), idx = 0, filled = 0, sum = 0;
  var Q = PP.quality = {
    level: 0, forced: false, avg: 16.7, particleCap: 220, dprCap: 2, decorAnim: true,
    goodTime: 0, lastChange: -1e9, changes: [], downs: [], name: 'high', WINDOW: N
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
  /* test / debug helper: forget the frame history and the rate limits; optionally jump to a level */
  Q.reset = function (level) {
    reset(); Q.changes.length = 0; Q.downs.length = 0; Q.lastChange = -1e9; Q.avg = 16.7; Q.work = 0;
    if (level !== undefined) Q.set(level);
  };
  /* Called once per rendered frame. ms = time since previous frame (vsync-quantised),
   * work = JS time spent in update+render, now = timestamp in ms. Returns nothing; changes Q.level. */
  Q.frame = function (ms, work, now) {
    if (ms > 100) ms = 100;
    sum += ms - ring[idx]; ring[idx] = ms;
    wsum += work - wring[idx]; wring[idx] = work;
    idx = (idx + 1) % N; if (filled < N) filled++;
    Q.avg = sum / filled; Q.work = wsum / filled;
    if (Q.forced || filled < N) return;
    while (Q.changes.length && now - Q.changes[0] > MINUTE) Q.changes.shift();
    while (Q.downs.length && now - Q.downs[0] > MINUTE) Q.downs.shift();
    if (Q.avg > 20 && Q.level < 4) {
      if (Q.downs.length >= MAX_DOWN) return;                 // at most 4 downward changes per minute
      Q.level = Math.min(4, Q.level + (Q.avg > 30 ? 2 : 1));  // very slow frames: two levels at once
      Q.lastChange = now; Q.changes.push(now); Q.downs.push(now); reset(); apply();
    } else if (Q.avg < 18.5 && Q.work < 12 && Q.level > 0) {
      if (Q.changes.length >= MAX_UP_CHANGES) return;         // upward: unchanged rate (at most 2 changes per minute overall)
      Q.goodTime += ms;
      if (Q.goodTime > 5000) { Q.level--; Q.lastChange = now; Q.changes.push(now); reset(); apply(); }
    } else Q.goodTime = 0;
  };
})();
