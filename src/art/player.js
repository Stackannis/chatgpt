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
  'wcsu'.split('').forEach(ch => (MAT[ch] = 'd'));
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
    '........kyyOOKwwwKKOwKKOOk',
    '........kOOOOKwwwKKOwKKwcckk',
    '......kkcOOOOOKwwwKcKKcccckk',
    '.....kwwccrrOccKKKccccKccck',
    '......kkwwccccccccccccckkk',
    '.......kkkk.......cssck',
    '..................kkkk',
  ];
  const HEAD_BLINK = patch(HEAD, {
    10: '........kyyyyOOOOOOOOOOrk',
    11: '........kyyyOOOOOOOOOOOrk',
    12: '........kyyOOKOOOOKOKOOOOk',
    13: '........kOOOOOKKKKOOOKKwcckk',
    14: '......kkcOOOOOOcccccccccckk',
  });

  // ---------------------------------------------------------------- IDLE parts
  const TAIL_A = [20,
    '.kk',
    'kwwk',
    'kwwwkk',
    'kwwcccOkkkk',
    'kwcccOcOOOOO',
    'kcccOyyyOOOOO',
    'kcsOyyyOOOOOO',
    '.ksOOOOOOOOOO',
    '.krrOOOOOOrrk',
    '..kkrrrrrrrk',
    '....kkkkkkk',
  ];
  const RIBBON_A = [17,
    '......ggg',
    '....ggTTTt',
    '...gtTTtgg',
    '...gtgggg',
    '....g',
  ];
  const TORSO = [17,
    '..........gggggggggggg',
    '..........ThhTTTTttttg',
    '.........gtTTttTTTtttg',
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
    '...........kdddk.kdddk',
    '...........kdbbdkkdbbdk',
    '..........kdddbbdkddbbdk',
    '..........kDDDDDDkDDDDDk',
    '...........kkkkkk.kkkkk',
  ];
  const LEGS_LOW = [26,
    '...........krOOk.kOOrk',
    '...........kdddk.kdddk',
    '...........kdbbdkkdbbdk',
    '..........kdddbbdkddbbdk',
    '..........kDDDDDDkDDDDDk',
    '...........kkkkkk.kkkkk',
  ];

  const idle = [
    frame([TAIL_A], [RIBBON_A], [LEGS], [TORSO], [HEAD]),
    frame([TAIL_A], [RIBBON_A], [LEGS], [TORSO], [HEAD, 0, 1]),
    frame([TAIL_A], [RIBBON_A, 0, 1], [LEGS_LOW], [TORSO, 0, 1], [HEAD, 0, 1]),
    frame([TAIL_A], [RIBBON_A], [LEGS], [TORSO], [HEAD_BLINK, 0, 1]),
  ];
  // ---------------------------------------------------------------- RUN parts
  // Legs: ONE leg through the whole 8-pose cycle (authored at its own bob height).
  // Frame i shows pose i as the near leg and pose i+4, darkened, as the far leg.
  const LEG = [
    [25, // 0 contact: heel strike ahead
      '..............kOOOk',
      '...............kOOOk',
      '................kOOOkk..kk',
      '.................kkdddkkbdk',
      '...................kddbbddk',
      '...................kDDDDkk',
      '....................kkkk'],
    [26, // 1 down: weight on the bent leg
      '..............kOOOOk',
      '..............krOOOOk',
      '...............kkdddk',
      '...............kdbbddk',
      '...............kDDDDDDk',
      '................kkkkkk'],
    [25, // 2 passing: support leg under the body
      '.............kOOOk',
      '.............krOOk',
      '.............kdddk',
      '.............kdbdkk',
      '.............kdbbddk',
      '.............kDDDDDk',
      '..............kkkkk'],
    [24, // 3 up: push-off, leg stretched back
      '.............kOOOk',
      '............kOOOk',
      '...........krOOk',
      '..........kdddk',
      '........kkdddk',
      '.......kdbddk',
      '.......kDDDk',
      '........kkk'],
    [24, // 4 trailing, foot kicked up behind
      '......kkk',
      '.....kdbdk...kOOOk',
      '.....kDdddkkkOOOk',
      '......kkddddrOOk',
      '........kkkkkkk'],
    [26, // 5 folded under the body
      '.............kOOOk',
      '.........kkk.kOOOk',
      '........kdbdkkrOk',
      '........kDdddddDk',
      '.........kkkkkkk'],
    [25, // 6 swinging forward, knee leading
      '.............kOOOk',
      '..............kOOOk',
      '...............krOOk',
      '...............kdddk',
      '...............kdbddk',
      '................kkkk'],
    [24, // 7 reaching forward for the next step
      '.............kOOOk',
      '..............kOOOOk',
      '...............krOOOk',
      '................kkkdddkkk',
      '...................kdddbdk',
      '....................kDDDk',
      '.....................kkk'],
  ];
  // Arm swing: 0 = far back ... 4 = far forward.
  const ARM = [
    [21,
      '.............kyO',
      '.........kkkOyk',
      '........kdbdOk',
      '........kdddk',
      '.........kkk'],
    [21,
      '.............kyO',
      '............kOyk',
      '...........kkOOk',
      '..........kdbdk',
      '..........kdddk',
      '...........kkk'],
    [21,
      '.............kyOr',
      '.............kOyr',
      '.............kOOk',
      '.............kdbdk',
      '.............kdddk',
      '..............kkk'],
    [21,
      '.............kyOk',
      '..............kOyOk',
      '...............kkdbdk',
      '................kdddk',
      '.................kkk'],
    [20,
      '...................kkk',
      '.............kyOk.kdbdk',
      '..............kOyOOdddk',
      '...............kkkkkkk'],
  ];
  const ARM_SEQ = [0, 1, 2, 3, 4, 3, 2, 1];
  const FAR = { Y: 'y', y: 'O', O: 'r', r: 'o', b: 'd', d: 'D' };   // far-side limbs: one step darker
  const RUN_TORSO = [18,
    '............gggggggggggg',
    '............ThhTTTTttttg',
    '...........gtTTttTTTtttg',
    '.............kyyOOcwwck',
    '............kOyOOcwwwck',
    '............kOOOrccwcsk',
    '...........krOOOOccsk',
    '...........krrOOOOsk',
    '............kkkkkkk',
  ];
  const RUN_TAIL = [
    [19,
      '.kkk',
      'kwwwkkk',
      'kwwcccckkk',
      '.kcccOOOOOkkk',
      '..kkOOyyyOOOO',
      '....kkOOOOOOO',
      '......kkrrrOO',
      '........kkkkk'],
    [20,
      '...kkkkk',
      '.kkccOOOkkk',
      'kwwcccOOOOOkk',
      'kwwwcOyyyOOOO',
      '.kkkkOOOOOOOO',
      '.....kkrrrrOO',
      '.......kkkkkk'],
    [22,
      '......kkkkkkk',
      '...kkkOOyyyOO',
      '.kkccOOOOOOOO',
      'kwwccccOOOrrO',
      'kwwwcckkkkkkk',
      '.kkkkk'],
    [21,
      '.kk',
      'kwwkk....kkkk',
      'kwwcckkkkyyOO',
      '.kcccOOOyOOOO',
      '..kkcOOOOOOrO',
      '....kkkrrrrkk',
      '.......kkkk'],
  ];
  const RUN_RIBBON = [
    [17,
      '..ggg....gg',
      '.gTTTggggTTg',
      '..ggtTTTTtt',
      '....ggggggg'],
    [17,
      '.....ggggg',
      '..gggTTTTTg',
      '.gTTTttggt',
      '..gggg...g'],
    [18,
      '........ggg',
      '..ggggggTTT',
      '.gtTTTTTtgg',
      '..ggggggg'],
    [17,
      '..gg',
      '.gTTggggggg',
      '..gtTTTTTTt',
      '...gggggggg'],
  ];
  const BOB = [0, 1, 0, -1];
  const run = [];
  for (let i = 0; i < 8; i++) {
    const b = BOB[i % 4], j = (i + 4) % 8;
    run.push(frame(
      [RUN_TAIL[i % 4], 0, b], [RUN_RIBBON[i % 4], 0, b],
      [ARM[ARM_SEQ[j]], 3, b, FAR], [LEG[j], 1, 0, FAR],
      [RUN_TORSO, 0, b], [LEG[i]], [HEAD, 2, 1 + b], [ARM[ARM_SEQ[i]], 0, b]));
  }

  // ---------------------------------------------------------------- HEAD variants
  // Expressions are patches of the master head (canvas rows of the unshifted head).
  const MOUTH_OPEN = {                    // lower jaw dropped, tongue showing
    16: '......kkwwccccccccccccKqqk',
    17: '.......kkkk.......cssccpk',
    18: '..................kkkkkk',
  };
  const EYES_UP = {                       // pupils high: looking where he jumps
    11: '........kyyyOKwwwKKOwKKrk',
    13: '........kOOOOKwwwwKOwwKwcckk',
  };
  const EYES_WIDE = {                     // small pupils, lots of white: looking down, alarmed
    10: '........kyyyyOKwwwKOKwKrk',
    11: '........kyyyOKwwwwKOwwKrk',
    12: '........kyyOOKwwwKKOwKKOOk',
    13: '........kOOOOKwwwKKOwKKwcckk',
  };
  const HEAD_JUMP = patch(HEAD, Object.assign({ 15: '.....kwwccrrOccKKKcccKcccck' }, EYES_UP, MOUTH_OPEN));
  const HEAD_FALL = patch(HEAD, Object.assign({}, EYES_WIDE, MOUTH_OPEN, { 16: '......kkwwccccccccccccKook', 17: '.......kkkk.......cssccck' }));
  // Ears swept flat along the skull (rising jump): replaces head rows 3..9.
  const sweep = head => [3,
    '.............kk',
    '.....kkk....kDDk',
    '....kDDdkkk.kDdrk',
    '....kDdOOOOkkkdrrkk',
    '.....kkOOqqqOOkkrrOkkkk',
    '.......kkOOqqpOYyyOOOOrk',
    '.........kyYYyOKKKOOKKrk',
  ].concat(head.slice(10));
  const HEAD_SWEPT = sweep(HEAD_JUMP);
  const FARLEG = { Y: 'y', y: 'O', O: 'r', r: 'o', b: 'd' };          // far leg: darker fur, boot one step darker

  // ---------------------------------------------------------------- JUMP (0 = fast rise, 1 = near the apex)
  const J0_TAIL = [19,
    '.........kkk',
    '........kOOOk',
    '.......kOyOOOk',
    '......kOyyOOOk',
    '.....kOyyOOOOk',
    '....kOyyOOOOrk',
    '...kOyyOOOOrrk',
    '...kOyOOOOrrk',
    '..kcOOOOOrrk',
    '..kccOOOrrk',
    '..kwccccsk',
    '...kwwcsk',
    '....kkkk',
  ];
  const J0_RIBBON = [15,
    '.........ggg',
    '........gTTtg',
    '.......gTTtg',
    '......gtTtg',
    '.....ghTtg',
    '.....gTtg',
    '....gTtg',
    '....ggg',
  ];
  const J0_TORSO = [14,
    '............gggggggggggg',
    '............ThhTTTTttttg',
    '...........gtTTttTTTtttg',
    '.............kyyOOcwwck',
    '.............kOyOOcwwwck',
    '............kOrrrrsscwck',
    '............kOOOOrccwcsk',
    '...........kOOOOOrcccsk',
    '...........krOOOOOrcsk',
    '...........krrOOOOOkk',
    '............kkkkkkk',
  ];
  const TUCK_LEG = [22,
    '.................kOOOOkk',
    '.................kOyOOOOk',
    '................kkrOOOOOk',
    '...............kddkrrOOk',
    '...............kdbdkkkk',
    '...............kddbbdk',
    '................kDdbbdk',
    '.................kDDDDk',
    '..................kkkk',
  ];
  const J0_LEG_FAR = [23,
    '...........kOOk',
    '..........kOOOk',
    '..........kOOOk',
    '.........kOOOk',
    '.........kdddk',
    '........kdbddk',
    '........kdbbdk',
    '........kDDDk',
    '.........kkk',
  ];
  const J0_ARM = [15,
    '.......................kkk',
    '......................kbbdk',
    '..............yyyOOOOOkdddk',
    '..............OOOOOOrrokkk',
  ];
  const jump0 = frame([J0_TAIL], [J0_RIBBON], [J0_LEG_FAR, 0, 0, FARLEG], [J0_TORSO], [TUCK_LEG], [HEAD_SWEPT, 2, -3], [J0_ARM]);

  const J1_TAIL = [18,
    '....kkkkk',
    '..kkOyyyOkk',
    '.kOyyyOOOOOkk',
    'kcOyOOOOOOOOO',
    'kccOOOOOOOrrr',
    'kwccOOOrrrrkk',
    'kwwccrrkkkk',
    '.kwwcskk',
    '..kkkk',
  ];
  const J1_RIBBON = [15,
    '....ggg',
    '...gTTTggggg',
    '..gtTtTTTTTt',
    '...ggggtttg',
    '.......ggg',
  ];
  const J1_TORSO = [15,
    '...........gggggggggggg',
    '...........ThhTTTTttttg',
    '..........gtTTttTTTtttg',
    '............kyyOOcwwck',
    '............kOyOOcwwwck',
    '...........kOOOOrccwwck',
    '...........kOOOOOrcccsk',
    '...........krOOOOOrcsk',
    '............krrOOOOkk',
    '.............kkkkkk',
  ];
  const J1_LEG_FAR = [23,
    '...........kOOk',
    '..........kOOOk',
    '.......kkkOOOk',
    '......kdddOOk',
    '......kdbbdkk',
    '......kDDDk',
    '.......kkk',
  ];
  const J1_ARM = [18,
    '.............yyO',
    '.............OOOo',
    '..............oOOo',
    '..............okbbdk',
    '...............kdddk',
    '................kkk',
  ];
  const jump1 = frame([J1_TAIL], [J1_RIBBON], [J1_LEG_FAR, 0, 0, FARLEG], [J1_TORSO], [TUCK_LEG, -1, 0], [HEAD_SWEPT, 1, -2], [J1_ARM]);

  // ---------------------------------------------------------------- FALL (0 = just past the apex, 1 = fast fall)
  const F0_TAIL = [12,
    '..kk',
    '.kwwk',
    '.kwwck',
    'kwwcck',
    'kwcccOk',
    'kccOOOk',
    'kcOyOOOk',
    'kOyyOOOOk',
    'kOyyOOOOOkk',
    '.kOyOOOOOOOkk',
    '.kOOOOOOOOOOO',
    '..krOOOOOOOrr',
    '...kkrrrrrrkk',
    '.....kkkkkk',
  ];
  const F0_RIBBON = [13,
    '....gg',
    '...gTTg',
    '....gTtg',
    '.....gTTgg',
    '......gtTTgg',
    '.......ggtTT',
    '.........ggg',
  ];
  const F0_TORSO = [17,
    '...........gggggggggggg',
    '...........ThhTTTTttttg',
    '..........gtTTttTTTtttg',
    '............kyyOOcwwck',
    '............kOyOOcwwwck',
    '............kOrrrsscwcsk',
    '............krOOOrcccsk',
    '.............krrOOOOkk',
    '..............kkkkkk',
  ];
  const F0_LEG_NEAR = [24,
    '.................kOOOk',
    '.................kOOOOk',
    '..................kOOOOk',
    '...................kdddk',
    '...................kdbbdkk',
    '....................kdbbddk',
    '.....................kDDDDk',
    '......................kkkk',
  ];
  const F0_LEG_FAR = [24,
    '...........kOOOk',
    '..........kOOOOk',
    '.......kkkkOOOk',
    '......kddddOOk',
    '......kdbbdkkk',
    '......kDDDk',
    '.......kkk',
  ];
  const F_ARM_BACK = [17,                // near arm thrown up and back
    '........kkk',
    '.......kbbdk',
    '.......kdddk',
    '........kkOOyy',
    '..........kOOOO',
    '...........kkk',
  ];
  const F_ARM_FRONT = [16,               // far arm up in front, paw beside the chin
    '.......................kkk',
    '......................kbbdk',
    '......................kdddk',
    '......................kOOk',
    '....................kkOOOk',
    '....................kOOOkk',
    '.....................kkk',
  ];
  const fall0 = frame([F0_TAIL], [F0_RIBBON], [F_ARM_FRONT, 0, 0, FAR], [F0_LEG_FAR, 0, 0, FARLEG], [F0_TORSO], [F0_LEG_NEAR], [HEAD_FALL, 1, 0], [F_ARM_BACK]);

  const F1_TAIL = [4,
    '..kk',
    '.kwwk',
    '.kwwwk',
    'kwwwck',
    'kwwcck',
    'kwcccOk',
    'kccOOOk',
    'kcOyOOk',
    'kOyyOOOk',
    'kOyyOOOk',
    'kOyyOOOk',
    'kOyyOOOrk',
    'kOyyOOOrk',
    '.kOyOOOrk',
    '.kOyOOOOrk',
    '.kOOyOOOrk',
    '..kOOOOOOrk',
    '..kOOOOOOrrk',
    '...kOOOOOOrkk',
    '...krOOOOOOrrk',
    '....krrOOOOOrr',
    '.....kkrrrrrrr',
    '.......kkkkkk',
  ];
  const F1_RIBBON = [12,
    '..gg',
    '.gTTg',
    '..gTtg',
    '...gTtg',
    '....gTTg',
    '.....gtTg',
    '......gTTgg',
    '.......gtTTg',
    '........ggtT',
    '..........gg',
  ];
  const F1_TORSO = [19,
    '...........gggggggggggg',
    '...........ThhTTTTttttg',
    '..........gtTTttTTTtttg',
    '............kyyOOcwwwck',
    '...........kOOrrrrsscwsk',
    '...........krOOOOrcccssk',
    '............krrOOOrssk',
    '.............kkkkkkkk',
  ];
  const F1_LEG_NEAR = [24,
    '.................kOOOk',
    '.................kOOOOkk',
    '..................kkOOOOk',
    '....................kdddk',
    '....................kdbddk',
    '.....................kdbbdk',
    '......................kDDDk',
    '.......................kkk',
  ];
  const F1_LEG_FAR = [24,
    '...........kOOOk',
    '.........kkOOOOk',
    '........kOOOOkk',
    '........kdddk',
    '.......kddbdk',
    '......kdbbdk',
    '......kDDDk',
    '.......kkk',
  ];
  const fall1 = frame([F1_TAIL], [F1_RIBBON], [F_ARM_FRONT, 0, 2, FAR], [F1_LEG_FAR, 0, 0, FARLEG], [F1_TORSO], [F1_LEG_NEAR], [HEAD_FALL, 1, 2], [F_ARM_BACK, 0, 2]);

  const m = idle[0];
  return {
    idle, run,
    jump: [jump0, jump1], fall: [fall0, fall1], skid: [m], hurt: [m], duck: [m],
    win: [m, m], icon: G.copy(m, 16, 16, -8, -3),
  };
});
