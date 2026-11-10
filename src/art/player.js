// SUNFOX — Kit the fox (player sprites).
// Every frame is 32x32, facing right, feet on the bottom row, body axis on x=16.
// Kit is authored as hand-pixelled PARTS (head, torso, limbs, tail, scarf ribbon) in canvas
// coordinates; frames are composed from parts with integer offsets so volumes stay consistent
// between frames, then a "selout" pass tints the sun-facing outline with dark local colour.
G.defineArt('player', G => {
  'use strict';
  const P = G.PAL;
  const C = {
    k: P.ink, K: P.ink,                       // k = outline (may be tinted by selout), K = features (never tinted)
    o: P.orange[0], r: P.orange[1], O: P.orange[2], y: P.orange[3], Y: P.orange[4],
    w: P.white, c: P.brown[5], s: P.brown[4], u: P.brown[3],
    D: P.brown[0], d: P.brown[1], b: P.brown[2],  // dark "socks", paws, ear tips
    g: P.teal[0], t: P.teal[1], T: P.teal[2], h: P.teal[3],
    p: P.pink[1], q: P.pink[0],
  };
  const W = 32, H = 32;

  // ---------------------------------------------------------------- char-buffer toolkit
  const blank = () => Array.from({ length: H }, () => new Array(W).fill('.'));
  // A part is [firstRow, 'row', 'row', ...] in canvas coordinates ('.' transparent, '_' erases).
  function put(buf, part, dx, dy, map) {
    dx = dx || 0; dy = dy || 0;
    for (let j = 1; j < part.length; j++) {
      const row = part[j], y = part[0] + j - 1 + dy;
      if (y < 0 || y >= H) continue;
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const X = x + dx;
        if (X < 0 || X >= W) continue;
        buf[y][X] = ch === '_' ? '.' : (map && map[ch]) || ch;
      }
    }
    return buf;
  }
  // Copy of a part with some canvas rows replaced: patch(part, {10: 'newrow', ...}).
  function patch(part, rows) {
    const p = part.slice();
    for (const k in rows) p[+k - part[0] + 1] = rows[k];
    return p;
  }
  // Selective outline: outline pixels on the sun side (upper-left) take a dark shade of the
  // material they wrap instead of ink.
  const MAT = {};
  'orOyY'.split('').forEach(ch => (MAT[ch] = 'o'));
  'wcsubd'.split('').forEach(ch => (MAT[ch] = 'd'));
  'gtTh'.split('').forEach(ch => (MAT[ch] = 'g'));
  function selout(buf) {
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : buf[y][x]);
    const out = buf.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (buf[y][x] !== 'k') continue;
      let nx = 0, ny = 0, edge = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && at(x + dx, y + dy) === '.') { nx += dx; ny += dy; if (!dx || !dy) edge = true; }
      }
      if (!edge || -nx - ny <= 0) continue;
      const votes = {};
      for (const [dx, dy, wgt] of [[1, 0, 2], [0, 1, 2], [-1, 0, 2], [0, -1, 2], [1, 1, 1]]) {
        const m = MAT[at(x + dx, y + dy)];
        if (m) votes[m] = (votes[m] || 0) + wgt;
      }
      let best = null, bv = 0;
      for (const m in votes) if (votes[m] > bv) { bv = votes[m]; best = m; }
      if (best) out[y][x] = best;
    }
    return out;
  }
  const render = buf => G.px(selout(buf).map(r => r.join('')), C);
  const frame = (...layers) => {
    const b = blank();
    for (const L of layers) if (L) put(b, L[0], L[1], L[2], L[3]);
    return render(b);
  };

  // ---------------------------------------------------------------- procedural part layers
  // Limbs, tail, torso and scarf are built as small layers from joints (so every pose is a real,
  // distinct pose with consistent volumes), form-shaded from the upper left, outlined, then stacked.
  const RAMP = { O: ['y', 'O', 'r'], c: ['w', 'c', 's'], b: ['u', 'b', 'd'], r: ['O', 'r', 'o'], d: ['b', 'd', 'D'] };
  const set = (L, x, y, ch) => { if (x >= 0 && y >= 0 && x < W && y < H) L[y][x] = ch; };
  function disc(L, cx, cy, r, ch) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.05) set(L, x, y, ch);
  }
  const steps = (a, b) => Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) * 2 + 1;
  function cap(L, a, b, ra, rb, ch) {            // tapered capsule
    const n = steps(a, b);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      disc(L, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ra + (rb - ra) * t, typeof ch === 'function' ? ch(t) : ch);
    }
  }
  function sq(L, a, b, ch) {                     // 2px-thick stroke (top-left anchored)
    const n = steps(a, b);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
      const c = typeof ch === 'function' ? ch(t) : ch;
      set(L, x, y, c); set(L, x + 1, y, c); set(L, x, y + 1, c); set(L, x + 1, y + 1, c);
    }
  }
  function shade(L, depth) {
    const e = (x, y) => x < 0 || y < 0 || x >= W || y >= H || L[y][x] === '.';
    const out = L.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const R = RAMP[L[y][x]];
      if (!R) continue;
      const dark = e(x + 1, y) || e(x, y + 1) || (depth > 1 && (e(x + 1, y + 1) || e(x, y + 2)));
      const lit = e(x - 1, y) || e(x, y - 1) || (depth > 1 && (e(x - 1, y - 1) || e(x, y - 2)));
      out[y][x] = lit && !(dark && !e(x, y - 1) && !e(x - 1, y)) ? R[0] : dark ? R[2] : R[1];
    }
    return out;
  }
  // Thin limbs: flat colour, one shadow edge underneath (and a light top edge on socks / mitts only).
  const FLAT = { O: ['O', 'O', 'r'], b: ['u', 'b', 'd'], r: ['r', 'r', 'o'], d: ['d', 'd', 'D'] };
  function shadeFlat(L) {
    const e = (x, y) => x < 0 || y < 0 || x >= W || y >= H || L[y][x] === '.';
    const out = L.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const R = FLAT[L[y][x]];
      if (!R) continue;
      out[y][x] = e(x, y - 1) ? R[0] : e(x, y + 1) || (e(x + 1, y) && !e(x - 1, y)) ? R[2] : R[1];
    }
    return out;
  }
  function outl(L, ch) {
    const f = (x, y) => x >= 0 && y >= 0 && x < W && y < H && L[y][x] !== '.';
    const out = L.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (L[y][x] === '.' && (f(x - 1, y) || f(x + 1, y) || f(x, y - 1) || f(x, y + 1))) out[y][x] = ch || 'k';
    return { L: out };
  }
  const add = (p, d) => [p[0] + d[0], p[1] + d[1]];

  // leg = [hip, knee, ankle, footVector]; the lower shin and the foot are the dark "sock".
  function leg(p, far) {
    const L = blank(), fur = far ? 'r' : 'O', sock = far ? 'd' : 'b';
    cap(L, p[0], p[1], 1.5, 1.3, fur);
    sq(L, p[1], p[2], t => (t < 0.3 ? fur : sock));
    const toe = add(p[2], p[3]);
    sq(L, p[2], toe, sock);
    const S = shadeFlat(L);
    const tx = Math.round(toe[0]), ty = Math.round(toe[1]), fx = p[3][0] >= 0 ? 1 : 0;
    set(S, tx + fx, ty, far ? 'b' : 's');                      // lighter toe cap
    if (!far) set(S, tx + 1 - fx, ty, 'u');
    return outl(S);
  }
  // arm = [shoulder, elbow, hand]: orange sleeve of fur, round brown mitt.
  function arm(p, far) {
    const L = blank(), fur = far ? 'r' : 'O', paw = far ? 'd' : 'b';
    sq(L, p[0], p[1], fur); sq(L, p[1], p[2], fur);
    disc(L, p[2][0] + 0.5, p[2][1] + 0.5, 1.6, paw);
    return outl(shadeFlat(L));
  }
  // tail = spine points + radii; the last third is the cream tip.
  function tail(pts, rs, cream) {
    const L = blank(), n = pts.length - 1;
    cream = cream || 0.7;
    for (let s = 0; s < n; s++) cap(L, pts[s], pts[s + 1], rs[s], rs[s + 1], t => ((s + t) / n > cream ? 'c' : 'O'));
    return outl(shade(L, 2));
  }
  // scarf ribbon: 2-segment streamer (3 points), light upper edge, dark-teal outline.
  function ribbon(pts) {
    const L = blank();
    for (let s = 0; s < pts.length - 1; s++) sq(L, pts[s], pts[s + 1], 'T');
    const e = (x, y) => x < 0 || y < 0 || x >= W || y >= H || L[y][x] === '.';
    const S = L.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (L[y][x] === 'T') S[y][x] = e(x, y + 1) || (e(x + 1, y) && !e(x, y - 1)) ? 't' : 'T';
    const last = pts[pts.length - 1];
    set(S, Math.round(last[0]), Math.round(last[1]), 'h');
    return outl(S, 'g');
  }
  // torso capsule (neck -> hips) with the cream belly on its front side.
  function torso(n, h, r) {
    const L = blank();
    r = r || 3.5;
    const dx = h[0] - n[0], dy = h[1] - n[1], len = Math.hypot(dx, dy) || 1, f = [dy / len, -dx / len];
    cap(L, n, h, r, r, 'O');
    cap(L, [n[0] + f[0] * 1.7, n[1] + f[1] * 1.7], [h[0] + f[0] * 1.7, h[1] + f[1] * 1.7], r - 1.7, r - 1.7, 'c');
    return outl(shade(L, 2));
  }
  // scarf neck band between two points (3px tall).
  function band(a, b) {
    const L = blank(), n = steps(a, b);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
      set(L, x, y - 1, t < 0.3 ? 'h' : 'T'); set(L, x, y, t > 0.6 ? 't' : 'T'); set(L, x, y + 1, 't');
    }
    return outl(L, 'g');
  }
  function build(parts) {
    const b = blank();
    for (const p of parts) {
      if (!p) continue;
      if (p.L) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p.L[y][x] !== '.') b[y][x] = p.L[y][x]; }
      else put(b, p[0], p[1], p[2], p[3]);
    }
    return render(b);
  }
  // Full procedural pose. o: head [part,dx,dy], tn/th torso neck+hip, bd band [a,b], tail [pts,rs],
  // rib points, aN/aF arms, lN/lF legs.
  function kit(o) {
    return build([
      o.tail && tail(o.tail[0], o.tail[1], o.tail[2]), o.rib && ribbon(o.rib),
      o.aF && arm(o.aF, true), o.lF && leg(o.lF, true),
      torso(o.tn, o.th, o.tr), o.bd && band(o.bd[0], o.bd[1]),
      o.lN && leg(o.lN), o.head, o.aN && arm(o.aN), o.over,
    ]);
  }

  // ---------------------------------------------------------------- HEAD (the master part)
  const HEAD = [1,
    '............k',
    '...........kDk........k',
    '...........kDDk......kDk',
    '..........kDddk.....kDdk',
    '..........kOqpOk...kOqOOk',
    '..........kOqppOkkkkOqpOk',
    '..........kyOqqOOyyOOqqOk',
    '..........kyYYYyyyOOOOrk',
    '.........kyYYyOKKKOOKKrk',
    '........kyyyyOKwwKKOKwKrk',
    '........kyyyOKwwwwKOwwKrk',
    '........kyyOOKwwwKKOwKKOOkkk',
    '........kOOOOKwwwKKOwKKwwcKKk',
    '......kkcOOOOOKwwwKcKKccwcKk',
    '.....kwwccrrOccKKKccccKccck',
    '......kkwwcccccccccccccKKKk',
    '.......kkkk.......cssscck',
    '..................kkkkkk',
  ];
  const HEAD_BLINK = patch(HEAD, {
    10: '........kyyyyOOOOOOOOOOrk',
    11: '........kyyyOOOOOOOOOOOrk',
    12: '........kyyOOKOOOOKOKOOOOkkk',
    13: '........kOOOOOKKKKOOOKKwwcKKk',
    14: '......kkcOOOOOOcccccccccwcKk',
  });
  const SOCK = { d: 'b', b: 'u', D: 'd' };       // hand-pixelled socks/paws lifted to the 2-tone sock ramp

  // ---------------------------------------------------------------- IDLE
  const TORSO = [17,
    '..........gggggggggggg',
    '..........ThhTTTTttttg',
    '..........gtTTttTTTtttg',
    '...........kyyOOcwwck',
    '...........kOyOrcwwwck',
    '..........kbbdkrccwcskOk',
    '..........kdddkOcccskbdk',
    '...........kkkOOOOOOkddk',
    '.....................kk',
  ];
  const LEGS = [25,
    '...........krOOk.kOOrk',
    '...........krOOk.kOOrk',
    '...........kubbk.kubbk',
    '...........kubbdkkubbdk',
    '..........kbbbuuskbbuusk',
    '..........kddddddkdddddk',
    '...........kkkkkk.kkkkk',
  ];
  const LEGS_LOW = [26,
    '...........krOOk.kOOrk',
    '...........kubbk.kubbk',
    '...........kubbdkkubbdk',
    '..........kbbbuuskbbuusk',
    '..........kddddddkdddddk',
    '...........kkkkkk.kkkkk',
  ];
  const ITAIL_R = [1.6, 2.8, 2.9, 1.3];
  const itail = (tx, ty) => tail([[11, 26], [7, 27.4], [3.6, 24], [tx, ty]], ITAIL_R);
  const idle = [
    build([itail(4, 19), ribbon([[10, 19], [8, 20], [8, 22]]), [LEGS], [TORSO, 0, 0, SOCK], [HEAD]]),
    build([itail(4.5, 18.5), ribbon([[10, 19], [8, 20], [7, 22]]), [LEGS], [TORSO, 0, 0, SOCK], [HEAD, 0, 1]]),
    build([itail(5, 18), ribbon([[10, 20], [8, 21], [7, 22]]), [LEGS_LOW], [TORSO, 0, 1, SOCK], [HEAD, 0, 1]]),
    build([itail(4.5, 18.5), ribbon([[10, 19], [8, 20], [8, 22]]), [LEGS], [TORSO, 0, 0, SOCK], [HEAD_BLINK, 0, 1]]),
  ];

  // ---------------------------------------------------------------- RUN
  // One leg through the 8-pose cycle: [hip, knee, ankle, foot]. Frame i = pose i (near) + pose i+4 (far).
  // 0 contact (heel strike) · 1 down · 2 passing (support) · 3 up (push-off) · 4 just left the ground ·
  // 5 kicked up behind · 6 tucked, knee coming through · 7 reaching for the next step.
  const LEGP = [
    [[15, 25], [18, 27], [20, 29], [3, -1]],
    [[15, 26], [18, 28], [16, 29], [3, 0]],
    [[15, 25], [15, 27], [14, 29], [3, 0]],
    [[15, 24], [13, 26], [10, 27], [1, 2]],
    [[15, 25], [12, 27], [9, 26], [-1, 2]],
    [[15, 26], [12, 28], [8, 26], [-2, -1]],
    [[15, 25], [19, 26], [16, 27], [2, 1]],
    [[15, 24], [19, 25], [20, 27], [3, -1]],
  ];
  const SWING = [[[-3, 1], [-6, -1]], [[-3, 2], [-5, 3]], [[0, 3], [1, 5]], [[3, 2], [6, 2]], [[4, 1], [8, -1]]];
  const ARM_SEQ = [0, 1, 2, 3, 4, 3, 2, 1];
  const BOB = [0, 1, 0, -1];
  const TIP = [1, 0, -1, 0];                       // tail tip lags the bob by a quarter cycle
  const WAVE = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // scarf ripple
  const shiftLeg = (p, dx) => [add(p[0], [dx, 0]), add(p[1], [dx, 0]), add(p[2], [dx, 0]), p[3]];
  const run = [];
  for (let i = 0; i < 8; i++) {
    const k = i % 4, b = BOB[k], j = (i + 4) % 8;
    const sN = [15, 21 + b], sF = [18, 21 + b], aN = SWING[ARM_SEQ[i]], aF = SWING[ARM_SEQ[j]];
    run.push(kit({
      head: [HEAD, 2, 1 + b],
      tn: [17, 21 + b], th: [15, 24 + b], bd: [[13, 19 + b], [22, 19 + b]],
      tail: [[[12, 25 + b], [8, 26 + b], [5, 24 + b + TIP[k] * 0.5], [2.5, 21 + b + TIP[k]]], [1.6, 2.9, 2.9, 1.8]],
      rib: [[11, 17 + b], [8, 16 + b + WAVE[k][0]], [4, 16 + b + WAVE[k][1]]],
      aN: [sN, add(sN, aN[0]), add(sN, aN[1])],
      aF: ARM_SEQ[j] > 2 && [sF, add(sF, aF[0]), add(sF, aF[1])],
      lN: LEGP[i], lF: shiftLeg(LEGP[j], 1),
    }));
  }

  // ---------------------------------------------------------------- HEAD variants
  const MOUTH_OPEN = {                    // lower jaw dropped, tongue showing
    16: '......kkwwcccccccccccKqqqKk',
    17: '.......kkkk.......cssKqppKk',
    18: '..................kkkkkkkk',
  };
  const EYES_UP = {                       // pupils high: looking where he jumps
    11: '........kyyyOKwwwKKOwKKrk',
    13: '........kOOOOKwwwwKOwwKwwcKKk',
  };
  const EYES_WHOA = {                     // enlarged eyes, pin pupils looking down
    8: '..........kyYYYKKKOOKKrk',
    9: '.........kyYYyKwwwKOKwKk',
    10: '........kyyyyKwwwwKOwwKrk',
    11: '........kyyyOKwwwwKOwwKrk',
    12: '........kyyOOKwwKwKOwKKOOkkk',
    13: '........kOOOOKwwKwKOwKKwwcKKk',
  };
  const HEAD_JUMP = patch(HEAD, Object.assign({}, EYES_UP, MOUTH_OPEN));
  const HEAD_FALL = patch(HEAD, Object.assign({}, EYES_WHOA, MOUTH_OPEN));
  // Ears swept flat along the skull: replaces head rows 3..9.
  const sweep = head => [3,
    '.............kk',
    '.....kkk....kDDk',
    '....kDDdkkk.kDdrk',
    '....kDdOOOOkkkdrrkk',
    '.....kkOOqqqOOkkrrOkkkk',
    '.......kkOOqqpOYyy' + head[8].slice(18),
    head[9],
  ].concat(head.slice(10));
  const HEAD_SWEPT = sweep(HEAD_JUMP);

  // ---------------------------------------------------------------- JUMP (0 = take-off stretch, 1 = knees-up apex)
  const jump0 = kit({
    head: [HEAD_SWEPT, 2, -3],
    tn: [17, 17], th: [14, 23], tr: 3.3, bd: [[13, 15], [22, 15]],
    tail: [[[11, 24], [7, 26], [4, 28], [2, 29]], [1.6, 2.7, 2.2, 1]],
    rib: [[11, 15], [9, 17], [7, 19]],
    aN: [[17, 18], [21, 19], [25, 17]], aF: [[15, 19], [12, 21], [10, 22]],
    lN: [[15, 25], [16, 27], [15, 28], [0, 1]], lF: [[14, 25], [13, 27], [11, 28], [-1, 1]],
  });
  const jump1 = kit({
    head: [HEAD_SWEPT, 1, -2],
    tn: [16, 18], th: [14, 21], bd: [[12, 16], [21, 16]],
    tail: [[[11, 23], [7, 25], [4, 27], [3, 29.5]], [1.6, 2.8, 2.4, 1]],
    rib: [[10, 16], [8, 18], [6, 20]],
    aN: [[16, 19], [19, 21], [22, 19]], aF: [[14, 19], [11, 20], [9, 19]],
    lN: [[15, 23], [19, 24], [17, 27], [3, 0]], lF: [[17, 23], [22, 23], [22, 26], [3, -1]],
  });

  // ---------------------------------------------------------------- FALL (same pose, tail / scarf / limbs flutter)
  const fallF = f => kit({
    head: [HEAD_FALL, 1, 2],
    tn: [16, 22], th: [15, 25], bd: [[12, 20], [21, 20]],
    tail: [[[12, 26], [8, 24], [4, 18], f ? [4, 10] : [2, 11]], [1.6, 2.8, 2.8, 1.2]],
    rib: f ? [[10, 19], [9, 12], [6, 7]] : [[10, 19], [7, 12], [9, 6]],
    aN: [[13, 22], [9, 21], [7, 17 + f]], aF: [[19, 22], [24, 22], [28, 21 - f]],
    lN: [[16, 27], [20, 27], [19, 29 - f], [3, 0]], lF: [[14, 27], [12, 28], [9, 29 - f], [-3, -1]],
  });
  const fall = [fallF(0), fallF(1)];

  // ---------------------------------------------------------------- DUCK
  const HEAD_DUCK = sweep(patch(HEAD, { 10: '........kyyyyOKKKKKOKKKrk' }));
  const duck = kit({
    head: [HEAD_DUCK, 1, 9],
    tn: [13, 25.5], th: [10, 26.5], bd: [[10, 27], [18, 27]],
    tail: [[[8, 28], [4, 27.6], [2.5, 24], [3, 20]], [1.6, 2.4, 1.9, 1]],
    lN: [[11, 27], [15, 27], [13, 29], [3, 0]],
    aN: [[17, 26], [20, 27], [22, 28]],
    over: band([10, 27], [15, 27]),
  });

  // ---------------------------------------------------------------- HURT (knocked back, also the death pop)
  const HEAD_HURT = sweep(patch(HEAD, {
    8: '..........kyYYYyyyOOOOrk',
    9: '.........kyYYyOOOOOOOOrk',
    10: '........kyyyyOKKOOOOOOKrk',
    11: '........kyyyOOOOKKOOOKOrk',
    12: '........kyyOOOOOOOKOKOOOOk',
    13: '........kOOOOOOOKKOOOKOwcckk',
    14: '......kkcOOOOOKKOOOcccKccckk',
    15: '.....kwwccrrOcccccccKccccck',
    16: '......kkwwccccccccccKoqqqk',
    17: '.......kkkk.......cscqppk',
    18: '..................kcsscck',
  }).concat(['...................kkkkk']));
  const hurt = kit({
    head: [HEAD_HURT, -3, -3],
    tn: [12, 19], th: [16, 23], bd: [[10, 17], [16, 17]],
    tail: [[[14, 25], [11, 27.5], [7, 28.5], [3, 27]], [1.5, 2.3, 2.1, 1.3]],
    rib: [[8, 17], [5, 18], [3, 16]],
    aN: [[10, 20], [7, 22], [4, 21]],
    lN: [[18, 24], [22, 23], [25, 20], [1, -2]], lF: [[17, 25], [22, 26], [26, 26], [2, -1]],
  });

  // ---------------------------------------------------------------- SKID (leaning back, heels dug in)
  const HEAD_SKID = patch(HEAD, Object.assign({}, EYES_WHOA, {
    15: '.....kwwccrrOccKKKccccKKKKk',
    16: '......kkwwcccccccccccKwwKwk',
    17: '.......kkkk.......cssKKKKKk',
  }));
  const skidR = kit({
    head: [HEAD_SKID, -4, 2],
    tn: [12, 22], th: [17, 25], bd: [[8, 20], [17, 20]],
    tail: [[[13, 26], [9, 25], [5, 24], [2, 21]], [1.6, 2.8, 2.6, 1.4]],
    rib: [[17, 21], [20, 22], [22, 20]],
    aN: [[10, 22], [7, 23], [4, 21]],
    lN: [[19, 26], [23, 28], [26, 29], [2, -2]], lF: [[16, 26], [19, 28], [15, 29], [3, 0]],
  });

  // ---------------------------------------------------------------- WIN (facing the camera, fist pump)
  const W_HEAD = [1,
    '........kk............kk',
    '.......kDDk..........kDDk',
    '.......kDDdk........kdDDk',
    '......kDdqpOk......kOpqdDk',
    '......kOqppOOk....kOOppqOk',
    '......kOqqpOOOkkkkOOOpqqOk',
    '......kyOOqOOyyyyyyOOqOOrk',
    '.....kyYYYYyyyyyyyyyOOOOOrk',
    '.....kyYYyyyyyyyyyyOOOOOOrk',
    '.....kyyyKKKyyyyOOOOKKKOOrk',
    '.....kyyKyyyKOOOOOOKOOOKOrk',
    '....kkOOOOOOOOccccOOOOOOOOkk',
    '...kwwcOOOOOccKKKKccOOOOOcwwk',
    '...kwwccOOOccccKKccccOOOccwsk',
    '....kkwcccKccccccccccKcccskk',
    '......kkcccKKKKKKKKKKcccskk',
    '........kkccKqqppppqKccskk',
    '..........kkkKqppppKkkk',
    '.............kKKKKk',
  ];
  const W_TORSO = [19,
    '.........gggg......gggg',
    '........gThTTggggggTTttg',
    '........gtTTTTTTTTTTtttg',
    '.........kyOOcwwwwcOOrk',
    '.........kOOcwwwwwwcOrk',
    '.........kOOccwwwwccOrk',
    '.........krOOccccccOrrk',
    '..........kkkkkkkkkkkk',
  ];
  const W_LEGS_A = [26,
    '..........kOOOkkkkOOrk',
    '..........kdddk..kdddk',
    '.........kdbbdk..kdbbdk',
    '.........kDDDDk..kDDDDk',
    '..........kkkk....kkkk',
  ];
  const W_LEGS_B = [26,
    '..........kOOOkkkkOOrk',
    '..........kOOOk..kOOrk',
    '..........kdddk..kdddk',
    '..........kdbdk..kdbdk',
    '..........kDDDk..kDDDk',
    '...........kkk....kkk',
  ];
  const W_ARM_L = [22,
    '.....kOyOk',
    '....kOOkk',
    '....kOOk',
    '.....kbbdk',
    '.....kdddk',
    '......kkk',
  ];
  const W_TAIL = [14,
    '..kk',
    '.kwwk',
    '.kwwwk',
    'kwwwck',
    'kwwcck',
    'kwcccOk',
    'kcccOOk',
    'kccOyOOk',
    '.kOyyOOOk',
    '.kOyyOOOOk',
    '.kOOyOOOOk',
    '..kOOOOOOk',
    '..krOOOOrk',
    '...krrrrk',
    '....kkkk',
  ];
  const W_RIBBON = [17,
    '....gg',
    '...gTTg',
    '....gtTgg',
    '.....ggtT',
  ];
  const winF = f => build([
    [W_TAIL, f, 1 - f], [W_RIBBON, 0, 2 - f],
    [W_TORSO, 0, 1 - f, SOCK], [W_ARM_L, 0, 1 - f, SOCK], [f ? W_LEGS_B : W_LEGS_A, 0, f ? 0 : 1, SOCK], [W_HEAD, 0, 1 - f],
    arm(f ? [[21, 21], [26, 20], [28, 12]] : [[21, 22], [25, 23], [28, 18]]),
  ]);
  const win = [winF(0), winF(1)];

  // ---------------------------------------------------------------- HUD icon (16x16)
  const icon = G.px([
    '...k......k.....',
    '..kDk....kDk....',
    '..kDDk..kDdk....',
    '.kOqpOkkOqOk....',
    '.kOqpOyyOqpOk...',
    '.kyYYyyyOOOrk...',
    'kyYyOKKKOKKrk...',
    'kyyOKwwKKwKKOk..',
    'kyyOKwwwKwwKckk.',
    'kOOOKwwKKwKKckk.',
    'kkcOOKKKcKKcck..',
    'kwwcccccccKck...',
    '.kkwwccccckk....',
    '...kkkkcsck.....',
    '......kkkk......',
    '................',
  ], C);
  return {
    idle, run,
    jump: [jump0, jump1], fall, skid: [skidR], hurt: [hurt], duck: [duck],
    win, icon,
  };
});
