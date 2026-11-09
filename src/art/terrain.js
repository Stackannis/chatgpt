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
  // EARTH — zigzag strata of chunky sun-baked rock slabs (64x64 seamless)
  // Four 16px courses per tile; every course is a light slab over a dark
  // seam, the whole stack folded into a stepped chevron (period 32px).
  // ------------------------------------------------------------------
  const ZOFF = [0, 2, 4, 6, 6, 4, 2, 0];          // chevron lift per 4px column group
  const SLAB = [10, 9, 11, 10];                   // slab thickness in each 16px course
  const JOINT = [[9, 38], [24, 52], [3, 29, 46], [17, 60]]; // vertical cracks per course
  const TONE = [[0, 1], [1, 0], [0, 2, 1], [1, 0]];           // slab tone left→right between cracks
  function band(x, y) {
    x = mod(x, 64);
    const yy = mod(y + ZOFF[(x & 31) >> 2], 64);
    const k = yy >> 4, r = yy & 15, s = SLAB[k];
    if (r >= s) return { slab: 0, k, r: r - s, n: 16 - s };
    const J = JOINT[k];
    let tone = TONE[k][J.length - 1];
    for (let j = 0; j < J.length; j++) {
      const jx = mod(J[j] + (r >= (s >> 1) ? 1 : 0), 64); // cracks step sideways halfway down
      if (x === jx) return { slab: 0, k, r, n: s };
      if (x > jx) tone = TONE[k][j];
    }
    return { slab: 1, k, r, n: s, tone };
  }
  function makeDirt(p, rich) {
    const c = G.cv(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const b = band(x, y), ph = (x & 31) >> 2;
      const up = band(x, y - 1), lf = band(x - 1, y), rt = band(x + 1, y), dn = band(x, y + 1), dn2 = band(x, y + 2);
      const lit = ph >= 1 && ph <= 4;             // rising flank + crest face the sun
      let col;
      if (b.slab) {
        if (!up.slab) col = lit ? p.hi : p.hi2;
        else if (!lf.slab) col = p.hi;
        else if (!dn.slab || !rt.slab) col = p.sh;
        else if (!dn2.slab && !lit) col = p.sh;
        else col = p.slab[b.tone];
      } else {
        col = up.slab || lf.slab || band(x - 1, y - 1).slab ? p.cast : p.seam;
      }
      dot(c, x, y, col);
    }
    if (!rich) return c;
    // embedded sandstone cobbles (hand-placed, wedged into the seams)
    const sp = { h: BR[5], l: BR[4], m: '#d8944c', s: '#a9602f', d: '#73372b', o: BR[1] };
    const cobA = [
      '...lllll...',
      '.llhhhlllm.',
      'lhhhlllllms',
      'lhhllllmmms',
      'llllllmmmsd',
      'lllmmmmmssd',
      '.mmmmssssdo',
      '..sssddddo.',
      '....oooo...',
    ];
    const cobB = [
      '..llll.',
      '.lhhllm',
      'lhhllms',
      'lllmmsd',
      '.mmssdo',
      '..dddo.',
    ];
    const cobC = [
      '.lhl.',
      'lhlms',
      'lmmsd',
      '.sdo.',
    ];
    stamp(c, cobA, 24, 6, sp);
    stamp(c, cobC, 37, 11, sp);
    stamp(c, cobB, 50, 37, sp);
    stamp(c, cobC, 9, 24, sp);
    stamp(c, cobB, 13, 53, sp);
    return c;
  }
  const dirt = makeDirt({ slab: ['#c47a3c', '#b96d38', '#cc8742'], hi: BR[4], hi2: '#d8944c', sh: '#a9602f', seam: BR[2], cast: '#73372b' }, true);
  const dirtDeep = makeDirt({ slab: ['#8f4a2e', '#874530', '#8f4a2e'], hi: '#a9602f', hi2: '#9a5330', sh: '#7e402c', seam: '#73372b', cast: '#62302a' }, false);

  // ------------------------------------------------------------------
  // GRASS CAP — 64x24, row 8 = collision surface
  // Puffy sunlit top, three stacked rows of blade teeth, dark fringe,
  // outline and a cast shadow on the earth below.
  // ------------------------------------------------------------------
  const GM = '#4ab842';                            // extra mid green between GR[2] and GR[3]
  const SHADOW = 'rgba(43,22,34,0.45)';
  const GCOL = [GR[0], GR[1], GR[2], GM, GR[3], GR[4]]; // 0 outline .. 5 highlight
  function makeGrass() {
    const c = G.cv(64, 24);
    const g = []; for (let y = 0; y < 24; y++) g.push(new Array(64).fill(-1));
    // hand-authored per-column profiles (64 columns each)
    const TUFTS = ['0122210', '013310', '0111', '0123332210', '012210', '0110', '01233210', '011110', '0122210', '013210']; // bump above row 8
    const MID = '0123321' + '0' + '12321' + '00' + '123321' + '0' + '1232' + '10' + '1233321' + '0' + '12321' + '0' + '123321' + '00' + '12321' + '0' + '1233210' + '0'; // GR[3] teeth: rows below 10
    const FRONT = '2456542' + '0' + '12331' + '0' + '1356531' + '0' + '1221' + '13466531' + '0' + '13431' + '0' + '2466431' + '1221' + '0' + '135531' + '0' + '1231'; // rows below 13
    const BACK = '10000135' + '42113431' + '00013542' + '34310000' + '13542013' + '43100013' + '43245310' + '01354213'; // rows below 15
    const top = [], ti = [], tw = [];
    for (const s of TUFTS) for (let i = 0; i < s.length; i++) { top.push(8 - +s[i]); ti.push(i); tw.push(s.length); }
    if (top.length !== 64 || MID.length !== 64 || FRONT.length !== 64 || BACK.length !== 64)
      throw new Error('grass profile lengths ' + [top.length, MID.length, FRONT.length, BACK.length]);
    for (let x = 0; x < 64; x++) {
      const T = top[x], M = 10 + +MID[x], F = 13 + +FRONT[x], K = 15 + +BACK[x], i = ti[x], w = tw[x];
      // sunlit cap: thick on the flank facing the light, thin on the far side
      const rising = top[mod(x - 1, 64)] > T, falling = top[mod(x + 1, 64)] > T;
      let hl = falling ? 1 : rising ? 3 : 2;
      if (w >= 8 && i === 2) hl = 5;
      if (w >= 8 && (i === 1 || i === 3)) hl = 4;
      for (let y = T; y <= F; y++) {
        let v = y <= M ? 4 : 3;
        if (y < T + hl) v = 5;
        if (i === w - 1 && (y === T + 1 || y === T + 2)) v = 3;   // crease between tufts
        if (y === F && K <= F) v = 2;                              // underside rim
        g[y][x] = v;
      }
      for (let y = F + 1; y <= K; y++) g[y][x] = (y === K || y > F + 2) ? 1 : 2;
    }
    // a few blade tips poking above the tufts: [x, y, value]
    const BLADES = [[10, 4, 4], [11, 3, 5], [41, 4, 4], [40, 3, 5], [44, 5, 5], [60, 4, 4], [61, 3, 5], [61, 2, 5], [24, 4, 5], [25, 3, 5]];
    for (const [x, y, v] of BLADES) g[y][x] = v;
    const at = (x, y) => (y < 0 || y > 23 ? -1 : g[y][mod(x, 64)]);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 64; x++) {
      const v = g[y][x];
      if (v >= 0) { dot(c, x, y, GCOL[v]); continue; }
      if (y < 12) continue;
      if (at(x, y - 1) >= 0 || at(x - 1, y) >= 0 || at(x + 1, y) >= 0) { dot(c, x, y, GCOL[0]); continue; }
      const near = (dx, dy) => at(x + dx, y + dy) >= 0;
      if (near(0, -2) || near(-1, -1) || near(-1, -2) || near(1, -1) || near(0, -3) || near(-1, -3)) dot(c, x, y, SHADOW);
    }
    return c;
  }
  const grass = makeGrass();

  // Ledge caps: the mat rolls over the corner and droops (4px outside, 4px over the ledge).
  const gp = { o: GR[0], d: GR[1], m: GR[2], g: GM, l: GR[3], h: GR[4], s: SHADOW };
  const grassEndL = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '......hh',
    '...hhhhh',
    '..hhhhhl',
    '.hhhllll',
    '.hhlllll',
    'hhllllll',
    'hlllllgg',
    'hllllggg',
    'hlllgggg',
    'lllgggmm',
    'mlgggmmd',
    'omggmmdd',
    '.omgmddo',
    '..ommdos',
    '...odoss',
    '....osss',
    '......s.',
    '........',
  ], gp);
  const grassEndR = px([
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'hh......',
    'hhhhl...',
    'hhllllg.',
    'lllllggm',
    'llllgggm',
    'lllggggm',
    'llgggggm',
    'lgggggmm',
    'ggggggmd',
    'gggggmmd',
    'mgggmmdd',
    'dmmmmddo',
    'odmmddo.',
    'sodddo..',
    'ssooo...',
    'sss.....',
    '.s......',
    '........',
  ], gp);

  // ------------------------------------------------------------------
  // WALL EDGES (8x64, seamless vertically) + UNDERSIDE (64x8)
  // ------------------------------------------------------------------
  // Chipped rim of edge rock: per-row thickness (0 = crack between chunks).
  const RIM = '1223333322211' + '0' + '122233221' + '0' + '11223333333222211' + '0' + '1233322211' + '0' + '1222233221' + '0';
  const LITE = 'rgba(255,224,160,0.3)', DARK1 = 'rgba(43,22,34,0.3)', DARK2 = 'rgba(43,22,34,0.55)';
  function makeWall(right) {
    const c = G.cv(8, 64);
    if (RIM.length !== 64) throw new Error('RIM length ' + RIM.length);
    for (let y = 0; y < 64; y++) {
      const t = +RIM[y], first = +RIM[mod(y - 1, 64)] === 0, last = +RIM[mod(y + 1, 64)] === 0;
      if (!right) {
        // sunlit side: warm outline, bright rim, light spilling onto the strata
        if (t === 0) { dot(c, 0, y, BR[0]); dot(c, 1, y, BR[1]); dot(c, 2, y, BR[1]); dot(c, 3, y, '#73372b'); continue; }
        dot(c, 0, y, BR[1]);
        for (let i = 1; i <= t; i++) {
          let col = i === 1 ? BR[5] : i === 2 ? BR[4] : '#d8944c';
          if (first) col = BR[5];
          if (last) col = i === 1 ? BR[4] : '#a9602f';
          dot(c, i, y, col);
        }
        dot(c, t + 1, y, LITE);
        if (t >= 2) dot(c, t + 2, y, LITE);
      } else {
        // shadow side: ink outline, dark rim, shade creeping over the strata
        dot(c, 7, y, P.ink);
        if (t === 0) { dot(c, 6, y, BR[0]); dot(c, 5, y, BR[0]); dot(c, 4, y, BR[1]); dot(c, 3, y, DARK2); continue; }
        for (let i = 1; i <= t; i++) {
          let col = i === 1 ? BR[0] : i === 2 ? BR[1] : '#73372b';
          if (first) col = i === 1 ? BR[1] : '#73372b';
          if (last) col = BR[0];
          dot(c, 7 - i, y, col);
        }
        dot(c, 6 - t, y, DARK2);
        dot(c, 5 - t, y, DARK1);
        if (t >= 2) dot(c, 4 - t, y, DARK1);
      }
    }
    return c;
  }
  const wallL = makeWall(false), wallR = makeWall(true);

  // Underside: ink outline, chunky dark rock lip, shade fading up into the strata.
  function makeUnder() {
    const c = G.cv(64, 8);
    const LIP = '1223332210' + '12233321' + '0' + '1222333332221' + '0' + '12332210' + '122333221' + '0' + '1223333322110';
    if (LIP.length !== 64) throw new Error('LIP length ' + LIP.length);
    for (let x = 0; x < 64; x++) {
      const t = +LIP[x], first = +LIP[mod(x - 1, 64)] === 0, last = +LIP[mod(x + 1, 64)] === 0;
      dot(c, x, 7, P.ink);
      if (t === 0) { dot(c, x, 6, BR[0]); dot(c, x, 5, BR[0]); dot(c, x, 4, BR[1]); dot(c, x, 3, DARK2); continue; }
      for (let j = 1; j <= t; j++) {
        let col = j === 1 ? BR[0] : j === 2 ? BR[1] : '#73372b';
        if (first) col = j === 1 ? BR[1] : '#73372b';
        if (last) col = BR[0];
        dot(c, x, 7 - j, col);
      }
      dot(c, x, 6 - t, DARK2);
      dot(c, x, 5 - t, DARK1);
      if (t >= 2) dot(c, x, 4 - t, DARK1);
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
    'k33333333333332k',
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
  ]);

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
      rays.forEach(([x, y]) => R(c, x, y, 1, 1, f === 2 ? P.gold[3] : P.gold[2]));
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
