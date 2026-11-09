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
  const mod = (a, n) => ((a % n) + n) % n;

  // Wrapping pixel for seamless textures.
  function dot(c, x, y, col) {
    c.ctx.fillStyle = col;
    c.ctx.fillRect(mod(x, c.width), mod(y, c.height), 1, 1);
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
  // EARTH — layered rock strata (64x64 seamless)
  // Four strata of uneven height (tall / thin / medium / thin). Every seam
  // has its own wave so no row lines up with the next; each stratum is
  // cracked into slabs with a lit top-left corner and a shaded bottom-right.
  // A boulder cluster, a root, a pebble group and a wedged stone are embedded
  // so the eye never finds the 64px grid. `dirtDeep` is the very same pixel
  // map drawn with a ramp one step darker and more purple (no highlights).
  // ------------------------------------------------------------------
  // ramp index:       0 seam     1 crack    2 dk shade 3 shade    4 base B   5 base A   6 light    7 hilite   8 glint
  const DIRT_RAMP = ['#5a2a2a', '#73372b', '#8a4532', '#a9602f', '#b76c37', '#c47a3c', '#d8944c', '#eab368', '#ffe0a0'];
  const DEEP_RAMP = ['#46202c', '#5a2a30', '#6c3432', '#8c4a36', '#99533a', '#a65d39', '#b86e40', '#ca8349', '#ca8349'];
  const DI = { k: 0, D: 1, d: 2, s: 3, n: 4, m: 5, L: 6, H: 7, W: 8 };
  // 64-long seam profile from [length, step] runs: the seam moves 1px down (step > 0)
  // or up (step < 0) every |step| px, or stays flat (step 0).
  function prof(segs) {
    const a = []; let y = 0;
    for (const [len, step] of segs)
      for (let i = 0; i < len; i++) { if (step && i % Math.abs(step) === 0) y += Math.sign(step); a.push(y); }
    if (a.length !== 64 || y !== 0) throw new Error('seam profile: length ' + a.length + ', ends at ' + y);
    return a;
  }
  const SEAM_Y = [0, 23, 33, 51];
  const SEAM = [
    prof([[10, 0], [12, 3], [14, 0], [8, -2], [20, 0]]),
    prof([[24, 0], [12, 4], [10, 0], [6, -2], [12, 0]]),
    prof([[6, 0], [8, -4], [10, 0], [8, 4], [4, 0], [8, 4], [12, 0], [8, -4]]),
    prof([[8, 0], [9, 3], [14, 0], [6, -2], [11, 0], [8, -4], [4, 0], [4, 2]]),
  ];
  const CRACK = [                                   // per stratum: [x at the top, lean in px]
    [[9, 4], [30, -5], [55, 3]],
    [[19, 2], [36, -3], [0, 2]],
    [[6, -4], [27, 5], [46, -3]],
    [[16, 3], [38, -3], [50, -2]],
  ];
  const BASE = [5, 4, 5, 4];                         // base tone of each stratum
  function dirtIndex(x, y) {
    const s0 = SEAM_Y[0] + SEAM[0][x];
    const yy = y < s0 ? y + 64 : y;
    let k = 3;
    while (k > 0 && yy < SEAM_Y[k] + SEAM[k][x]) k--;
    const top = SEAM_Y[k] + SEAM[k][x];
    const bot = k === 3 ? s0 + 64 : SEAM_Y[k + 1] + SEAM[k + 1][x];
    if (yy === top) return DI.k;
    const h = bot - top - 1, dt = yy - top - 1, db = bot - 1 - yy;
    let dl = 99, dr = 99;
    for (const [x0, lean] of CRACK[k]) {
      const cx = x0 + Math.round(lean * (dt + 0.5) / h);
      const a = mod(x - cx, 64), b = mod(cx - x, 64);
      if (a === 0) return DI.D;
      dl = Math.min(dl, a - 1); dr = Math.min(dr, b - 1);
    }
    const w = dl + dr + 1, base = BASE[k], tall = h >= 13, wide = w >= 16;
    // a lit ledge along the top (thick at the left, tapering right) + lit left end,
    // a shaded wedge along the bottom-right, dark purple-brown just above the seam
    if (dt <= 1 && dl <= 1) return DI.H;
    if (db + dr <= 2) return DI.d;
    if (dt === 0) return dl < w * 0.62 ? DI.H : DI.L;
    if (db === 0) return dr < w * 0.62 ? DI.d : DI.s;
    if (dl === 0) return dt < h * 0.45 ? DI.H : dt < h * 0.7 ? DI.L : base;
    if (dr === 0) return db < h * 0.55 ? DI.d : DI.s;
    if (dt === 1 && dl < w * (tall ? 0.8 : 0.6)) return DI.L;
    if (dl === 1 && dt < h * 0.4) return DI.L;
    if (db === 1 && dr < w * 0.8) return DI.s;
    if (dr === 1 && db < h * 0.62) return DI.s;
    if (tall && dt === 2 && dl < w * 0.5) return DI.L;
    if (h >= 18 && dt === 3 && dl < w * 0.25) return DI.L;
    if (tall && db === 2 && dr < w * 0.5) return DI.s;
    if (h >= 18 && db === 3 && dr < w * 0.22) return DI.s;
    if (wide && dl === 2 && dt < h * 0.22) return DI.L;
    if (wide && dr === 2 && db < h * 0.3) return DI.s;
    return base;
  }
  const dirtMap = [];
  for (let y = 0; y < 64; y++) { const r = []; for (let x = 0; x < 64; x++) r.push(dirtIndex(x, y)); dirtMap.push(r); }
  function dstamp(rows, x, y) {
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch !== '.') dirtMap[mod(y + j, 64)][mod(x + i, 64)] = DI[ch];
      }
  }
  const BOULDER = [
    '....ddddd....',
    '..ddHHHHHdd..',
    '.dHHWWHHLLLd.',
    'dHWWHHHLLLLsD',
    'dHWHHLLLLLssk',
    'dHHLLLLLLsssk',
    'dHLLLLLLsssdk',
    '.DLLLLssssddk',
    '..kLsssddddk.',
    '...kkddddkk..',
    '.....kkkk....',
  ];
  const STONE = [
    '..ddd..',
    '.dHHLd.',
    'dHWLLsk',
    'dHLLssk',
    '.kLssdk',
    '..kkkk.',
  ];
  const PEBBLE = [
    '.dd.',
    'dHLk',
    'dLsk',
    '.kk.',
  ];
  const ROOT = [
    'HH................',
    'WHHH..............',
    'LLWHHH............',
    'DDLLWHH...........',
    '..DDLLHH..........',
    '....DDLHH..HH.....',
    '......DLHHHLLHH...',
    '......DLLHDDLLLH..',
    '.......DLH..DDDLH.',
    '.......DLH.....DD.',
    '........DLH.......',
    '........DDLH......',
    '..........DL......',
    '...........D......',
  ];
  const PEB_A = [
    '.dddd.',
    'dHHLLd',
    'dHLLsk',
    'dLssdk',
    '.kkkk.',
  ];
  const PEB_B = [
    '.ddd.',
    'dHLsk',
    'dLsdk',
    '.kkk.',
  ];
  const SHELL = [
    '..ddddd..',
    '.dHLHLHd.',
    'dHLdLdLLk',
    'dLLdLdLsk',
    '.dLdLdsk.',
    '..dLLsk..',
    '...kkk...',
  ];
  dstamp(BOULDER, 15, 6); dstamp(STONE, 25, 12); dstamp(PEBBLE, 12, 14);   // boulder cluster wedged in the tall stratum
  dstamp(ROOT, 34, 20);                                                    // root crossing the thin stratum
  dstamp(PEB_A, 48, 40); dstamp(PEB_B, 54, 42); dstamp(PEBBLE, 50, 45);     // pebble group
  dstamp(SHELL, 25, 56);                                                   // fossil shell
  function paintDirt(ramp) {
    const c = G.cv(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) R(c, x, y, 1, 1, ramp[dirtMap[y][x]]);
    return c;
  }
  const dirt = paintDirt(DIRT_RAMP), dirtDeep = paintDirt(DEEP_RAMP);

  // ------------------------------------------------------------------
  // GRASS CAP — 64x24, row 8 = collision surface
  // Four big rounded clumps of uneven width (lit yellow-green top-left,
  // mid green flank) rest on a teal-dark core; rounded tongues of uneven
  // length (2-7px) hang from it, outlined, with a cast shadow on the earth.
  // ------------------------------------------------------------------
  const GM = '#4ab842';                            // extra mid green between GR[2] and GR[3]
  const GCORE = '#14664e';                         // teal-shifted dark green (core of the mat)
  const SH1 = 'rgba(43,22,34,0.62)', SH2 = 'rgba(43,22,34,0.32)';
  const gp = { h: GR[4], l: GR[3], g: GM, m: GR[2], d: GR[1], t: GCORE, o: GR[0], s: SH1, S: SH2 };
  function makeGrass() {
    // clumps A (20px) + B (13px) + C (17px) + D (14px), rows 5..12 ('.' below a clump = filled in later)
    const CLUMPS = [
      ['....hhhhhhhll.......', '.............', '...hhhhhhll......', '..............'],
      ['..hhhhhhhlllllll....', '...hhhhll....', '.hhhhhhhlllllg...', '..hhhhhlll....'],
      ['.hhhhlllllllllllggg.', '.hhhllllllgg.', 'hhhhllllllllllgg.', 'hhhhlllllllgg.'],
      ['hhhlllllllllllllgggm', 'hhllllllllggm', 'hhlllllllllllgggm', 'hhllllllllgggm'],
      ['lllllllllllllllggggm', 'llllllllllggm', 'llllllllllllggggm', 'lllllllllggggm'],
      ['.llllllllllllgggggm.', '.lllllllgggm.', 'lllllllllllggggm.', 'llllllllggggm.'],
      ['..lllllllgggggggm...', '...lllgggm...', '.lllllllggggggm..', '..llllggggm...'],
      ['....ggggggggmm......', '.............', '...ggggggggm.....', '..............'],
    ];
    // hanging tongues, rows 14..20 (one string per tongue / gap)
    const FRINGE = [
      ['lggggm', '.', 'lgm', 'lgggggm', 'm', 'lgm', '.', 'lggggm', 'm', 'lg', 'm', 'lggggm', '.', 'lgggm', 'lgm', 'lgggggm', 'm', 'lggm', '.', 'lggm'],
      ['lggggm', '.', 'mm.', 'lgggggm', '.', 'lgm', '.', 'lggggm', '.', 'mm', '.', 'lggggm', '.', 'lgggm', 'mm.', 'lgggggm', '.', 'lggm', '.', 'lgm.'],
      ['lgggm.', '.', '...', 'llggggm', '.', 'mm.', '.', 'mggggd', '.', '..', '.', 'lggggd', '.', 'mggm.', '...', 'mlggggm', '.', 'mmd.', '.', 'mgm.'],
      ['mgggm.', '.', '...', 'mlggggd', '.', '...', '.', '.gggm.', '.', '..', '.', 'mgggm.', '.', '.mmd.', '...', '.lggggm', '.', '....', '.', '.m..'],
      ['.mmd..', '.', '...', '.ggggm.', '.', '...', '.', '.mmd..', '.', '..', '.', '.mggd.', '.', '.....', '...', '.gggggd', '.', '....', '.', '....'],
      ['......', '.', '...', '.mgggd.', '.', '...', '.', '......', '.', '..', '.', '..md..', '.', '.....', '...', '.mgggd.', '.', '....', '.', '....'],
      ['......', '.', '...', '..mmd..', '.', '...', '.', '......', '.', '..', '.', '......', '.', '.....', '...', '..mmd..', '.', '....', '.', '....'],
    ];
    const E = '.'.repeat(64);
    const rows = [E, E, E, E, E];
    for (const r of CLUMPS) rows.push(r.join(''));
    rows.push(E);
    for (const r of FRINGE) rows.push(r.join(''));
    rows.push(E, E, E);
    const g = rows.map((r, y) => {
      if (r.length !== 64) throw new Error('grass row ' + y + ' has length ' + r.length);
      return r.split('');
    });
    if (g.length !== 24) throw new Error('grass rows ' + g.length);
    // under every clump: a 1px shadow line, then the tongues' roots; between two clumps a teal-dark pocket
    for (let x = 0; x < 64; x++) {
      let bt = 12;
      while (g[bt][x] === '.') bt--;
      const root = g[14][x] === '.' || bt <= 10 ? 't' : g[14][x];
      for (let y = bt + 1; y <= 13; y++) g[y][x] = y === bt + 1 ? 'd' : root;
    }
    // 4 irregular blade tufts poking above the clumps: [x, y, tone]
    const BLADES = [
      [5, 4, 'l'], [6, 4, 'l'], [7, 4, 'l'], [8, 4, 'l'], [10, 4, 'l'], [5, 3, 'l'], [8, 3, 'l'], [11, 3, 'h'], [4, 2, 'h'], [8, 2, 'l'], [9, 1, 'h'],
      [16, 6, 'l'], [17, 6, 'l'], [17, 5, 'l'], [18, 4, 'h'],
      [39, 4, 'l'], [40, 4, 'l'], [41, 4, 'l'], [39, 3, 'l'], [41, 3, 'l'], [39, 2, 'h'], [42, 2, 'h'],
      [56, 5, 'l'], [57, 5, 'l'], [55, 4, 'h'], [57, 4, 'l'], [58, 3, 'h'],
    ];
    for (const [x, y, v] of BLADES) g[y][x] = v;
    const at = (x, y) => (y < 0 || y > 23 ? '.' : g[y][mod(x, 64)]);
    const body = ch => ch !== '.' && ch !== 's' && ch !== 'S';
    // dark outline around the hanging tongues
    for (let y = 14; y < 24; y++) for (let x = 0; x < 64; x++) {
      if (g[y][x] !== '.') continue;
      const fill = ch => ch !== '.' && ch !== 'o';
      if (fill(at(x, y - 1)) || fill(at(x - 1, y)) || fill(at(x + 1, y))) g[y][x] = 'o';
    }
    // cast shadow on the earth: the fringe silhouette dropped down-right (2 steps)
    const sil = g.map(r => r.map(body));
    const S = (x, y) => y >= 0 && y < 24 && sil[y][mod(x, 64)];
    for (let y = 14; y < 24; y++) for (let x = 0; x < 64; x++) {
      if (g[y][x] !== '.') continue;
      if (S(x, y - 1) || S(x - 1, y - 1)) g[y][x] = 's';
      else if (S(x, y - 2) || S(x - 1, y - 2) || S(x - 2, y - 2)) g[y][x] = 'S';
    }
    return px(g.map(r => r.join('')), gp);
  }
  const grass = makeGrass();

  // Ledge caps: the mat rolls over the corner and droops (4px outside, 4px over the ledge).
  const grassEndL = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '....hhhh',
    '..hhhhhl',
    '.hhhhlll',
    'hhhlllll',
    'hhllllll',
    'hllllllg',
    'hlllllgg',
    'hllllggg',
    'lllggggm',
    'llgggmmm',
    'lggmmmmd',
    'gggmmmdd',
    'mgmmmddo',
    'ommdddos',
    '.oddooss',
    '..oosssS',
    '....SSS.',
    '........',
  ], gp);
  const grassEndR = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'hhhl....',
    'lllllg..',
    'llllggg.',
    'lllggggm',
    'llgggggm',
    'lggggggm',
    'ggggggmm',
    'gggggmmd',
    'ggggmmmd',
    'gggmmmdd',
    'mmmmmddo',
    'mmmmdddo',
    'dmmdddo.',
    'oddddo..',
    'soooo...',
    'ssss....',
    'SSSS....',
    '........',
  ], gp);

  // ------------------------------------------------------------------
  // WALL EDGES (8x64, seamless vertically) + UNDERSIDE (64x8)
  // The walls are translucent light / shade ramps laid over the strata, so
  // every seam of the earth runs right up to the outline as a notch. The lit
  // ramp swells in the belly of each stratum and pinches where the seams
  // arrive (rows 0-4, 23-26, 31-35, 49-54 whatever the tile column).
  // ------------------------------------------------------------------
  const SEAM_ZONE = [2, 24.5, 33, 51.5];
  function makeWall(right) {
    const c = G.cv(8, 64);
    for (let y = 0; y < 64; y++) {
      let d = 99;
      for (const z of SEAM_ZONE) d = Math.min(d, Math.abs(y - z), 64 - Math.abs(y - z));
      const lv = d <= 2 ? 0 : d <= 4.5 ? 1 : 2;      // 0 = slab corners at a seam .. 2 = belly of a slab
      if (!right) {
        // sunlit face: warm outline at x=0, then highlight / light / base ramp fading into the earth
        R(c, 0, y, 1, 1, BR[1]);
        const A = [[0.46, 0.2], [0.6, 0.36, 0.16], [0.7, 0.48, 0.28, 0.12]][lv];
        A.forEach((a, i) => R(c, 1 + i, y, 1, 1, 'rgba(255,236,176,' + a + ')'));
        if (d >= 6.5) R(c, 1, y, 1, 1, BR[5]);        // crisp glint on the belly of the big slabs
      } else {
        // face turned away from the sun: ink outline at x=7 behind a dark purple shade
        R(c, 7, y, 1, 1, P.ink);
        const A = [[0.68, 0.5, 0.32, 0.14], [0.64, 0.44, 0.24], [0.6, 0.4, 0.2]][lv];
        A.forEach((a, i) => R(c, 6 - i, y, 1, 1, 'rgba(42,16,52,' + a + ')'));
      }
    }
    return c;
  }
  const wallL = makeWall(false), wallR = makeWall(true);

  // Underside: rounded rock lumps of uneven width seen from below. Each lump's shadow
  // deepens toward its right (away from the sun), ink creeps up the crevices between
  // lumps, a couple of pale roots and moss drips hang over the dark band.
  function makeUnder() {
    const c = G.cv(64, 8);
    const U1 = 'rgba(43,22,34,0.28)', U2 = 'rgba(43,22,34,0.55)';
    const LUMPS = [13, 9, 15, 11, 16];
    let x = 0;
    for (const w of LUMPS) {
      for (let i = 0; i < w; i++, x++) {
        R(c, x, 7, 1, 1, P.ink);
        if (i === 0) {                                // crevice between two lumps
          R(c, x, 4, 1, 3, P.ink); R(c, x, 3, 1, 1, BR[0]); R(c, x, 2, 1, 1, U2); R(c, x, 1, 1, 1, U1);
          continue;
        }
        const t = i / (w - 1), th = t < 0.34 ? 2 : t < 0.72 ? 3 : 4, top = 7 - th;
        for (let y = top; y <= 6; y++)
          R(c, x, y, 1, 1, y === 6 || (y === 5 && th === 4) ? BR[0] : y === top && th >= 3 ? '#73372b' : BR[1]);
        if (x % 16 === 15) R(c, x, top, 1, th, BR[0]); // never lighter than a wall outline it may cover
        if (i === 1 || i === w - 1) R(c, x, 6, 1, 1, P.ink); // rounded lump corners
        R(c, x, top - 1, 1, 1, U2); R(c, x, top - 2, 1, 1, U1);
      }
    }
    if (x !== 64) throw new Error('under lumps cover ' + x);
    // pale roots dangling over the dark band, moss drips
    stamp(c, ['r.', 'r.', '.q', '.q', '.p'], 6, 2, { r: BR[3], q: '#a9602f', p: BR[2] });
    stamp(c, ['.r', '.q', 'q.', 'p.'], 41, 3, { r: BR[3], q: '#a9602f', p: BR[2] });
    stamp(c, ['.b.', 'cbb', 'bab'], 26, 4, { c: GR[2], b: GR[1], a: GR[0] });
    stamp(c, ['c.', 'bb', 'ab'], 55, 4, { c: GR[2], b: GR[1], a: GR[0] });
    return c;
  }
  const under = makeUnder();

  // ------------------------------------------------------------------
  // ONE-WAY PLATFORM — vine-wrapped log (surface = row 0, 9px thick)
  // Vines/leaves sit in the inner halves so a 1-tile platform (left half
  // of `l` + right half of `r`) is a clean stub.
  // ------------------------------------------------------------------
  const E16 = '................';
  const platform = {
    l: px([
      '..kkkkkkkkkkkkkk',
      '.kw51555ed545555',
      'kw541444dc344444',
      'k5441333dc333223',
      'k53413322dc33333',
      'k44312222cb12222',
      'k443122112cb2222',
      '.k3311111bba1111',
      '..kkkkkkkkkkkkkk',
      '..........kdck..',
      '..........kcbk..',
      '...........kk...',
      E16, E16, E16, E16,
    ]),
    m: px([
      'kkkkkkkkkkkkkkkk',
      '5555554555555455',
      '4444444443344444',
      '3322333333332233',
      '3333332233333333',
      '2222222222112222',
      '2221122222222222',
      '1111111111111111',
      'kkkkkkkkkkkkkkkk',
      E16, E16, E16, E16, E16, E16, E16,
    ]),
    r: px([
      'kkkkkkkkkkkkkk..',
      '5555ed55555543k.',
      '4444dc443344432k',
      '3322dc333333321k',
      '33333dc23333321k',
      '22222cb22211211k',
      '221122cb2222210k',
      '11111bba111110k.',
      'kkkkkkkkkkkkkk..',
      '....kdck........',
      '....kcbk........',
      '.....kk.........',
      E16, E16, E16, E16,
    ]),
  };

  // ------------------------------------------------------------------
  // MOVING PLATFORM — floating carved sun-stone slab with moss (48x16)
  // ------------------------------------------------------------------
  function makeMoving() {
    const c = G.cv(48, 16), k = P.ink;
    // slab body (rows 2..10)
    R(c, 1, 2, 46, 1, k); R(c, 0, 3, 48, 7, k); R(c, 1, 10, 46, 1, k);
    R(c, 1, 3, 46, 7, ST[2]);
    R(c, 1, 3, 46, 1, ST[4]); R(c, 1, 4, 46, 1, ST[3]);
    R(c, 1, 8, 46, 2, ST[1]);
    R(c, 1, 3, 1, 6, ST[4]); R(c, 46, 4, 1, 6, ST[1]);
    // carved hooks either side of the emblem
    for (const x of [4, 9, 14]) stamp(c, ['ssss', 's..s', 's.ss'], x, 5, { s: ST[0] });
    for (const x of [30, 35, 40]) stamp(c, ['ssss', 's..s', 'ss.s'], x, 5, { s: ST[0] });
    // rocky keel (rows 11..15), stepped, outlined underneath
    const keel = [[2, 45], [4, 43], [8, 39], [13, 34], [18, 28]];
    for (let i = 0; i < keel.length; i++) {
      const [a, b] = keel[i], y = 11 + i, nx = keel[i + 1] || [99, -1];
      for (let x = a; x <= b; x++) {
        let col = x < a + 3 ? ST[2] : x > b - (b - a) * 0.45 ? ST[0] : ST[1];
        if (x === a || x === b || x < nx[0] || x > nx[1]) col = k;
        R(c, x, y, 1, 1, col);
      }
    }
    // sun emblem
    c.ctx.drawImage(px([
      '..kkkk..',
      '.kJJIIk.',
      'kJwJIIHk',
      'kJJIIIHk',
      'kJIIIHHk',
      'kIIIHHGk',
      '.kHHGGk.',
      '..kkkk..',
    ]), 20, 3);
    // moss cap: per-column fringe depth
    const FR = '234322345432233454322232232245432234432234543223';
    if (FR.length !== 48) throw new Error('moving moss length ' + FR.length);
    for (let x = 0; x < 48; x++) {
      const B = +FR[x], y0 = x === 0 || x === 47 ? 1 : 0;
      for (let y = y0; y <= B; y++) {
        let col = y === 0 ? GR[4] : y === 1 ? GR[3] : y === B ? GR[2] : GM;
        if (y === 0 && (x % 7 === 3 || x === 1 || x === 46)) col = GR[3];
        if (y === 1 && x % 5 === 1) col = GR[4];
        R(c, x, y, 1, 1, col);
      }
      R(c, x, B + 1, 1, 1, x === 0 || x === 47 ? k : GR[0]);
    }
    R(c, 0, 1, 1, 2, GR[1]); R(c, 47, 1, 1, 2, GR[1]);
    return c;
  }
  const moving = makeMoving();

  // ------------------------------------------------------------------
  // PRIZE BLOCK — golden sun-emblem block with a sweeping glint
  // ------------------------------------------------------------------
  const blockRows = [
    '.kkkkkkkkkkkkkk.',
    'kJJJJJJJJJJJJJIk',
    'kJIIIIIqqIIIIIHk',
    'kJIqIIIIIIIIqIHk',
    'kJIIIIqqqqIIIIHk',
    'kJIIIqJJJJqIIIHk',
    'kJIIqJwJJJJqIIHk',
    'kJqIqJ0JJ0JqIqHk',
    'kJqIqJ0JJ0JpIqHk',
    'kJIIqJJJJJJpIIHk',
    'kJIIIqJ00JpIIIHk',
    'kJIIIIqpppIIIIHk',
    'kJIqIIIIIIIIqIHk',
    'kJIIIIIqqIIIIIHk',
    'kIHHHHHHHHHHHHGk',
    '.kkkkkkkkkkkkkk.',
  ];
  const lighter = { I: 'J', H: 'I', J: 'w', q: 'y', p: 'r', G: 'H' };
  function blockFrame(d) {
    if (d < 0) return px(blockRows);
    return px(blockRows.map((r, y) => r.split('').map((ch, x) => {
      const s = x + y;
      return (s === d || s === d + 1) && lighter[ch] ? lighter[ch] : ch;
    }).join('')));
  }
  const block = [blockFrame(-1), blockFrame(7), blockFrame(14), blockFrame(21)];
  const blockUsed = px([
    '.kkkkkkkkkkkkkk.',
    'k44444444444443k',
    'k43333311333332k',
    'k43133333333132k',
    'k43333111133332k',
    'k43331222213332k',
    'k43312222221332k',
    'k41312222221312k',
    'k41310022001312k',
    'k43312222221332k',
    'k43331200213332k',
    'k43333111133332k',
    'k43133333333132k',
    'k43333311333332k',
    'k32222222222221k',
    '.kkkkkkkkkkkkkk.',
  ]);

  // ------------------------------------------------------------------
  // SPRING — [idle, compressed, extended], 16x24 bottom-aligned
  // The coil is a zigzag of lit front turns (cylinder-shaded, stepped up to
  // the right) with the dark back of the wire showing between them once it
  // stretches. The base plate (rows 21-23) is the same canvas in all frames.
  // ------------------------------------------------------------------
  const sprPad = px([
    '..kkkkkkkkkkkk..',
    '.kUwwwUUUUUTTTk.',
    'kUwwUUUTTTTTTTSk',
    'kTUTTTTTTSSSSSRk',
    'kJJJIIIIIIIHHHGk',
    '.kkkkkkkkkkkkkk.',
  ]);
  const sprBase = px([
    '..kkkkkkkkkkkk..',
    '.kxvvvvvvvvuutk.',
    'kkkkkkkkkkkkkkkk',
  ]);
  // tight turn (3 rows per turn): the front of the wire steps up 1px halfway along
  const TIGHT = [
    '...kkkkkvvuutk..',
    '..kxxxxvuuttsk..',
    '..kvvvuukkkkk...',
  ];
  // stretched turn (6 rows per turn): steeper front, dark back strand in the gap
  const LOOSE = [
    '......kkkvvuuk..',
    '...kkkxxvuuttk..',
    '..kxxxvvukkkk...',
    '..kvvukkk.......',
    '...kkktttk......',
    '.....ksssk......',
  ];
  function makeSpring(padY, coil) {
    const c = G.cv(16, 24);
    c.ctx.drawImage(px(coil), 0, 21 - coil.length);
    c.ctx.drawImage(sprBase, 0, 21);
    c.ctx.drawImage(sprPad, 0, padY);
    return c;
  }
  const spring = [
    makeSpring(8, [...TIGHT, ...TIGHT, TIGHT[0]]),
    makeSpring(13, [TIGHT[1], TIGHT[2]]),
    makeSpring(0, ['.....ktttk......', '.....kssskkkk...', ...LOOSE.slice(0, 5), '.....kssskkkk...', ...LOOSE.slice(0, 5), '.....kssskkkk...', LOOSE[0]]),
  ];

  // ------------------------------------------------------------------
  // SPIKES — 16x16: three needle-sharp steel cones on a dark stone plate
  // (white-yellow lit face, blue-violet shade, full ink outline)
  // ------------------------------------------------------------------
  const spikes = px([
    '.......k........',
    '......kwk.......',
    '..k...kwk...k...',
    '.kwk..kwmk.kwk..',
    '.kwk..kwmk.kwk..',
    '.kwmk.kwmk.kwmk.',
    '.kwmkkwvmk.kwmk.',
    '.kwmkkwvmk.kwmk.',
    'kwvmkkwvmkkwvmk.',
    'kwvmkkwvmdkwvmk.',
    'kxvmdkxvmdkxvmdk',
    'kxvmdkxvmdkxvmdk',
    'kxvmdkxvmdkxvmdk',
    'kvuuuuvuuuuvuutk',
    'ktttttttttttttsk',
    'kkkkkkkkkkkkkkkk',
  ], { k: P.ink, w: '#fff8d0', x: ST[4], v: '#b4bce0', m: '#7c7cc4', d: '#4c4690', u: '#666a96', t: '#3e3c68', s: ST[0] });

  // ------------------------------------------------------------------
  // CHECKPOINT — sun-stone lantern post, 16x32
  // ------------------------------------------------------------------
  const headRows = [
    '.......kk.......',
    '......k12k......',
    '......k12k......',
    '.....k1122k.....',
    '....k1AAAA3k....',
    '.kkk1ABBBBA3kkk.',
    'k1122ABCCBA3334k',
    'k1222ABCCBA4344k',
    '.kkk2ABBBBA4kkk.',
    '....k3AAAA4k....',
    '.....k3444k.....',
    '......k34k......',
    '......k44k......',
    '.......kk.......',
  ];
  const postRows = [
    '....kkkkkkkk....',
    '...kxvvvvuutk...',
    '....kkkkkkkk....',
    '....kxvvuutk....',
    '....kxvvuutk....',
    '....kxvvuutk....',
    '....kvuuttsk....',
    '....kxvRRutk....',
    '....kxvRRutk....',
    '....kxvRRutk....',
    '....kxvvuutk....',
    '....kvuuttsk....',
    '....kxvvuutk....',
    '....kkkkkkkk....',
    '...kxvvvvuutk...',
    '..kkkkkkkkkkkk..',
    '..kxvvvvvuuttk..',
    '..kkkkkkkkkkkk..',
  ];
  const headOff = { k: P.ink, 1: ST[4], 2: ST[3], 3: ST[2], 4: ST[1], A: ST[1], B: ST[0], C: ST[1] };
  const GO = P.gold, OR = P.orange;
  const headOn = [
    { k: P.ink, 1: GO[3], 2: GO[2], 3: GO[1], 4: GO[0], A: OR[2], B: OR[4], C: P.white },
    { k: P.ink, 1: P.white, 2: GO[3], 3: GO[2], 4: GO[1], A: OR[3], B: P.white, C: P.white },
    { k: P.ink, 1: GO[3], 2: GO[2], 3: GO[1], 4: GO[0], A: OR[2], B: GO[3], C: P.white },
    { k: P.ink, 1: P.white, 2: GO[3], 3: GO[2], 4: GO[1], A: OR[3], B: P.white, C: P.white },
  ];
  // twinkling diagonal rays around the lit sun: [x, y, tone] relative to the head's 16x14 box
  const RAYS = [
    [[3, 3, 2], [12, 3, 2], [3, 10, 2], [12, 10, 2]],
    [[3, 3, 3], [2, 2, 2], [12, 3, 3], [13, 2, 2], [3, 10, 3], [2, 11, 2], [12, 10, 3], [13, 11, 2]],
    [[3, 3, 2], [12, 3, 2], [3, 10, 2], [12, 10, 2]],
    [[3, 3, 3], [2, 2, 3], [1, 1, 2], [12, 3, 3], [13, 2, 3], [14, 1, 2], [3, 10, 3], [2, 11, 2], [12, 10, 3], [13, 11, 2]],
  ];
  function drawSun(c, ox, oy, f) {
    c.ctx.drawImage(px(headRows, f < 0 ? headOff : headOn[f]), ox, oy);
    if (f >= 0) for (const [x, y, t] of RAYS[f]) R(c, ox + x, oy + y, 1, 1, GO[t]);
  }
  function makeCheckpoint(f) {
    const c = G.cv(16, 32);
    c.ctx.drawImage(px(postRows, Object.assign({}, C, { R: f < 0 ? ST[0] : f % 2 ? GO[3] : GO[2] })), 0, 14);
    drawSun(c, 0, 0, f);
    return c;
  }
  const checkpoint = { off: [makeCheckpoint(-1)], on: [0, 1, 2, 3].map(makeCheckpoint) };

  // ------------------------------------------------------------------
  // GOAL — ancient sun gate, 4 frames 32x48
  // One bold carved glyph per pillar block (sun, moon, eye) that flares up
  // from the bottom block to the top one, then all at once; the portal is a
  // set of crisp vertical light bands whose stepped edges scroll upward.
  // ------------------------------------------------------------------
  const GLYPHS = [
    ['..s..', '.sss.', 'sssss', '.sss.', '..s..'],   // sun
    ['.sss.', 'sss..', 'ss...', 'sss..', '.sss.'],   // crescent moon
    ['.sss.', 's...s', 's.s.s', 's...s', '.sss.'],   // eye of the sun
  ];
  function makeGoal(f) {
    const c = G.cv(32, 48), k = P.ink;
    // portal light (x 10..21): white core, pale and golden flanks, orange rim
    const BAND = [P.white, P.white, GO[3], GO[3], GO[2], OR[3]];
    for (let x = 10; x <= 21; x++) R(c, x, 19, 1, 29, BAND[x < 16 ? 15 - x : x - 16]);
    // rising steps of light: [x, tone, phase, length] — 12px period, 3px up per frame
    const STEPS = [[13, P.white, 0, 6], [18, P.white, 6, 6], [11, GO[3], 3, 5], [20, GO[3], 9, 5], [10, GO[2], 7, 4], [21, GO[2], 1, 4]];
    for (const [x, col, ph, len] of STEPS)
      for (let y = 19; y <= 47; y++) if ((y + f * 3 + ph) % 12 < len) R(c, x, y, 1, 1, col);
    R(c, 10, 21, 12, 1, GO[1]);                        // the lintel's shadow on the light
    // pillars: three bevelled blocks each (rows 21-27, 29-35, 37-43)
    for (const x0 of [1, 22]) {
      const left = x0 === 1;
      R(c, x0, 19, 9, 25, k);
      [21, 29, 37].forEach((by, gi) => {
        R(c, x0 + 1, by, 7, 7, ST[2]);
        R(c, x0 + 1, by + 6, 7, 1, ST[1]);
        R(c, x0 + 1, by, 7, 1, ST[4]);
        R(c, x0 + 1, by + 1, 1, 6, left ? ST[4] : GO[2]);   // sunlit edge / glow of the portal
        R(c, x0 + 7, by + 1, 1, 6, left ? GO[2] : ST[1]);
        R(c, x0 + (left ? 6 : 2), by + 1, 1, 5, left ? ST[3] : ST[3]);
        // carved glyph: dark groove, light catching its lower-right wall
        const hot = f === 3 || gi === 2 - f;
        const groove = hot ? GO[3] : ST[0], wall = hot ? OR[2] : ST[4];
        const gl = GLYPHS[gi];
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
          if (gl[j][i] !== 's') continue;
          if (i < 4 && j < 4 && gl[j + 1][i + 1] !== 's') R(c, x0 + 3 + i, by + 2 + j, 1, 1, wall);
        }
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++)
          if (gl[j][i] === 's') R(c, x0 + 2 + i, by + 1 + j, 1, 1, groove);
      });
      // capital + plinth, one pixel wider than the shaft
      R(c, x0 - 1, 19, 11, 2, k);
      R(c, x0, 19, 9, 1, ST[3]); R(c, x0, 19, 3, 1, ST[4]); R(c, x0 + 7, 19, 2, 1, ST[2]);
      R(c, x0 - 1, 44, 11, 4, k);
      R(c, x0, 45, 9, 2, ST[2]); R(c, x0, 45, 9, 1, ST[3]); R(c, x0, 45, 3, 1, ST[4]); R(c, x0 + 6, 46, 3, 1, ST[1]);
    }
    // lintel with a carved groove either side of the crown
    R(c, 0, 12, 32, 7, k);
    R(c, 1, 13, 30, 5, ST[2]);
    R(c, 1, 13, 30, 1, ST[4]);
    R(c, 1, 14, 30, 1, ST[3]);
    R(c, 1, 17, 30, 1, ST[1]);
    R(c, 1, 13, 1, 4, ST[4]);
    R(c, 30, 14, 1, 4, ST[1]);
    for (const gx of [4, 19]) {
      R(c, gx, 15, 9, 1, f === 3 ? GO[3] : ST[0]);
      R(c, gx + 1, 16, 9, 1, f === 3 ? OR[2] : ST[4]);
    }
    // sun crown
    drawSun(c, 8, 0, f);
    // a three-leaf sprout on the lintel, a leafy vine trailing down its right end
    const lp = { a: GR[0], b: GR[1], c: GR[2], d: GR[3], e: GR[4] };
    stamp(c, [
      '...e....',
      '...ed...',
      'e..dd..e',
      'de.dc.ed',
      '.dddcdd.',
      '..cbcc..',
    ], 0, 6, lp);
    stamp(c, [
      '..ee.',
      '.eddc',
      'edcbb',
      'c.b.b',
      '..b.b',
      '.dc.b',
      '.c..c',
      '...db',
      '..dcb',
      '..c.b',
      '...dc',
      '...c.',
    ], 27, 10, lp);
    return c;
  }
  const goal = [0, 1, 2, 3].map(makeGoal);

  // ------------------------------------------------------------------
  // SIGN — wooden arrow sign pointing right
  // ------------------------------------------------------------------
  const sign = px([
    '................',
    '.kkkkkkkkkkk....',
    'k55555555554k...',
    'k4333333033334k.',
    'k43333330033334k',
    'k43000000003333k',
    'k43333330033332k',
    'k4333333033332k.',
    'k22222222222k...',
    '.kkkkkkkkkkk....',
    '......k43k......',
    '......k43k......',
    '......k32k......',
    '......k32k......',
    '......k32k......',
    '......k21k......',
  ]);

  return {
    dirt, dirtDeep, grass, grassEndL, grassEndR, wallL, wallR, under,
    platform, moving, block, blockUsed, spring, spikes, checkpoint, goal, sign,
  };
});
