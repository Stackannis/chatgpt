/* Pompom Parade - main loop: rAF, fixed 1/60 s simulation step with accumulator */
(function () {
  'use strict';
  var PP = window.PP;
  var DT = 1 / 60;
  var L = PP.loop = { DT: DT, speed: 1, acc: 0, last: 0, fps: 60, frames: 0, fpsT: 0, running: false, simSteps: 0 };

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function frame(ts) {
    if (!L.running) return;
    window.requestAnimationFrame(frame);
    var t = now();
    var delta = (t - L.last) / 1000; L.last = t;
    var raw = delta;
    if (delta < 0) delta = 0;
    if (delta > 0.1) delta = 0.1;
    L.frames++; L.fpsT += delta;
    if (L.fpsT >= 0.5) { L.fps = L.frames / L.fpsT; L.frames = 0; L.fpsT = 0; }
    var t0 = now();
    PP.game.frame(delta);
    // frames after a long stall (tab hidden, debugger, harness) say nothing about rendering cost
    if (raw < 0.25 && !PP.game.busy && !PP.game.hidden && !PP.game.paused) PP.quality.frame(delta * 1000, now() - t0, t);
  }

  /* advance the simulation by real time `delta` using fixed steps; returns steps done */
  L.advance = function (delta, stepFn) {
    var sp = L.speed;
    L.acc += delta * sp;
    var max = Math.ceil(5 * Math.max(1, sp)), n = 0;
    while (L.acc >= DT && n < max) { stepFn(DT); L.acc -= DT; n++; }
    if (L.acc > DT) L.acc = 0; // drop backlog rather than spiral
    L.simSteps += n;
    return n;
  };

  L.start = function () {
    if (L.running) return;
    L.running = true; L.last = now();
    window.requestAnimationFrame(frame);
  };
})();
