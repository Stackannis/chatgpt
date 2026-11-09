// SUNFOX — items: collectibles, effects, HUD icons, 8px bitmap font, title logo.
//   gem      6 x 16x16  sun-shard crystal (flat rhombic shard spinning about its vertical axis)
//   bigCoin  6 x 24x24  star medallion (gold rim, emerald enamel, raised star)
//   heart    2 x 16x16  · sparkle 4 x 16x16 · dust 4 x 16x16 · poof 5 x 24x24 · splash 5 x 32x24
//   hud      {heart, heartEmpty, gem, coinOn, coinOff} 16x16
//   font     char -> 8px tall glyph (outline baked in) · logo  "SUNFOX" title logo
// Everything is authored on small indexed buffers: hand-pixelled stamps plus integer-only
// construction (no anti-aliasing anywhere). Light comes from the upper-left.
G.defineArt('items', G => {
  'use strict';
  const P = G.PAL;
  const INK = P.ink, WHT = P.white;
  const OR = P.orange, GO = P.gold, RD = P.red, BL = P.blue, TE = P.teal, ST = P.stone,
    BR = P.brown, PU = P.purple, PK = P.pink;

  // ------------------------------------------------------------ pixel buffers
  function B(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function S(b, x, y, c) { if (x >= 0 && y >= 0 && x < b.w && y < b.h) b.d[y * b.w + x] = c; }
  function Gt(b, x, y) { return x >= 0 && y >= 0 && x < b.w && y < b.h ? b.d[y * b.w + x] : null; }
  function out(b) {
    const c = G.cv(b.w, b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const v = b.d[y * b.w + x];
      if (v) { c.ctx.fillStyle = v; c.ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  // Shared character palette for hand-pixelled rows.
  const C = {
    k: INK, w: WHT,
    r: OR[0], o: OR[1], O: OR[2], g: OR[3], y: GO[2], l: GO[3],
    D: GO[0], G: GO[1],
    1: RD[0], 2: RD[1], 3: RD[2], 4: RD[3], p: PK[1], P: PK[2],
    t: TE[0], T: TE[1], M: TE[2], N: TE[3],
    a: BL[0], b: BL[1], c: BL[2], d: BL[3], e: BL[4],
    s: ST[0], S: ST[1], u: ST[2], v: ST[3], x: ST[4],
    5: BR[0], 6: BR[1], 7: BR[2], 8: BR[3], 9: BR[4], 0: BR[5],
    q: PU[0], Q: PU[1], z: PU[2], Z: PU[3],
  };
  function stamp(b, rows, ox, oy, pal) {
    pal = pal || C;
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        if (!pal[ch]) throw new Error('items: unknown palette char "' + ch + '"');
        S(b, ox + x, oy + y, pal[ch]);
      }
    }
  }
  const px = (rows, pal) => G.px(rows, pal || C);
  // 1px outline around every opaque pixel (4-neighbour, or 8-neighbour with diag).
  function outline(b, col, diag) {
    const src = b.d.slice();
    const has = (x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h && src[y * b.w + x];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (src[y * b.w + x]) continue;
      if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1) ||
        (diag && (has(x - 1, y - 1) || has(x + 1, y - 1) || has(x - 1, y + 1) || has(x + 1, y + 1)))) b.d[y * b.w + x] = col;
    }
  }
  // Clean pixel discs: row widths for a given diameter.
  function discRows(d) {
    if (d === 3) return [1, 3, 1];
    const r = d / 2, rows = [];
    for (let y = 0; y < d; y++) {
      let n = 0;
      for (let x = 0; x < d; x++) if ((x + 0.5 - r) * (x + 0.5 - r) + (y + 0.5 - r) * (y + 0.5 - r) <= r * r) n++;
      rows.push(n);
    }
    return rows;
  }
  function disc(b, x0, y0, d, col, clip) {
    const rows = discRows(d);
    for (let y = 0; y < d; y++) {
      const w = rows[y], s = (d - w) >> 1;
      for (let i = 0; i < w; i++) if (!clip || clip(x0 + s + i, y0 + y)) S(b, x0 + s + i, y0 + y, col);
    }
  }

  // Body rows -> canvas with a 1px ink outline added around the silhouette.
  function spr(rows, edge, pal) {
    const b = B(rows[0].length, rows.length);
    stamp(b, rows, 0, 0, pal);
    outline(b, edge || INK);
    return out(b);
  }

  // ==================================================================== GEM
  // Sun shard: a four-pointed crystal star (two shallow pyramids back to back),
  // spinning about its vertical axis. 0, 30, 60, 90, 120, 150 degrees; the ridge
  // crossing drifts right, the star thins to a blade, then the lit back swings in.
  const gem = [
    [
      '................',
      '.......wg.......',
      '......lwgO......',
      '......lwgO......',
      '.....llwggO.....',
      '....lylwggyy....',
      '..llllywgyyyyg..',
      '.lllwwwwwlyyyyg.',
      '.gggggywlgOOOOo.',
      '..OOgggyoooooo..',
      '....Oggyoorr....',
      '.....ggyorr.....',
      '......gyor......',
      '......gyor......',
      '.......gr.......',
      '................',
    ], [
      '................',
      '.......lO.......',
      '......llOo......',
      '......llOo......',
      '.....llllOo.....',
      '.....ylllOo.....',
      '...yyyyllOggg...',
      '..llllllwggggg..',
      '..OOOOOOlooooo..',
      '...oooogyorrr...',
      '.....oggyor.....',
      '.....gggyor.....',
      '......gyor......',
      '......gyor......',
      '.......gr.......',
      '................',
    ], [
      '................',
      '.......yO.......',
      '.......yO.......',
      '......lyyO......',
      '......lyyO......',
      '......gyyO......',
      '.....gggyyO.....',
      '....gyyyylOO....',
      '....oooooyrr....',
      '.....oooggr.....',
      '......oggr......',
      '......yggr......',
      '......yggr......',
      '.......gr.......',
      '.......gr.......',
      '................',
    ], [
      '................',
      '.......lO.......',
      '.......lO.......',
      '.......lO.......',
      '.......wO.......',
      '......lwOO......',
      '......lwOo......',
      '......wwlo......',
      '......yyoo......',
      '......yyor......',
      '......gyor......',
      '.......yr.......',
      '.......yr.......',
      '.......gr.......',
      '.......gr.......',
      '................',
    ], [
      '................',
      '.......wl.......',
      '.......wl.......',
      '......wlly......',
      '......wlly......',
      '......wlll......',
      '.....lwllll.....',
      '....llwwwwwl....',
      '....OOlggggg....',
      '.....OyyOOO.....',
      '......yyyO......',
      '......yygo......',
      '......yygo......',
      '.......yo.......',
      '.......yo.......',
      '................',
    ], [
      '................',
      '.......ly.......',
      '......llyy......',
      '......llyy......',
      '.....llyyyy.....',
      '.....llyyyl.....',
      '...llllyyllll...',
      '..wwwwwwwwllll..',
      '..ggggglgggggg..',
      '...OOOyggOOOO...',
      '.....yygggO.....',
      '.....yygggg.....',
      '......yygg......',
      '......yygg......',
      '.......yg.......',
      '................',
    ],
  ].map(r => spr(r));

  // ================================================================== HEART
  const heartA = [
    '................',
    '................',
    '...kkk....kkk...',
    '..k444k..k333k..',
    '.k4wP43kk33332k.',
    '.k4P4333333332k.',
    '.k443333333322k.',
    '.k333333333322k.',
    '..k3333333322k..',
    '...k33333322k...',
    '....k333322k....',
    '.....k3221k.....',
    '......k21k......',
    '.......kk.......',
    '................',
    '................',
  ];
  const heartB = [
    '................',
    '...kkkk..kkkk...',
    '..k4444kk3333k..',
    '.k44wP44333332k.',
    'k44PP4333333322k',
    'k44P43333333322k',
    'k44333333333322k',
    'k43333333333222k',
    '.k333333333222k.',
    '..k3333333222k..',
    '...k33333221k...',
    '....k333221k....',
    '.....k3221k.....',
    '......k21k......',
    '.......kk.......',
    '................',
  ];
  const heart = [px(heartA), px(heartB)];

  // ================================================================ SPARKLE
  const sparkle = [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......l........',
      '.......w........',
      '.....lwwwl......',
      '.......w........',
      '.......l........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], [
      '.......y........',
      '.......l........',
      '.......l........',
      '.......w........',
      '.......w........',
      '......lwl.......',
      '.....lwwwl......',
      'yllwwwwwwwwwlly.',
      '.....lwwwl......',
      '......lwl.......',
      '.......w........',
      '.......w........',
      '.......l........',
      '.......l........',
      '.......y........',
      '................',
    ], [
      '................',
      '.......y........',
      '..y....l....y...',
      '...l...l...l....',
      '....l..w..l.....',
      '.....w.w.w......',
      '......www.......',
      '.yllwwwwwwwlly..',
      '......www.......',
      '.....w.w.w......',
      '....l..w..l.....',
      '...l...l...l....',
      '..y....l....y...',
      '.......y........',
      '................',
      '................',
    ], [
      '................',
      '.......y........',
      '................',
      '...y.......y....',
      '................',
      '................',
      '.......l........',
      '.y....lwl....y..',
      '.......l........',
      '................',
      '................',
      '...y.......y....',
      '................',
      '.......y........',
      '................',
      '................',
    ],
  ].map(r => px(r));

  // ================================================================== PUFFS
  // Cloud lobes shaded as overlapping balls: every pixel belongs to the lobe it sits deepest in
  // and takes light / base / shadow from its offset to that lobe's centre (light from the upper-left).
  // lobes: [x0, y0, diameter]; cols: [shadow, base, light].
  function puffs(b, lobes, cols, edge) {
    const m = B(b.w, b.h);
    lobes.forEach(l => disc(m, l[0], l[1], l[2], 1));
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (Gt(m, x, y) !== 1) continue;
      let best = -1e9, t = 0;
      lobes.forEach(l => {
        const r = l[2] / 2, dx = x + .5 - (l[0] + r), dy = y + .5 - (l[1] + r), mg = r - Math.hypot(dx, dy);
        if (mg > best) { best = mg; t = (dx + dy) / r; }
      });
      S(b, x, y, t < 0.2 ? cols[2] : t > 0.9 ? cols[0] : cols[1]);
    }
    if (edge) outline(b, edge);
  }
  const DUSTC = [BR[3], BR[4], BR[5]];
  const dust = [
    [[5, 11, 5], [8, 12, 4]],
    [[2, 8, 6], [6, 9, 7], [10, 11, 5]],
    [[0, 5, 6], [5, 6, 6], [10, 9, 5], [4, 11, 4]],
    [[1, 4, 2], [6, 3, 4], [12, 7, 2], [4, 9, 2], [10, 2, 2]],
  ].map(l => { const b = B(16, 16); puffs(b, l, DUSTC); return out(b); });

  // =================================================================== POOF
  // Impact flash -> big smoke burst -> ring of puffs opening up -> wisps.
  const POOFC = [ST[3], ST[4], WHT];
  function ring(n, R, sizes, a0) {
    const l = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * 2 * Math.PI) / n, d = sizes[i % sizes.length];
      l.push([Math.round(12 + Math.cos(a) * R - d / 2), Math.round(12 + Math.sin(a) * R - d / 2), d]);
    }
    return l;
  }
  const poof = [0, 1, 2, 3, 4].map(f => {
    const b = B(24, 24);
    if (f === 0) {                               // eight-point impact flash: long axis rays, short diagonal ones
      const V = [];
      for (let i = 0; i < 16; i++) { const R = i % 2 ? 3.6 : i % 4 ? 7 : 11.5; V.push([Math.cos(i * Math.PI / 8) * R, Math.sin(i * Math.PI / 8) * R]); }
      for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        const dx = x + .5 - 12, dy = y + .5 - 12, r = Math.hypot(dx, dy);
        const i = Math.floor(((Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 8)) % 16, p = V[i], q = V[(i + 1) % 16];
        if ((q[0] - p[0]) * (dy - p[1]) - (q[1] - p[1]) * (dx - p[0]) >= 0) S(b, x, y, r < 3 ? WHT : r < 6 ? GO[3] : GO[2]);
      }
    }
    if (f === 1) puffs(b, ring(6, 5.5, [9, 8], 0.5).concat([[7, 7, 9]]), POOFC, ST[2]);
    if (f === 2) puffs(b, ring(6, 7.5, [7, 6], 0.6), POOFC, ST[2]);
    if (f === 3) puffs(b, ring(6, 9, [5, 4], 0.7), POOFC, ST[2]);
    if (f === 4) puffs(b, ring(6, 10, [2, 3], 0.8), POOFC);
    return out(b);
  });

  // ================================================================= SPLASH
  // Left halves of the silhouettes (mirrored), shaded procedurally.
  const SPL = [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..........#.....',
      '.............###',
      '.......#...#####',
      '.........#######',
      '........########',
      '.......#########',
      '......##########',
      '.....###########',
      '.....###########',
      '.....###########',
    ], [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...............#',
      '..............##',
      '.........#....##',
      '..............##',
      '......#..##..###',
      '.........##..###',
      '....#.....##.###',
      '..........######',
      '.....##...######',
      '......##..######',
      '......###.######',
      '.......#########',
      '.......#########',
      '......##########',
      '.....###########',
      '....############',
      '....############',
      '....############',
    ], [
      '................',
      '...............#',
      '......#........#',
      '................',
      '..#......##....#',
      '.........##...##',
      '...#......##..##',
      '..##......##..##',
      '..##.......#####',
      '...##......#####',
      '...###.....#####',
      '....##.....#####',
      '....###...######',
      '.....###..######',
      '.....####.######',
      '......##########',
      '......##########',
      '.......#########',
      '.......#########',
      '......##########',
      '.....###########',
      '....############',
      '....############',
      '....############',
    ], [
      '................',
      '................',
      '................',
      '.....#..........',
      '...............#',
      '.#.......#.....#',
      '................',
      '..#.......#.....',
      '..##...........#',
      '...#......##..##',
      '..........##..##',
      '...##......#.###',
      '...##......#####',
      '....##.....#####',
      '....###...######',
      '.....##...######',
      '.....###.#######',
      '......##########',
      '.......#########',
      '......##########',
      '.....###########',
      '....############',
      '....############',
      '....############',
    ], [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.#..............',
      '.........#......',
      '................',
      '....#..........#',
      '................',
      '..#.......#.....',
      '..............##',
      '....#......#..##',
      '.............###',
      '.....##....#####',
      '......##.#######',
      '......##########',
      '.....###########',
      '....############',
      '....############',
      '....############',
    ],
  ];
  // Foam white on the lit left ~60% of every horizontal run, pale blue on the rest, a mid-blue
  // rim on the right / bottom edges and a blue outline all around.
  const splash = SPL.map(rows => {
    const b = B(32, 24);
    const m = (x, y) => { if (y < 0 || y > 23 || x < 0 || x > 31) return false; const r = rows[y]; return r[x < 16 ? x : 31 - x] === '#'; };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      if (!m(x, y)) continue;
      let x0 = x, x1 = x;
      while (m(x0 - 1, y)) x0--;
      while (m(x1 + 1, y)) x1++;
      const t = (x - x0 + 0.5) / (x1 - x0 + 1), rim = !m(x + 1, y) || !m(x, y + 1), top = !m(x, y - 1) || !m(x - 1, y);
      S(b, x, y, rim && !top ? BL[3] : t > 0.6 + [0, 0.07, 0.1, 0.07, 0, -0.05][y % 6] && !top ? BL[4] : WHT);   // scalloped shade edge
    }
    outline(b, BL[2]);
    return out(b);
  });

  // =============================================================== BIG COIN
  // Star medallion: gold rim, emerald enamel field, raised pale-gold star.
  // The face squeezes into an ellipse while the rim wall swings past: lit wall on
  // the left while the face turns away, dark wall on the right as it turns back.
  const GOLD = [GO[0], GO[1], GO[2], GO[3], WHT];
  const TEALS = ['#073636', TE[0], '#126862', TE[1], '#28a690', TE[2], TE[3]];
  const ELL = { 20: [8, 12, 14, 16, 18, 18, 20, 20, 20, 20], 16: [6, 8, 10, 12, 14, 14, 16, 16, 16, 16], 8: [2, 4, 6, 6, 8, 8, 8, 8, 8, 8] };
  const FLD = { 20: [6, 10, 12, 14, 14, 16, 16, 16], 16: [4, 6, 8, 10, 10, 12, 12, 12], 8: [2, 4, 4, 6, 6, 6, 6, 6] };
  const STAR = {
    20: [
      '.....##.....',
      '.....##.....',
      '....####....',
      '....####....',
      '############',
      '############',
      '.##########.',
      '..########..',
      '..########..',
      '.####..####.',
      '.###....###.',
      '.##......##.',
    ],
    16: [
      '....##....',
      '....##....',
      '...####...',
      '...####...',
      '##########',
      '##########',
      '.########.',
      '..######..',
      '..######..',
      '.###..###.',
      '.##....##.',
      '.#......#.',
    ],
    8: [
      '.##.',
      '.##.',
      '.##.',
      '.##.',
      '####',
      '####',
      '.##.',
      '.##.',
      '.##.',
      '####',
      '#..#',
      '....',
    ],
  };
  function coinFrame(fw, side, mode) {
    const b = B(24, 24);
    const sh = mode === 'away' ? -1 : mode === 'toward' ? 1 : 0;
    const gi = i => GOLD[Math.max(0, Math.min(4, i + (sh > 0 ? (i >= 2 ? 1 : 0) : sh)))];
    const tb = sh < 0 ? 2 : 3;
    if (!fw) {                                  // edge-on: just the milled rim wall
      const cols = [3, 4, 2, 1];
      for (let y = 2; y < 22; y++) for (let j = 0; j < 4; j++) {
        if ((y === 2 || y === 21) && (j === 0 || j === 3)) continue;
        const notch = (y % 3 === 0) && j > 0 && j < 3;
        S(b, 10 + j, y, GOLD[Math.max(0, cols[j] - (notch ? 1 : 0))]);
      }
      outline(b, INK);
      return out(b);
    }
    const e = fw === 20 ? 0 : fw === 16 ? 2 : 4;
    const x0 = 12 - ((fw + e) >> 1);
    const fx = side < 0 ? x0 + e : x0;          // face ellipse left edge
    const bx = side < 0 ? x0 : x0 + e;          // far ellipse left edge
    const rowW = i => ELL[fw][i < 10 ? i : 19 - i];
    const fldW = i => FLD[fw][i < 8 ? i : 15 - i];
    const inFace = (x, y) => { const i = y - 2; if (i < 0 || i > 19) return false; const w = rowW(i), s0 = fx + ((fw - w) >> 1); return x >= s0 && x < s0 + w; };
    const inField = (x, y) => { const i = y - 4; if (i < 0 || i > 15) return false; const w = fldW(i), s0 = fx + ((fw - w) >> 1); return x >= s0 && x < s0 + w; };
    // rim wall
    if (e) for (let i = 0; i < 20; i++) {
      const w = rowW(i), s0 = bx + ((fw - w) >> 1);
      for (let x = s0; x < s0 + w; x++) {
        if (inFace(x, i + 2)) continue;
        const j = side < 0 ? x - s0 : s0 + w - 1 - x;      // 0 = silhouette
        const lit = e === 2 ? [3, 2] : [2, 3, 4, 3], drk = e === 2 ? [0, 1] : [0, 0, 1, 1];
        S(b, x, i + 2, GOLD[(side < 0 ? lit : drk)[Math.min(j, e - 1)]]);
      }
    }
    // face: rim ring + enamel field
    const litA = Math.atan2(-1, -1);
    for (let y = 2; y < 22; y++) for (let x = 0; x < 24; x++) {
      if (!inFace(x, y)) continue;
      const dx = (x + 0.5 - (fx + fw / 2)) * (20 / fw), dy = y + 0.5 - 12;
      let d = Math.abs(Math.atan2(dy, dx) - litA); if (d > Math.PI) d = 2 * Math.PI - d;
      d = d * 6 / Math.PI;                       // clock-hours away from the lit side, 0..6
      if (inField(x, y)) {
        const rimAdj = !inField(x - 1, y) || !inField(x + 1, y) || !inField(x, y - 1) || !inField(x, y + 1);
        S(b, x, y, TEALS[rimAdj && d <= 2.6 ? tb - 2 : rimAdj && d >= 4.2 ? tb + 2 : tb]);
        continue;
      }
      const outer = !inFace(x - 1, y) || !inFace(x + 1, y) || !inFace(x, y - 1) || !inFace(x, y + 1);
      const inner = inField(x - 1, y) || inField(x + 1, y) || inField(x, y - 1) || inField(x, y + 1);
      let c = 2;
      if (outer) c = d <= 1.2 ? 4 : d <= 2.7 ? 3 : d <= 3.6 ? 2 : d <= 5 ? 1 : 0;
      else if (inner) c = d >= 3.6 ? 3 : d >= 2.6 ? 2 : 1;
      S(b, x, y, gi(c));
    }
    // raised star + its drop shadow on the enamel
    const st = STAR[fw], sw = st[0].length, sx = fx + ((fw - sw) >> 1), sy = 6;
    const star = (x, y) => { const j = y - sy, i = x - sx; return j >= 0 && j < st.length && i >= 0 && i < sw && st[j][i] === '#'; };
    for (let y = 4; y < 20; y++) for (let x = 0; x < 24; x++) {
      if (star(x, y)) {
        const lit = !star(x - 1, y) || !star(x, y - 1), drk = !star(x + 1, y) || !star(x, y + 1);
        S(b, x, y, GOLD[lit && !drk ? (sh < 0 ? 3 : 4) : drk && !lit ? (sh > 0 ? 3 : 2) : (sh > 0 ? 4 : 3)]);
      } else if (inField(x, y) && star(x - 1, y - 1)) S(b, x, y, TEALS[tb - 2]);
    }
    outline(b, INK);
    return out(b);
  }
  const bigCoin = [
    coinFrame(20, 0, 'front'), coinFrame(16, -1, 'away'), coinFrame(8, -1, 'away'),
    coinFrame(0, 0, 'front'), coinFrame(8, 1, 'toward'), coinFrame(16, 1, 'toward'),
  ];

  // =================================================================== FONT
  const GLYPHS = {
    '0': '.####. ##..## ##..## ##..## ##..## .####.',
    '1': '.##. ###. .##. .##. .##. ####',
    '2': '.####. ##..## ...##. ..##.. .##... ######',
    '3': '.####. ##..## ...##. ....## ##..## .####.',
    '4': '..###. .####. ##.##. ###### ...##. ...##.',
    '5': '###### ##.... #####. ....## ##..## .####.',
    '6': '.####. ##.... #####. ##..## ##..## .####.',
    '7': '###### ....## ...##. ..##.. ..##.. ..##..',
    '8': '.####. ##..## .####. ##..## ##..## .####.',
    '9': '.####. ##..## ##..## .##### ....## .####.',
    A: '.####. ##..## ##..## ###### ##..## ##..##',
    B: '#####. ##..## #####. ##..## ##..## #####.',
    C: '.####. ##..## ##.... ##.... ##..## .####.',
    D: '####.. ##.##. ##..## ##..## ##.##. ####..',
    E: '###### ##.... #####. ##.... ##.... ######',
    F: '###### ##.... #####. ##.... ##.... ##....',
    G: '.####. ##.... ##.### ##..## ##..## .####.',
    H: '##..## ##..## ###### ##..## ##..## ##..##',
    I: '#### .##. .##. .##. .##. ####',
    J: '....## ....## ....## ....## ##..## .####.',
    K: '##..## ##.##. ####.. ####.. ##.##. ##..##',
    L: '##.... ##.... ##.... ##.... ##.... ######',
    M: '##...## ###.### ####### ##.#.## ##...## ##...##',
    N: '##..## ###.## ###### ##.### ##..## ##..##',
    O: '.####. ##..## ##..## ##..## ##..## .####.',
    P: '#####. ##..## ##..## #####. ##.... ##....',
    Q: '.####. ##..## ##..## ##.### .####. ....##',
    R: '#####. ##..## ##..## #####. ##.##. ##..##',
    S: '.####. ##..## .###.. ..###. ##..## .####.',
    T: '###### ..##.. ..##.. ..##.. ..##.. ..##..',
    U: '##..## ##..## ##..## ##..## ##..## .####.',
    V: '##..## ##..## ##..## .####. .####. ..##..',
    W: '##...## ##...## ##.#.## ####### ###.### ##...##',
    X: '##..## .####. ..##.. ..##.. .####. ##..##',
    Y: '##..## ##..## .####. ..##.. ..##.. ..##..',
    Z: '###### ....## ..###. .###.. ##.... ######',
    '!': '## ## ## ## .. ##',
    '?': '.####. ##..## ...##. ..##.. ...... ..##..',
    ':': '.. ## ## .. ## ##',
    '.': '.. .. .. .. ## ##',
    ',': '... ... ... .## .## ##.',
    '-': '.... .... #### #### .... ....',
    "'": '## ## #. .. .. ..',
    x: '.... .... #..# .##. .##. #..#',
    '+': '..##.. ..##.. ###### ###### ..##.. ..##..',
    '/': '....## ...##. ..##.. ..##.. .##... ##....',
  };
  const FACE = [WHT, WHT, GO[3], GO[3], GO[2], GO[2]];
  const font = {};
  Object.keys(GLYPHS).forEach(ch => {
    const rows = GLYPHS[ch].split(' ');
    const b = B(rows[0].length + 2, 8);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') S(b, x + 1, y + 1, FACE[y]); });
    outline(b, INK, true);
    font[ch] = out(b);
  });

  // ==================================================================== HUD
  // Medal slots: coinOn = the star medallion in miniature, coinOff = the empty socket it
  // drops into (dark recess, shadowed upper-left wall, lit lower-right wall, ghost star).
  const coinOn = spr([
    '................',
    '.....llllyy.....',
    '....lyyyyyyG....',
    '...lyyttttyGG...',
    '..lyttTwwTTTGD..',
    '..lytTTwwTTTGD..',
    '.lytwwwwwwwwTGD.',
    '.lytTwwwwwlTTGD.',
    '.yytTTwwwlTTMGD.',
    '.yGtTwwTTwlTMGD.',
    '..yGTwTTTTlMGD..',
    '..GGTTTTTMMMGD..',
    '...GGGMMMMGDD...',
    '....GGGGGDDD....',
    '.....GDDDDD.....',
    '................',
  ]);
  const coinOff = spr([
    '................',
    '.....SSSSSS.....',
    '....SkkkkkkS....',
    '...SkkssssssS...',
    '..SksssSSssssS..',
    '..SksssSSsssuS..',
    '.SksSSSSSSSSsuS.',
    '.SkssSSSSSSssuS.',
    '.SksssSSSSsssuS.',
    '.SkssSSssSSssuS.',
    '..SssSssssSsuS..',
    '..SsssssssssuS..',
    '...SssssssuuS...',
    '....SuuuuuuS....',
    '.....SSSSSS.....',
    '................',
  ]);
  const hud = {
    heart: px(heartA),
    heartEmpty: px(heartA.map(r => r.replace(/[34wP]/g, '1'))),
    gem: gem[0],
    coinOn,
    coinOff,
  };

  // =================================================================== LOGO
  // "SUNFOX" wordmark built on boolean masks, integer pixels only (nothing is ever blended):
  // chunky rounded letters (taller S / X bookends on a flat baseline) -> banded gradient face
  // with a 2px bevel -> 2px ink outline -> 4px extruded block shadow. A rising sun crowns the
  // dip in the middle of the word and Kit's tail sweeps underneath as a swash.
  const logo = (function () {
    const LW = 250, LH = 80;                        // the word (not the tail plume) is centred on the canvas
    const MK = (w, h, f) => {
      const m = { w, h, d: new Uint8Array(w * h) };
      if (f) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f(x, y)) m.d[y * w + x] = 1;
      return m;
    };
    const on = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.d[y * m.w + x] === 1;
    const SE = d => {                               // digital disc of diameter d (structuring element)
      const o = [], r = d / 2, c = d >> 1;
      for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) if ((x + .5 - r) * (x + .5 - r) + (y + .5 - r) * (y + .5 - r) <= r * r) o.push([x - c, y - c]);
      return o;
    };
    const CROSS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const dil = (m, se) => MK(m.w, m.h, (x, y) => se.some(o => on(m, x + o[0], y + o[1])));
    const ero = (m, se) => MK(m.w, m.h, (x, y) => se.every(o => on(m, x + o[0], y + o[1])));
    const each = f => { for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) f(x, y); };

    // ---- letter shapes (local coords, pixel centres), T = stem width, DG = diagonal width
    const T = 10, DG = 11;
    // true inside the r x r corner square at (cx, cy) but outside its quarter circle; (sx, sy) points into the shape
    const cut = (cx, cy, r, sx, sy) => (x, y) => {
      const u = (x + .5 - cx) * sx, v = (y + .5 - cy) * sy;
      return u >= 0 && u < r && v >= 0 && v < r && (u - r) * (u - r) + (v - r) * (v - r) > r * r;
    };
    const rrect = (x0, y0, x1, y1, r) => {
      const c = [cut(x0, y0, r, 1, 1), cut(x1, y0, r, -1, 1), cut(x1, y1, r, -1, -1), cut(x0, y1, r, 1, -1)];
      return (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1 && !c.some(f => f(x, y));
    };
    const not = fs => (x, y) => !fs.some(f => f(x, y));
    const GLY = {
      S: (W, H) => { const m0 = (H >> 1) - 4, m1 = m0 + 8; return not([rrect(T, 9, W + 20, m0, 4), rrect(-20, m1, W - T, H - 9, 4), cut(0, 0, 12, 1, 1), cut(0, m1, 12, 1, -1), cut(W, m0, 12, -1, 1), cut(W, H, 12, -1, -1)]); },
      U: (W, H) => not([rrect(T, -20, W - T, H - 9, (W - 2 * T) / 2), cut(0, H, 13, 1, -1), cut(W, H, 13, -1, -1)]),
      N: (W, H) => (x, y) => { const a = Math.floor(y * 2 / 3); return x < T || x >= W - T || (x >= a && x < a + 12); },   // wide, 2:3 diagonal keeps both notches open
      F: (W, H) => (x, y) => x < T || y < 9 || (y >= 15 && y < 23 && x < W - 5),
      O: (W, H) => { const a = rrect(0, 0, W, H, 13), c = rrect(T, 9, W - T, H - 9, (W - 2 * T) / 2); return (x, y) => a(x, y) && !c(x, y); },
      X: (W, H) => (x, y) => { const a = y >> 1; return (x >= a && x < a + DG) || (x >= W - DG - a && x < W - a); },
    };
    const WORD = [['S', 29, 42], ['U', 29, 39], ['N', 35, 36], ['F', 25, 36], ['O', 30, 39], ['X', 31, 42]];
    const GAP = [4, 4, 4, 3, 3], X0 = 26, YB = 61, PD = 4;
    const FACE = MK(LW, LH), LID = new Int8Array(LW * LH).fill(-1);
    let gx = X0;
    WORD.forEach((g, i) => {
      const W = g[1], H = g[2], f = GLY[g[0]](W, H);
      let m = MK(W + 2 * PD, H + 2 * PD, (x, y) => x >= PD && y >= PD && x < W + PD && y < H + PD && f(x - PD, y - PD));
      m = dil(ero(m, SE(7)), SE(7));                // round every convex corner (2,1 steps)
      m = ero(dil(m, SE(5)), SE(5));                // soften the concave ones
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.d[y * m.w + x]) {
        const k = (YB - H + y - PD) * LW + gx + x - PD; FACE.d[k] = 1; LID[k] = i;
      }
      gx += W + (GAP[i] || 0);
    });
    const OUT = dil(FACE, SE(5));                   // face + 2px outline
    const depth = (x, y) => { for (let k = 1; k <= 4; k++) if (on(OUT, x - k, y - k)) return k; return 0; };
    const EXT = MK(LW, LH, (x, y) => !on(OUT, x, y) && depth(x, y) > 0);

    // ---- sun: disc crowned with triangular rays, only the cap above the N / F dip is kept
    const SX = LW / 2, SY = 42, SR = 27, SCLIP = 27;
    const inDisc = (x, y) => (x + .5 - SX) * (x + .5 - SX) + (y + .5 - SY) * (y + .5 - SY) <= SR * SR;
    const RAYS = [[90, 13], [75, 9], [105, 9], [60, 13], [120, 13], [45, 10], [135, 10]];   // [angle, length]
    const inRay = (x, y) => {
      const px = x + .5 - SX, py = y + .5 - SY;
      return RAYS.some(r => {
        const ux = Math.cos(r[0] * Math.PI / 180), uy = -Math.sin(r[0] * Math.PI / 180);
        const along = px * ux + py * uy - (SR - 1), across = -px * uy + py * ux;
        return along >= 0 && along <= r[1] - 1.2 && Math.abs(across) <= 3.7 * (1 - along / r[1]);
      });
    };
    const SUN = MK(LW, LH, (x, y) => y < SCLIP && (inDisc(x, y) || inRay(x, y)));

    // ---- tail: a tapering tube around a Catmull-Rom centre line [x, y, radius]. It slips out from
    // under the X, runs below the word and curls up into a bushy cream-tipped plume left of the S.
    const TP = [[224, 52, 2.5], [215, 60, 2.5], [206, 68.5, 3], [184, 72.5, 3.2], [146, 73.8, 3.6], [93, 74, 4], [46, 73.5, 4.8],
      [25, 69.5, 6.5], [14.5, 58, 9], [11.5, 45, 8.5], [11.5, 34, 5.5], [14, 25.5, 1.2], [16, 21, 0.5]];
    const TS = [], ARC = [0];
    for (let i = 1; i < TP.length - 2; i++) for (let k = 0; k < 16; k++) {
      const t = k / 16, p0 = TP[i - 1], p1 = TP[i], p2 = TP[i + 1], p3 = TP[i + 2];
      TS.push([0, 1, 2].map(j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t)));
    }
    for (let i = 1; i < TS.length; i++) ARC.push(ARC[i - 1] + Math.hypot(TS[i][0] - TS[i - 1][0], TS[i][1] - TS[i - 1][1]));
    const TL = new Float32Array(LW * LH), TA = new Float32Array(LW * LH), TQ = new Float32Array(LW * LH);   // light term across the tube, arc position, signed offset across
    const TAIL = MK(LW, LH, (x, y) => {
      const px = x + .5, py = y + .5;
      let bd = 1e9, br = 0, ox = 0, oy = 0, ba = 0, tx = 0, ty = 0;
      for (let i = 0; i < TS.length - 1; i++) {
        const a = TS[i], c = TS[i + 1], ex = c[0] - a[0], ey = c[1] - a[1], l2 = ex * ex + ey * ey;
        let u = ((px - a[0]) * ex + (py - a[1]) * ey) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const dx = px - a[0] - ex * u, dy = py - a[1] - ey * u, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; br = a[2] + (c[2] - a[2]) * u; ox = dx; oy = dy; ba = ARC[i] + Math.sqrt(l2) * u; tx = ex; ty = ey; }
      }
      if (Math.sqrt(bd) > br) return false;
      // lit from above-left, the underside falls into shade
      TL[y * LW + x] = -(0.447 * ox + 0.894 * oy) / br; TA[y * LW + x] = ba; TQ[y * LW + x] = (tx * oy - ty * ox) / Math.hypot(tx, ty);
      return true;
    });

    // ---- paint, back to front
    const b = B(LW, LH);
    const inkAround = m => { const g = dil(m, CROSS); each((x, y) => { if (on(g, x, y)) S(b, x, y, INK); }); };
    // 1px bevel classes of a mask: 1 lit edge, 2 shaded edge, 0 elsewhere
    const edge = (m, x, y) => (!on(m, x - 1, y) || !on(m, x, y - 1)) ? ((!on(m, x + 1, y) || !on(m, x, y + 1)) ? 0 : 1) : ((!on(m, x + 1, y) || !on(m, x, y + 1)) ? 2 : 0);
    inkAround(SUN);
    each((x, y) => {
      if (!on(SUN, x, y)) return;
      const e = edge(SUN, x, y);
      if (inDisc(x, y)) S(b, x, y, e === 1 ? WHT : Math.hypot(x + .5 - SX, y + .5 - SY) > SR - 3 ? GO[3] : GO[2]);
      else S(b, x, y, e === 1 ? GO[2] : e === 2 ? OR[2] : OR[3]);
    });
    inkAround(TAIL);
    each((x, y) => {
      if (!on(TAIL, x, y)) return;
      const l = TL[y * LW + x];
      const z = TQ[y * LW + x] / 5 + 0.25, zig = Math.abs(z - Math.floor(z) - 0.5) * 2;     // 5px wide teeth across the tail
      if (TA[y * LW + x] > 217 + 4 * zig) S(b, x, y, l > 0 ? WHT : l < -0.3 ? BR[4] : BR[5]);
      else S(b, x, y, l > 0.3 ? OR[3] : l < -0.2 ? OR[1] : OR[2]);
    });
    inkAround(EXT);
    const NEAR = dil(OUT, SE(5));                   // the side walls are lighter along the 2px next to the outline
    each((x, y) => {
      if (on(EXT, x, y)) S(b, x, y, on(NEAR, x, y) ? BL[1] : BL[0]);
      else if (on(OUT, x, y)) S(b, x, y, INK);
    });
    // faces: banded gradient + bevel (ring 1 / ring 2 lit or shaded by the outward normal)
    const E1 = ero(FACE, CROSS), E2 = ero(E1, CROSS);
    const RAMP = [WHT, GO[3], GO[2], OR[3], OR[2], OR[1], OR[0], RD[0]];
    const BANDS = [[0.26, 1], [0.52, 2], [0.78, 3], [9, 4]];        // [upper bound of v, ramp index]
    each((x, y) => {
      if (!on(FACE, x, y)) return;
      const H = WORD[LID[y * LW + x]][2], v = (y - (YB - H)) / H;
      const bi = BANDS.find(q => v < q[0])[1];
      let nx = 0, ny = 0;                           // outward normal: pull of the empty pixels in a 7x7 window (weight 1/d2),
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {     // steady along stair-stepped diagonals
        if ((dx || dy) && !on(FACE, x + dx, y + dy)) { const d2 = dx * dx + dy * dy; nx += dx / d2; ny += dy / d2; }
      }
      const l = -(nx + ny) / (Math.hypot(nx, ny) || 1) * Math.SQRT1_2;
      const ring = !on(E1, x, y) ? 1 : !on(E2, x, y) ? 2 : 0;
      let c = bi;
      if (ring === 1) c = l > 0.25 ? 0 : l < -0.25 ? bi + 2 : bi;
      else if (ring === 2) c = l > 0.25 ? bi - 1 : l < -0.25 ? bi + 1 : bi;
      S(b, x, y, RAMP[c]);
    });
    // plug enclosed see-through specks (letter counters, pinholes between the outlines)
    const seen = new Uint8Array(LW * LH), stack = [];
    const push = (x, y) => { if (x >= 0 && y >= 0 && x < LW && y < LH && !seen[y * LW + x] && !b.d[y * LW + x]) { seen[y * LW + x] = 1; stack.push(x, y); } };
    const flood = (x, y) => { const got = []; push(x, y); while (stack.length) { const cy = stack.pop(), cx = stack.pop(); got.push(cy * LW + cx); push(cx + 1, cy); push(cx - 1, cy); push(cx, cy + 1); push(cx, cy - 1); } return got; };
    for (let x = 0; x < LW; x++) { flood(x, 0); flood(x, LH - 1); }
    for (let y = 0; y < LH; y++) { flood(0, y); flood(LW - 1, y); }
    each((x, y) => { const g = flood(x, y); if (g.length && g.length <= 40) g.forEach(k => { b.d[k] = g.length <= 3 ? INK : BL[0]; }); });
    return out(b);
  })();

  return { gem, bigCoin, heart, sparkle, dust, poof, splash, hud, font, logo };
});
