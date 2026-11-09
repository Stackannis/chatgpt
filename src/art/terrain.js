// SUNFOX — terrain art: ground textures (composited by src/terrain_render.js),
// platforms, prize block, spring, spikes, checkpoint, goal gate, sign.
G.defineArt('terrain', G => {
  const P = G.PAL;
  const BR = P.brown, GR = P.green, ST = P.stone;

  // Shared character palette for G.px sprites.
  const C = {
    k: P.ink, w: P.white,
    0: BR[0], 1: BR[1], 2: BR[2], 3: BR[3], 4: BR[4], 5: BR[5],
    a: GR[0], b: GR[1], c: GR[2], d: GR[3], e: GR[4],
    s: ST[0], t: ST[1], u: ST[2], v: ST[3], x: ST[4],
    o: P.orange[0], p: P.orange[1], q: P.orange[2], r: P.orange[3], y: P.orange[4],
    G: P.gold[0], H: P.gold[1], I: P.gold[2], J: P.gold[3],
    R: P.red[0], S: P.red[1], T: P.red[2], U: P.red[3],
    m: P.teal[0], n: P.teal[1], M: P.teal[2], N: P.teal[3],
  };
  const px = (rows, pal) => G.px(rows, pal || C);

  // Wrapping pixel / rect for seamless textures.
  function dot(c, x, y, col) {
    const w = c.width, h = c.height;
    c.ctx.fillStyle = col;
    c.ctx.fillRect(((x % w) + w) % w, ((y % h) + h) % h, 1, 1);
  }
  function box(c, x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) dot(c, x + i, y + j, col);
  }
  // Stamp rows of chars with a local palette ('.' = skip), wrapping.
  function stamp(c, rows, x, y, pal) {
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch !== '.' && ch !== ' ') dot(c, x + i, y + j, pal[ch]);
      }
  }
  function R(c, x, y, w, h, col) { c.ctx.fillStyle = col; c.ctx.fillRect(x, y, w, h); }

  // ------------------------------------------------------------------
  // EARTH — 16px bevelled checker of sun-baked clay blocks (64x64 seamless)
  // ------------------------------------------------------------------
  function makeDirt(p, rich) {
    const c = G.cv(64, 64);
    for (let cy = 0; cy < 4; cy++) {
      for (let cx = 0; cx < 4; cx++) {
        const X = cx * 16, Y = cy * 16;
        const light = (cx + cy) % 2 === 0;
        const fill = light ? p.L : p.D, hi = light ? p.LH : p.DH, sh = light ? p.LS : p.DS;
        box(c, X, Y, 16, 16, fill);
        box(c, X, Y, 16, 1, hi);
        box(c, X, Y, 1, 16, hi);
        box(c, X, Y + 15, 16, 1, sh);
        box(c, X + 15, Y, 1, 16, sh);
        // stepped facet clusters: lit corner + shaded corner
        for (let i = 0; i < 4; i++) box(c, X + 1, Y + 1 + i, 4 - i, 1, hi);
        for (let i = 0; i < 6; i++) box(c, X + 9 + i, Y + 14 - i, 6 - i, 1, sh);
        if (light && p.LHH) { box(c, X, Y, 3, 1, p.LHH); box(c, X, Y, 1, 3, p.LHH); }
        if (!light && p.DSS) { box(c, X + 12, Y + 15, 4, 1, p.DSS); box(c, X + 15, Y + 12, 1, 4, p.DSS); }
      }
    }
    if (!rich) return c;
    // hand-placed details (x, y in the 64x64 tile)
    const lp = { H: p.LHH, h: p.LH, m: p.LS, d: p.DS, D: p.DSS, l: p.L };
    const pebL = ['.hHH.', 'hHhhm', 'mhhmd', '.mdd.'];   // pale stone on a light block
    const pebS = ['.HH.', 'Hhmd', '.dd.'];
    const pebD = ['.mm.', 'mmlD', 'dllD', '.DD.'];        // stone on a dark block
    const crackL = ['d....', '.d...', '.dd..', '...d.', '...d.'];
    const crackD = ['...D', '..D.', 'DD..', '.D..'];
    const chipL = ['mm.', 'mdd', '.d.'];
    const chipD = ['hh', 'hm'];
    stamp(c, pebL, 7, 7, lp);
    stamp(c, crackD, 23, 6, lp);
    stamp(c, pebD, 6, 23, lp);
    stamp(c, pebS, 56, 23, lp);
    stamp(c, crackL, 38, 38, lp);
    stamp(c, pebD, 39, 54, lp);
    stamp(c, pebS, 23, 56, lp);
    return c;
  }
  const dirt = makeDirt({ L: BR[3], LH: BR[4], LHH: BR[5], LS: '#a9602f', D: BR[2], DH: '#a9602f', DS: '#73372b', DSS: BR[1] }, true);
  const dirtDeep = makeDirt({ L: '#7a3d30', LH: '#8a4832', LS: '#69332e', D: '#62302e', DH: '#6e3830', DS: '#532830', DSS: '#47202e' }, false);

  // ------------------------------------------------------------------
  // GRASS CAP — 64x24, row 8 = collision surface
  // ------------------------------------------------------------------
  const SHADOW = 'rgba(43,22,34,0.5)';
  function makeGrass() {
    const c = G.cv(64, 24);
    const g = []; // g[y][x] = colour index 0..4 or -1
    for (let y = 0; y < 24; y++) g.push(new Array(64).fill(-1));
    const top = [], lit = [], edge = [], bot = [], lt = [], lw = [], li = [];
    // top silhouette: soft tufts [width, height]
    const tufts = [[7, 2], [5, 1], [8, 2], [6, 1], [5, 1], [9, 3], [6, 1], [7, 2], [6, 2], [5, 1]];
    for (const [w, h] of tufts) for (let i = 0; i < w; i++) {
      top.push(8 - Math.round(h * Math.sin(Math.PI * (i + 0.5) / w) - 0.01));
      lit.push(i < w * 0.55);
      edge.push(i === w - 1);
    }
    // hanging fringe: leaf-like lobes [width, bottom row]
    const lobes = [[10, 19], [6, 16], [12, 20], [8, 17], [9, 19], [5, 16], [14, 20]];
    for (const [w, D] of lobes) for (let i = 0; i < w; i++) {
      const t = (i + 0.5 - w / 2) / (w / 2);
      bot.push(13 + Math.round((D - 13) * Math.sqrt(1 - t * t)));
      lt.push(t); lw.push(w); li.push(i);
    }
    for (let x = 0; x < 64; x++) {
      const t = lt[x], w = lw[x], i = li[x];
      for (let y = top[x]; y <= bot[x]; y++) {
        let v = 3;
        const d = bot[x] - y, tr = Math.max(0, t);
        if (y <= top[x] + 1) v = 4;
        if (edge[x]) { if (y === top[x]) v = 3; else if (y === top[x] + 1) v = 2; }
        if (y >= 11) {
          if (d < 1 + Math.round(tr * 2)) v = 1;
          else if (d < 3 + Math.round(tr * 3)) v = 2;
        }
        if ((i === 0 || i === w - 1) && y >= 12) v = Math.min(v, i === 0 ? 2 : 1);
        g[y][x] = v;
      }
      // juicy specular on the bigger lobes
      if (w >= 8 && (i === 2 || i === 3) && bot[x] - 13 >= 5) g[13][x] = 4;
      if (w >= 8 && i === 2 && bot[x] - 14 >= 4) g[14][x] = 4;
    }
    // a few taller blades above the tufts (base 2px, curling tip)
    const blades = [[17, 5, 1], [38, 5, -1], [60, 6, 1]];
    for (const [x, y, d] of blades) {
      g[y][x] = 3; g[y][x + d] = 3; g[y - 1][x] = 3; g[y - 1][x + d] = 4; g[y - 2][x + d] = 4; g[y - 3][x + 2 * d] = 4;
    }
    const at = (x, y) => (y < 0 || y > 23 ? -1 : g[y][(x + 64) % 64]);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 64; x++) {
      const v = g[y][x];
      if (v >= 0) { dot(c, x, y, GR[v]); continue; }
      if (y < 13) continue;
      if (at(x, y - 1) >= 0 || at(x - 1, y) >= 0 || at(x + 1, y) >= 0) dot(c, x, y, GR[0]);
      else if (y - bot[x] <= 3) dot(c, x, y, SHADOW);
    }
    return c;
  }
  const grass = makeGrass();

  const gp = { o: GR[0], d: GR[1], m: GR[2], l: GR[3], h: GR[4], s: SHADOW };
  const grassEndL = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '...hhhhh',
    '..hhhhll',
    '.dhhllll',
    'dhhlllll',
    'dhllllll',
    'dhlllllm',
    'dllllmmm',
    'dlllmmmm',
    'dllmmmmm',
    'dmmmmmmd',
    'odmmmmdd',
    '.odmmddo',
    '..odddos',
    '...oooss',
    '....ssss',
    '.....sss',
    '........',
  ], gp);
  const grassEndR = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'hhhhl...',
    'hhlllm..',
    'llllllm.',
    'lllllmmd',
    'lllllmmd',
    'llllmmdd',
    'lllmmmdd',
    'llmmmmdo',
    'mmmmmddo',
    'mmmmmddo',
    'dmmmdddo',
    'odddddo.',
    'sodddo..',
    'ssooo...',
    'ssss....',
    'sss.....',
    '........',
  ], gp);

  // ------------------------------------------------------------------
  // WALL EDGES (8x64, seamless vertically) + UNDERSIDE (64x8)
  // ------------------------------------------------------------------
  function makeWall(right) {
    const c = G.cv(8, 64);
    // rim width per row inside a 16px block (aligned with the checker rows)
    const wl = [2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2, 1];
    for (let y = 0; y < 64; y++) {
      const j = y % 16, blk = (y >> 4);
      const w = Math.max(1, wl[(j + blk * 5) % 16 === 15 ? 15 : j] + (blk % 2 && j > 4 && j < 11 ? 1 : 0));
      if (!right) {
        dot(c, 0, y, j === 15 ? BR[0] : BR[1]);
        for (let i = 1; i <= w; i++) {
          let col = i === 1 ? BR[5] : i < w ? BR[4] : BR[3];
          if (j === 0) col = BR[5];
          if (j === 15) col = BR[2];
          if (j === 14) col = i === 1 ? BR[4] : BR[3];
          dot(c, i, y, col);
        }
      } else {
        dot(c, 7, y, P.ink);
        for (let i = 1; i <= w; i++) {
          let col = i === 1 ? BR[0] : i < w ? BR[1] : '#73372b';
          if (j === 15) col = BR[0];
          if (j === 0) col = i === 1 ? BR[1] : '#73372b';
          dot(c, 7 - i, y, col);
        }
      }
    }
    return c;
  }
  const wallL = makeWall(false), wallR = makeWall(true);

  function makeUnder() {
    const c = G.cv(64, 8);
    const prof = [2, 2, 3, 4, 5, 5, 4, 3, 2, 3, 3, 4, 4, 3, 2, 2]; // dark band height above the outline
    for (let x = 0; x < 64; x++) {
      const h = prof[(x + (x >> 4) * 5) % 16];
      dot(c, x, 7, P.ink);
      for (let j = 1; j <= h; j++) dot(c, x, 7 - j, j <= 1 ? BR[0] : j <= h - 1 ? BR[1] : '#6e3329');
    }
    return c;
  }
  const under = makeUnder();

  // ------------------------------------------------------------------
  // ONE-WAY PLATFORM (wooden plank bridge)
  // ------------------------------------------------------------------
  const platform = {
    l: px([
      '.kkkkkkkkkkkkkkk',
      'k55wv55k5555554k',
      'k44wv44k4444443k',
      'k33wv33k3333332k',
      'k33wv33k3332232k',
      'k33vv33k3333332k',
      'k22vu22k2222221k',
      '.kkkkkkkkkkkkkkk',
      '..k21k..........',
      '..k21k..........',
      '...kk...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]),
    m: px([
      'kkkkkkkkkkkkkkkk',
      '5555554k5555554k',
      '4444443k4444443k',
      '3333332k3333332k',
      '3223332k3332232k',
      '3333332k3333332k',
      '2222221k2222221k',
      'kkkkkkkkkkkkkkkk',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]),
    r: px([
      'kkkkkkkkkkkkkkk.',
      '5555554k55wv554k',
      '4444443k44wv443k',
      '3333332k33wv332k',
      '3223332k33wv332k',
      '3333332k33vv332k',
      '2222221k22vu221k',
      'kkkkkkkkkkkkkkk.',
      '..........k21k..',
      '..........k21k..',
      '...........kk...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]),
  };

  // ------------------------------------------------------------------
  // MOVING PLATFORM — floating carved stone slab with moss (48x16)
  // ------------------------------------------------------------------
  function makeMoving() {
    const c = G.cv(48, 16);
    // slab body
    R(c, 0, 2, 48, 10, P.ink);
    R(c, 1, 3, 46, 8, ST[2]);
    R(c, 1, 3, 46, 2, ST[3]);
    R(c, 1, 3, 1, 7, ST[4]);
    R(c, 1, 9, 46, 2, ST[1]);
    R(c, 46, 4, 1, 7, ST[1]);
    // rocky underside
    const under = [[3, 42, 12], [5, 38, 13], [9, 30, 14], [14, 20, 15]];
    for (const [x, w, y] of under) {
      R(c, x, y, w, 1, P.ink);
      if (y < 15) { R(c, x + 1, y, w - 2, 1, ST[0]); R(c, x + 1, y, Math.floor(w / 3), 1, ST[1]); }
    }
    // carved grooves with end studs + sun inlay
    for (const x0 of [5, 31]) {
      R(c, x0, 7, 12, 1, ST[0]); R(c, x0, 8, 12, 1, ST[3]);
      for (const sx of [x0 - 1, x0 + 11]) { R(c, sx, 6, 2, 3, ST[0]); R(c, sx + 1, 8, 1, 1, ST[3]); R(c, sx, 6, 1, 1, ST[1]); }
    }
    c.ctx.drawImage(px([
      '..kkkk..',
      '.kJJIIk.',
      'kJJIIIHk',
      'kJIIIHHk',
      '.kIHHGk.',
      '..kkkk..',
    ]), 20, 5);
    // moss cap
    const moss = [
      '.eeedeeeedddeeeeddeeeedddeeeeeddeeeedddeeeeddee.',
      'eedddddddddddddddddddddddddddddddddddddddddddddc',
      'ddddccdddddccddddddcccdddddccdddddccddddcccddccb',
      'accccbbcccbbbbcccbbabbcccbbbbccccbbbacccbbbbcbba',
      '.abbaaabbaa.aabbba..aabbaa..abbbaa...abba.aabaa.',
      '..aa...aa.....aaa....aaa.....aaa......aa...aa...',
    ];
    c.ctx.drawImage(px(moss), 0, 0);
    return c;
  }
  const moving = makeMoving();

  // ------------------------------------------------------------------
  // PRIZE BLOCK — golden sun-face block
  // ------------------------------------------------------------------
  const blockRows = [
    'kkkkkkkkkkkkkkkk',
    'kJJJJJJJJJJJJJIk',
    'kJqqqqqJJqqqqqHk',
    'kJqJqqqqqqqqJqHk',
    'kJqqqJJJJJJqqqHk',
    'kJqqJJJJJJIIqqHk',
    'kJqqJJ0JJ0IIqqHk',
    'kJJqJJ0II0IIqIHk',
    'kJJqJIIIIIIHqIHk',
    'kJqqIIIooIHHqqHk',
    'kJqqIIIIIHHHqqHk',
    'kJqqqIIHHHHqqqHk',
    'kJqIqqqqqqqqHqHk',
    'kJqqqqqHHqqqqqHk',
    'kIHHHHHHHHHHHHGk',
    'kkkkkkkkkkkkkkkk',
  ];
  const lighter = { I: 'J', H: 'J', J: 'w', q: 'y', G: 'I' };
  function blockFrame(d) {
    if (d < 0) return px(blockRows);
    return px(blockRows.map((r, y) => r.split('').map((ch, x) => {
      const s = x + y;
      return (s === d || s === d + 1) && lighter[ch] ? lighter[ch] : ch;
    }).join('')));
  }
  const block = [blockFrame(-1), blockFrame(6), blockFrame(13), blockFrame(20)];
  const blockUsed = px([
    'kkkkkkkkkkkkkkkk',
    'k3333333333332k',
    'k32222222222221k',
    'k32111111111121k',
    'k32100000000121k',
    'k32101111110121k',
    'k32101111110121k',
    'k32101011010121k',
    'k32101111110121k',
    'k32101000010121k',
    'k32101111110121k',
    'k32100000000121k',
    'k32122222222121k',
    'k22111111111110k',
    'k11000000000000k',
    'kkkkkkkkkkkkkkkk',
  ].map(r => (r.length === 15 ? r.slice(0, 8) + r[7] + r.slice(8) : r)));

  // ------------------------------------------------------------------
  // SPRING — [idle, compressed, extended], 16x24 bottom-aligned
  // ------------------------------------------------------------------
  const sprPad = px([
    '.kkkkkkkkkkkkkk.',
    'kUwUUUUUUUUUUUTk',
    'kTTTTTTTTTTTTTSk',
    'kSSSSSSSSSSSSSRk',
    '.kkkkkkkkkkkkkk.',
  ]);
  const sprBase = px([
    '..kkkkkkkkkkkk..',
    '.kxvvvvvvvvvvuk.',
    'kvuuuuuuuuuuuutk',
    'kkkkkkkkkkkkkkkk',
  ]);
  const coilA = px(['..kxvvvvvvvvtk..']);
  const coilB = px(['...kttttttttk...']);
  const coilC = px(['....kssssssk....']);
  function makeSpring(padY, pattern) {
    const c = G.cv(16, 24);
    c.ctx.drawImage(sprBase, 0, 20);
    let y = padY + 5;
    let i = 0;
    while (y < 20) { c.ctx.drawImage(pattern[i % pattern.length], 0, y); y++; i++; }
    c.ctx.drawImage(sprPad, 0, padY);
    return c;
  }
  const spring = [
    makeSpring(7, [coilA, coilB]),
    makeSpring(13, [coilA, coilB]),
    makeSpring(0, [coilA, coilB, coilC, coilB, coilC]),
  ];

  // ------------------------------------------------------------------
  // SPIKES — 16x16, two bone-white stone spikes
  // ------------------------------------------------------------------
  const spikeRows = [
    '........',
    '........',
    '........',
    '........',
    '...kk...',
    '...kk...',
    '..kxtk..',
    '..kxtk..',
    '..kxtk..',
    '.kxvtsk.',
    '.kxvtsk.',
    '.kxvtsk.',
    'kxvvutsk',
    'kxvvutsk',
    'kvvuttsk',
    'kkkkkkkk',
  ];
  const spikes = px(spikeRows.map(r => r + r));

  // ------------------------------------------------------------------
  // CHECKPOINT — sun-stone lantern post, 16x32
  // ------------------------------------------------------------------
  const headRows = [
    '................',
    '......kkkk......',
    '....kk1122kk....',
    '...k11222223k...',
    '...k12AAAA33k...',
    '..k12ABBBBA34k..',
    '..k12ABCCBA34k..',
    '..k22ABCCBA34k..',
    '..k23ABBBBA44k..',
    '...k33AAAA44k...',
    '...k33344444k...',
    '....kk4444kk....',
    '......kkkk......',
  ];
  const postRows = [
    '....kkkkkkkk....',
    '....kxvvvutk....',
    '....kkkkkkkk....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kvuttk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kxvutk.....',
    '.....kvuutk.....',
    '....kkkkkkkk....',
    '....kxvvvutk....',
    '...kkkkkkkkkk...',
    '...kxvvvvuutk...',
    '...kkkkkkkkkk...',
  ];
  const headOff = { k: P.ink, 1: ST[4], 2: ST[3], 3: ST[2], 4: ST[1], A: ST[0], B: ST[1], C: ST[2] };
  const headOn = [
    { k: P.ink, 1: P.gold[3], 2: P.gold[2], 3: P.gold[1], 4: P.gold[0], A: P.orange[2], B: P.orange[4], C: P.white },
    { k: P.ink, 1: P.gold[3], 2: P.gold[2], 3: P.gold[1], 4: P.gold[0], A: P.orange[3], B: P.gold[3], C: P.white },
    { k: P.ink, 1: P.white, 2: P.gold[2], 3: P.gold[1], 4: P.gold[0], A: P.orange[4], B: P.white, C: P.white },
    { k: P.ink, 1: P.gold[3], 2: P.gold[2], 3: P.gold[1], 4: P.gold[0], A: P.orange[3], B: P.gold[3], C: P.white },
  ];
  const RAYS_CARD = [[7, 0], [8, 0], [0, 6], [0, 7], [1, 6], [1, 7], [14, 6], [14, 7], [15, 6], [15, 7]];
  const RAYS_DIAG = [[2, 2], [3, 3], [13, 2], [12, 3], [2, 11], [3, 10], [13, 11], [12, 10]];
  function makeCheckpoint(f) {
    const c = G.cv(16, 32);
    c.ctx.drawImage(px(postRows), 0, 13);
    c.ctx.drawImage(px(headRows, f < 0 ? headOff : headOn[f]), 0, 0);
    if (f >= 0) {
      const rays = f % 2 === 0 ? RAYS_CARD : RAYS_DIAG;
      rays.forEach(([x, y], i) => R(c, x, y, 1, 1, f === 2 ? P.gold[3] : P.gold[2]));
      // warm band on the shaft
      R(c, 6, 19, 4, 1, P.gold[2]); R(c, 6, 19, 1, 1, P.gold[3]); R(c, 9, 19, 1, 1, P.gold[1]);
    }
    return c;
  }
  const checkpoint = { off: [makeCheckpoint(-1)], on: [0, 1, 2, 3].map(makeCheckpoint) };

  // ------------------------------------------------------------------
  // GOAL — ancient sun gate, 4 frames 32x48
  // ------------------------------------------------------------------
  function makeGoal(f) {
    const c = G.cv(32, 48);
    const k = P.ink;
    // portal light
    const tones = [P.white, P.gold[3], P.gold[2], P.orange[3]];
    for (let y = 18; y <= 45; y++) {
      const wob = [0, 0, 1, 1, 1, 0, 0, -1, -1, -1][(y + f * 5) % 10 >> 0] || 0;
      for (let x = 10; x <= 21; x++) {
        const d = Math.abs(x - 15.5 + (wob > 0 ? 0.5 : wob < 0 ? -0.5 : 0)) + (wob !== 0 ? 0.5 : 0);
        R(c, x, y, 1, 1, tones[d < 2 ? 0 : d < 3.6 ? 1 : d < 5 ? 2 : 3]);
      }
    }
    // rising motes
    const motes = [[12, 40], [18, 34], [14, 27], [19, 22], [11, 30], [16, 44]];
    for (const [mx, my] of motes) {
      const y = 18 + ((my - 18 - f * 7) % 28 + 28) % 28;
      R(c, mx, y, 1, 1, P.white);
      if (y > 18) R(c, mx, y - 1, 1, 1, P.white);
      if (y < 45) R(c, mx, y + 1, 1, 1, P.gold[2]);
    }
    // pillars
    for (const x0 of [2, 22]) {
      R(c, x0, 18, 8, 26, k);
      R(c, x0 + 1, 18, 6, 26, ST[2]);
      R(c, x0 + 1, 18, 1, 26, ST[4]);
      R(c, x0 + 2, 18, 1, 26, ST[3]);
      R(c, x0 + 5, 18, 2, 26, ST[1]);
      for (const sy of [26, 35]) {
        R(c, x0 + 1, sy, 6, 1, k);
        R(c, x0 + 1, sy - 1, 6, 1, ST[1]);
        R(c, x0 + 1, sy + 1, 5, 1, ST[3]); R(c, x0 + 1, sy + 1, 2, 1, ST[4]);
      }
      // carved glyphs
      stampC(c, ['ssss', 's..s', 's..s', 'ssss'], x0 + 2, 20);
      stampC(c, ['.ss.', 'ssss', 'ssss', '.ss.'], x0 + 2, 29);
      stampC(c, ['s..s', 's..s', 'ssss', '.ss.'], x0 + 2, 38);
    }
    // base plinths + threshold
    for (const x0 of [0, 20]) {
      R(c, x0, 44, 12, 4, k);
      R(c, x0 + 1, 45, 10, 2, ST[2]);
      R(c, x0 + 1, 45, 10, 1, ST[3]); R(c, x0 + 1, 45, 3, 1, ST[4]);
      R(c, x0 + 8, 46, 3, 1, ST[1]);
    }
    R(c, 12, 46, 8, 2, k); R(c, 12, 46, 8, 1, ST[1]);
    // lintel
    R(c, 0, 10, 32, 8, k);
    R(c, 1, 11, 30, 6, ST[2]);
    R(c, 1, 11, 30, 1, ST[4]);
    R(c, 1, 12, 30, 1, ST[3]);
    R(c, 1, 16, 30, 1, ST[1]);
    R(c, 1, 11, 1, 5, ST[4]);
    R(c, 30, 12, 1, 5, ST[1]);
    for (let x = 3; x < 28; x += 4) { R(c, x, 13, 2, 2, ST[0]); R(c, x + 1, 14, 1, 1, ST[1]); R(c, x, 15, 2, 1, ST[3]); }
    // sun crown
    c.ctx.drawImage(px(headRows, headOn[f]), 8, -1);
    const rays = f % 2 === 0 ? [[15, 0], [16, 0], [8, 5], [9, 5], [8, 6], [9, 6], [22, 5], [23, 5], [22, 6], [23, 6]] : [[10, 1], [11, 2], [21, 1], [20, 2]];
    rays.forEach(([x, y]) => R(c, x, y, 1, 1, P.gold[2]));
    // moss
    c.ctx.drawImage(px(['.eed..', 'edddc.', 'cdccbc', 'abbab.', '.a.a..']), 0, 9);
    c.ctx.drawImage(px(['..ded.', '.eddcc', 'cdccbb', '.babba', '..a.a.']), 26, 9);
    return c;
  }
  function stampC(c, rows, x, y) {
    stamp(c, rows, x, y, { s: ST[0] });
  }
  const goal = [0, 1, 2, 3].map(makeGoal);

  // ------------------------------------------------------------------
  // SIGN — wooden arrow sign pointing right
  // ------------------------------------------------------------------
  const sign = px([
    '................',
    '................',
    '.kkkkkkkkkkk....',
    'k55555555554k...',
    'k433333303334k..',
    'k4333333003334k.',
    'k43000000003334k',
    'k4333333003332k.',
    'k433333303332k..',
    'k22222222222k...',
    '.kkkkkkkkkkk....',
    '......k43k......',
    '......k43k......',
    '......k32k......',
    '......k32k......',
    '......k32k......',
  ]);

  return {
    dirt, dirtDeep, grass, grassEndL, grassEndR, wallL, wallR, under,
    platform, moving, block, blockUsed, spring, spikes, checkpoint, goal, sign,
  };
});
