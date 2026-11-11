/* Pompom Parade - uniform grid (60 u cells) over the enemy pool for shot-vs-target queries */
(function () {
  'use strict';
  var PP = window.PP;
  var CELL = 60, COLS = 8, ROWS = 16, X0 = -60, Y0 = -120;
  var head = new Int16Array(COLS * ROWS), next = new Int16Array(128);
  var GR = PP.grid = { CELL: CELL, COLS: COLS, ROWS: ROWS, X0: X0, Y0: Y0, head: head, next: next };

  /* rebuild from the enemy pool (indices stay valid until enemies.update runs) */
  GR.build = function () {
    var pool = PP.enemies.pool, a = pool.items, n = pool.n, i, e, cx, cy, c;
    head.fill(-1);
    for (i = 0; i < n; i++) {
      e = a[i];
      if (e.dead || e.y + e.r < 0) continue;       // only on-screen targets can be hit
      cx = ((e.x - X0) / CELL) | 0; cy = ((e.y - Y0) / CELL) | 0;
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
      c = cy * COLS + cx;
      next[i] = head[c]; head[c] = i;
    }
  };
  GR.cx = function (x) { var c = ((x - X0) / CELL) | 0; return c < 0 ? 0 : (c >= COLS ? COLS - 1 : c); };
  GR.cy = function (y) { var c = ((y - Y0) / CELL) | 0; return c < 0 ? 0 : (c >= ROWS ? ROWS - 1 : c); };

  /* squared distance from point to segment */
  GR.segDist2 = function (px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return qx * qx + qy * qy;
  };
})();
