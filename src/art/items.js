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
      '.......l........',
      '.....llwll......',
      '.......l........',
      '.......l........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], [
      '.......g........',
      '.......y........',
      '.......y........',
      '.......l........',
      '....y..l..y.....',
      '.....l.w.l......',
      '......www.......',
      'gyylllwwwlllyyg.',
      '......www.......',
      '.....l.w.l......',
      '....y..l..y.....',
      '.......l........',
      '.......y........',
      '.......y........',
      '.......g........',
      '................',
    ], [
      '................',
      '................',
      '..g....y....g...',
      '...y...l...y....',
      '....l..l..l.....',
      '.....l.w.l......',
      '......www.......',
      '..yllwwwwwlly...',
      '......www.......',
      '.....l.w.l......',
      '....l..l..l.....',
      '...y...l...y....',
      '..g....y....g...',
      '................',
      '................',
      '................',
    ], [
      '................',
      '................',
      '.......y........',
      '..y.........y...',
      '................',
      '................',
      '................',
      '..y....l....y...',
      '................',
      '................',
      '................',
      '..y.........y...',
      '.......y........',
      '................',
      '................',
      '................',
    ],
  ].map(r => px(r));

  // ================================================================== PUFFS
  // Soft cloud lobes with clustered upper-left lighting. lobes: [x0, y0, diameter].
  function puffs(b, lobes, cols, edge) {
    const m = B(b.w, b.h);
    lobes.forEach(l => disc(m, l[0], l[1], l[2], 1));
    const inM = (x, y) => Gt(m, x, y) === 1;
    lobes.forEach(l => disc(b, l[0], l[1], l[2], cols[0]));
    lobes.forEach(l => disc(b, l[0], l[1], l[2] - 1, cols[1], inM));
    lobes.forEach(l => { if (l[2] >= 6) disc(b, l[0] + 1, l[1] + 1, l[2] - 4, cols[2], inM); });
    if (edge) outline(b, edge);
  }
  const DUSTC = [BR[4], BR[5], WHT];
  const dust = [
    [[5, 11, 5], [8, 12, 4]],
    [[2, 8, 6], [6, 9, 7], [10, 11, 5]],
    [[0, 5, 6], [5, 6, 6], [10, 9, 5], [4, 11, 4]],
    [[1, 3, 3], [6, 4, 4], [11, 7, 3], [4, 9, 2]],
  ].map(l => { const b = B(16, 16); puffs(b, l, DUSTC); return out(b); });

  // =================================================================== POOF
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
    if (f === 0) puffs(b, [[8, 8, 8]], POOFC, ST[2]);
    if (f === 1) puffs(b, ring(6, 5, [9, 8], 0.5).concat([[8, 8, 8]]), POOFC, ST[2]);
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
  const splash = SPL.map(rows => {
    const b = B(32, 24);
    const m = (x, y) => { if (y < 0 || y > 23 || x < 0 || x > 31) return false; const r = rows[y]; return r[x < 16 ? x : 31 - x] === '#'; };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      if (!m(x, y)) continue;
      const lit = !m(x - 1, y) || !m(x, y - 1), dark = !m(x + 1, y) || !m(x, y + 1);
      S(b, x, y, lit && !dark ? WHT : dark && !lit ? BL[3] : lit && dark ? BL[4] : BL[4]);
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
    const gi = i => GOLD[Math.max(0, Math.min(4, i + sh))];
    const tb = 3 + sh;
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
    V: '##..## ##..## ##..## ##..## .####. ..##..',
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
    '+': '...... ..##.. ###### ###### ..##.. ......',
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
  const hud = {
    heart: px(heartA),
    heartEmpty: px(heartA.map(r => r.replace(/[234wP]/g, '1'))),
    gem: gem[0],
    coinOn: bigCoin[0],
    coinOff: bigCoin[0],
  };

  // =================================================================== LOGO
  const logo = G.cv(220, 72);

  return { gem, bigCoin, heart, sparkle, dust, poof, splash, hud, font, logo };
});
