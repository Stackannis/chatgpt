// Emerald Coast — level 1 data, built with a tiny terrain DSL.
(function () {
  const G = window.G;
  const COLS = 288, ROWS = 27, T = 16;
  const g = [];
  for (let y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(' '));
  const fillDown = (x, top) => { for (let y = top; y < ROWS; y++) g[y][x] = '#'; };
  const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch || '#'; };

  // Terrain profile. Tokens: _n flat n cols · U/D gentle up/down (2 cols, 1 tile) ·
  // / \ 45deg up/down (1 col, 1 tile) · Gn gap (pit) · ^n / vn instant cliff up/down.
  const PROFILE = `
    _16 U _4 D _8 / / _5 \\ \\ _5 G3 _10 ^2 _3 ^2 _11 \\ \\ _3 D D _4
    G4 ^1 _3 v1 G7 _6
    _3 U _3 U _4 D \\ _2 \\ _4 / _3 / / _4 D D _3
    / / / / _9 G4 _8 \\ \\ _2 G8 _10 / / / _5 D D _6 G5 _4 ^2 _4 ^2 _5
    G7 ^5 _8 \\ \\ \\ \\ \\ \\ _3 \\ \\ \\ D D _27`;
  let x = 0, top = 23;
  const gaps = [];
  for (const tok of PROFILE.trim().split(/\s+/)) {
    const k = tok[0], n = parseInt(tok.slice(1) || '1', 10);
    if (k === '_') for (let i = 0; i < n; i++) fillDown(x++, top);
    else if (k === 'G') { gaps.push([x, x + n - 1]); x += n; }
    else if (k === '^') top -= n;
    else if (k === 'v') top += n;
    else if (k === '/') { g[top - 1][x] = '/'; fillDown(x++, top); top--; }
    else if (k === '\\') { fillDown(x, top + 1); g[top][x++] = '\\'; top++; }
    else if (k === 'U') { g[top - 1][x] = '1'; fillDown(x++, top); g[top - 1][x] = '2'; fillDown(x++, top); top--; }
    else if (k === 'D') { fillDown(x, top + 1); g[top][x++] = '3'; fillDown(x, top + 1); g[top][x++] = '4'; top++; }
    else throw new Error('bad token ' + tok);
  }
  if (x !== COLS) throw new Error('level profile is ' + x + ' columns, expected ' + COLS);

  // Floating islands (solid) and one-way platforms ('=').
  box(63, 14, 68, 15);            // island over the first plateau
  box(110, 15, 116, 16);          // high route A
  box(123, 13, 129, 14);          // high route B
  box(137, 12, 143, 13);          // high route C (big coin 1)
  box(201, 10, 206, 11);          // sky island (big coin 3)
  const plat = (x0, x1, y) => box(x0, y, x1, y, '=');
  plat(52, 55, 20); plat(57, 60, 17);
  plat(118, 120, 14);
  plat(177, 178, 20); plat(181, 182, 19); plat(179, 180, 23);
  plat(214, 214, 20);

  const grid = g.map(r => r.join(''));
  const isSolidCh = ch => ch !== ' ' && ch !== '=';
  // Surface y (px) under tile column tx, scanning down from row `from`.
  function surf(tx, from, noPlat) {
    const px = Math.floor(tx * T + 8);
    const cx = Math.floor(px / T);
    for (let y = (from || 0) * T; y < ROWS * T; y++) {
      const ch = grid[y >> 4][cx];
      if (ch === '=') { if ((y & 15) === 0 && !noPlat) return y; continue; }
      const h = G.tileH(ch, px & 15);
      if (h && (y & 15) >= 16 - h) return y;
    }
    return ROWS * T;
  }

  const objects = [], decor = [];
  const O = (type, o) => { objects.push(Object.assign({ type }, o)); };
  const gem = (tx, ty) => O('gem', { x: tx * T + 8, y: ty * T + 8 });
  const gemRow = (tx, ty, n) => { for (let i = 0; i < n; i++) gem(tx + i, ty); };
  // n gems along a jump arc from tile (x0,y) to (x1,y) peaking `h` tiles higher.
  const gemArc = (x0, x1, y, h, n) => {
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); gem(x0 + (x1 - x0) * t, y - h * 4 * t * (1 - t)); }
  };
  // gems hovering 1.5 tiles above the ground, following its shape
  const gemTrail = (x0, x1, step, from) => { for (let tx = x0; tx <= x1; tx += step || 1) O('gem', { x: tx * T + 8, y: surf(tx, from) - 20 }); };
  const onGround = (type, tx, o, from) => O(type, Object.assign({ x: tx * T + 8, y: surf(tx, from) }, o));
  const enemy = (kind, tx, range, from) => onGround('enemy', tx, { kind, min: (tx - range) * T + 8, max: (tx + range) * T + 8 }, from);
  const block = (tx, ty, content) => O('block', { tx, ty, content: content || 'gem' });

  // ---- Section 1: welcome ----
  onGround('sign', 6);
  gemRow(10, 21, 4);
  gemTrail(17, 22, 1);
  block(26, 19, 'gem'); block(27, 19, 'gems'); block(28, 19, 'gem');
  enemy('walker', 29, 3);
  gemArc(32, 40, 19, 1.2, 7);
  gemArc(45, 49, 21, 2, 5);                  // over the first pit
  // ---- Section 2: platforms & the first plateau ----
  enemy('walker', 52, 2); enemy('walker', 56, 2);
  gemRow(52, 19, 4); gemRow(57, 16, 4);
  gemRow(64, 13, 4); block(66, 10, 'heart');
  enemy('spiker', 67, 4, 16);
  gemRow(69, 17, 3);
  enemy('walker', 76, 1);
  gemTrail(78, 82, 1);
  gemArc(85, 90, 21, 2, 5);
  O('mover', { x: 96.5 * T, y: 22 * T, ax: 36, ay: 0, period: 320 });
  gemRow(95, 20, 3);
  onGround('checkpoint', 102);
  // ---- Section 3: low road / high road ----
  onGround('spring', 107);
  gem(107, 19); gem(107, 17); gem(107.6, 15); gem(108.4, 13.4);
  // high road
  gemRow(111, 14, 5);
  gemRow(118, 13, 3);
  O('enemy', { kind: 'flyer', x: 126 * T, y: 11 * T, min: 123 * T, max: 129 * T });
  gemRow(124, 12, 5);
  O('mover', { x: 133.5 * T, y: 13 * T, ax: 36, ay: 0, period: 300 });
  O('coin', { x: 140 * T + 8, y: 10 * T, id: 0 });
  gemRow(138, 11, 2); gemRow(141, 11, 2);
  block(142, 8, 'heart');
  gemArc(144, 147, 15, 0.5, 4);
  // low road
  enemy('walker', 112, 1, 17); enemy('spiker', 117.5, 1.5, 17);
  gemTrail(111, 119, 2, 17);
  O('spikes', { tx: 127, ty: 23 }); O('spikes', { tx: 128, ty: 23 });
  gemArc(125, 130, 21, 1.5, 5);
  enemy('walker', 132, 1); enemy('walker', 138, 1.5, 15);
  gemTrail(134, 143, 1, 15);
  O('enemy', { kind: 'flyer', x: 146 * T, y: 18.5 * T, min: 143 * T, max: 149 * T });
  // ---- Section 4: cliffs & waterfalls ----
  gemTrail(147, 150, 1);
  enemy('walker', 153, 1.5);
  gemRow(155, 17, 3);
  gemArc(159, 164, 17, 2, 5);
  block(166, 15, 'gems'); block(167, 15, 'gem'); block(168, 15, 'heart');
  enemy('spiker', 169, 2);
  gemRow(177, 19, 2); gemRow(181, 18, 2);
  O('coin', { x: 180 * T, y: 21.6 * T, id: 1 });
  O('enemy', { kind: 'flyer', x: 180 * T, y: 16.5 * T, min: 177 * T, max: 183 * T });
  onGround('checkpoint', 186);
  enemy('walker', 189, 1.5); enemy('walker', 192, 1);
  gemTrail(194, 196, 1);
  // ---- Section 5: sky island & the final run ----
  onGround('spring', 198, null, 12);
  gem(198, 14.5); gem(198, 12.5); gem(198.8, 10.5); gem(199.8, 9);
  enemy('spiker', 200.5, 1, 12);
  gemRow(202, 9, 2); gemRow(205, 9, 2);
  O('coin', { x: 204 * T, y: 8 * T, id: 2 });
  block(208, 16, 'gems'); block(209, 16, 'gem');
  gemTrail(202, 205, 1);
  gem(213, 18); gem(214, 17.5); gem(215, 18);
  O('enemy', { kind: 'flyer', x: 214 * T, y: 15.5 * T, min: 211.5 * T, max: 217 * T });
  enemy('walker', 219, 1);
  enemy('walker', 223, 1); enemy('walker', 226.5, 1);
  gemRow(222, 16, 2); gemRow(226, 14, 3);
  onGround('checkpoint', 228.6);
  // ---- Section 6: the waterfall lift, the ruins and the big slide home ----
  O('mover', { x: 233 * T, y: 13.5 * T, ax: 0, ay: 40, period: 300, phase: Math.PI / 2 });
  gem(232.5, 14); gem(232.5, 12.5); gem(232.5, 11); gem(232.5, 9.5);
  gemArc(234.6, 237, 9.4, 0.3, 3);
  block(239, 7, 'gem'); block(240, 7, 'heart'); block(241, 7, 'gem');
  enemy('spiker', 241.5, 1.5);
  gemTrail(245, 250, 1);
  [[254, 15.2], [255.3, 14.8], [256.6, 15], [257.9, 15.8], [259.2, 17.2], [260.4, 19]].forEach(([a, b]) => gem(a, b));
  block(266, 18, 'gem'); block(267, 18, 'gems'); block(268, 18, 'gem');
  gemRow(271, 20, 4);
  onGround('goal', 277.5);

  // ---- Scenery ----
  const D = (kind, tx, layer, from, dy) => decor.push({ kind, x: Math.round(tx * T), y: surf(tx - 0.5, from, true) + (dy || 0), layer: layer || 'back' });
  [[2, 'palm'], [8.5, 'bush1'], [12, 'flowerA'], [13.2, 'flowerB'], [14.5, 'flowerA'], [19.5, 'tree'], [24.5, 'tuft'], [25.5, 'rock1'],
   [30.5, 'flowerB'], [36, 'palm'], [35, 'fern'], [42, 'bush2'], [44.5, 'flowerA'], [50, 'totem'], [53.5, 'tuft'], [57, 'mushroom'],
   [60, 'fern'], [70.5, 'pillar'], [64.5, 'bush1'], [76.5, 'rock2'], [83, 'palm'], [84.5, 'flowerA'], [91, 'flowerB'], [101, 'bush1'],
   [104.5, 'flowerA'], [105.3, 'flowerB'], [112.5, 'tuft'], [117.5, 'tree'], [124, 'rock1'], [132, 'fern'], [137.6, 'flowerA'],
   [139, 'flowerA'], [145.5, 'ruinBlock'], [152.5, 'bush2'], [154.5, 'flowerB'], [155.5, 'totem'], [158, 'fern'], [165, 'palm'],
   [170, 'flowerA'], [171, 'tuft'], [174.5, 'mushroom'], [185, 'bush1'], [187.5, 'flowerB'], [191, 'tree'], [193, 'rock1'],
   [201, 'pillar'], [207, 'tuft'], [210.5, 'flowerA'], [218.5, 'fern'], [222.5, 'bush1'], [226, 'palm'], [228.5, 'flowerA'],
   [238, 'pillar'], [239.2, 'fern'], [243, 'ruinBlock'], [244.6, 'pillar'], [252, 'tuft'],
   [262.5, 'palm'], [264, 'bush2'], [265.5, 'flowerB'], [269.6, 'flowerA'], [270.4, 'tuft'], [273, 'pillar'], [274.2, 'flowerA'],
   [281, 'pillar'], [282.2, 'totem'], [284, 'palm'], [286, 'ruinBlock'], [279.6, 'flowerB']].forEach(([tx, kind]) => D(kind, tx, 'back', kind === 'pillar' && tx === 201 ? 12 : 0));
  D('tuft', 67.5, 'back', 0); D('flowerA', 113, 'back', 0); D('palm', 126.5, 'back', 0); D('fern', 139, 'back', 0); D('flowerB', 203, 'back', 0);
  // a few foreground plants for depth
  [[15, 'fern'], [44, 'tuft'], [101.5, 'fern'], [157, 'tuft'], [192.5, 'fern'], [242, 'tuft'], [268.6, 'fern']].forEach(([tx, kind]) => D(kind, tx, 'fore', 0, 3));
  // hanging vines under the islands
  [[64, 16], [67, 16], [112, 17], [125, 15], [128, 15], [139, 14], [203, 12]].forEach(([tx, ty]) => decor.push({ kind: 'vine', x: tx * T + 8, y: ty * T, layer: 'back', hang: true }));

  const WATER_Y = 24 * T + 6;
  const water = gaps.map(([a, b]) => ({ x0: a * T, x1: (b + 1) * T, y: WATER_Y }));
  // waterfalls pouring off the left lip of some pits
  const falls = [[160, 19], [176, 21], [93, 22], [235, 11]].map(([tx, topRow]) => ({ x: tx * T, y0: topRow * T, y1: WATER_Y }));

  G.level = {
    name: 'EMERALD COAST', cols: COLS, rows: ROWS, grid, objects, decor, water, falls, waterY: WATER_Y,
    start: { x: 3 * T, y: surf(3) }, surf,
  };
})();
