// SUNFOX — enemies of Emerald Coast. All frames 24x24, facing LEFT, bottom-aligned.
//   walker  "Tuskit"    — plum-purple boar piglet, stompable        {walk[4], squash[1]}
//   spiker  "Thornback" — crimson dome shell bristling with thorns  {walk[4]}
//   flyer   "Needlewing"— chubby coral hummingbird, ivory needle    {fly[4]}
// Hand-pixelled stamps (outlines baked in), layered at integer offsets per frame.
// Every frame keeps >= 1px transparent margin on the left, right and top.
G.defineArt('enemies', G => {
  'use strict';
  const P = G.PAL;
  const PU = P.purple, RD = P.red, GO = P.gold, ST = P.stone, PK = P.pink;

  const px = (rows, pal) => G.px(rows, pal);
  // Layer stamps [canvas, x, y] back-to-front on a 24x24 frame.
  function frame(parts) {
    const c = G.cv(24, 24);
    for (const [s, x, y] of parts) c.ctx.drawImage(s, x, y);
    return c;
  }

  // ------------------------------------------------------------------ WALKER
  const WP = {
    k: P.ink, D: PU[0], d: '#431c6e', p: PU[1], m: PU[2], l: PU[3], h: '#f4d8ff',
    r: '#7458c0', w: P.white, g: '#c4b8e4',
    T: PK[2], S: PK[1], s: PK[0], R: RD[1],
    o: GO[0], y: GO[1], Y: GO[2], i: GO[3],
  };
  // far-side legs: same stamps, one ramp step darker
  const WF = Object.assign({}, WP, { m: PU[1], p: '#431c6e', Y: GO[1], y: GO[0] });

  const wBody = px([
    '.......DDDDDDD.....',
    '.....DDllllmmmDD...',
    '....DlhhhllmmmmmD..',
    '...Dlhhllllmmmmmmk.',
    '..Dlllllmmmmmmmmmpk',
    '..Dlllmmmmmmmmmmmpk',
    'kkkllmmmmmmmmmmmppk',
    'kTTSmmmmmmmmmmmmppk',
    'kTkSwmmmmmmmmmmpppk',
    'kSSswgmmmmmmmmppddk',
    '.kkkkkmmmmmppppdddk',
    '...kmppppppddddddk.',
    '....kkdddrrrrrrkk..',
    '......kkkkkkkkk....',
  ], WP);
  // eye: angled brow, 2-tone pupil, catchlight
  const wEye = px([
    '..kkkk',
    'kkwwwp',
    'kgwkwp',
    'kgkpwp',
    '.kkkk.',
  ], WP);
  const wEyeSquint = px([
    '..llll',
    '..kkkk',
    'kkkkwp',
    'kgkpwp',
    '.kkkk.',
  ], WP);
  const wEarA = px([
    '.kk....',
    'klmk...',
    'klSmk..',
    '.kmSmk.',
    '..kmmpk',
  ], WP);
  const wEarB = px([
    '.kkk...',
    'klmmk..',
    '.klSmk.',
    '..kmmpk',
  ], WP);
  const LEG = [
    'kmpk',
    'kmpk',
    'kmpk',
    'kmpk',
    'kYyk',
    'kyok',
    'kkkk',
  ];
  const LEGF = [
    '.kmpk',
    '.kmpk',
    '.kmpk',
    'kmmpk',
    'kYyk.',
    'kyok.',
    'kkkk.',
  ];
  const LEGB = [
    'kmpk.',
    'kmpk.',
    'kmpk.',
    'kmppk',
    '.kYyk',
    '.kyok',
    '.kkkk',
  ];
  const LEGU = [
    'kmpk',
    'kmpk',
    'kYyk',
    'kyok',
    'kkkk',
  ];
  const wl = { n: px(LEG, WP), f: px(LEGF, WP), b: px(LEGB, WP), u: px(LEGU, WP) };
  const wf = { n: px(LEG, WF), f: px(LEGF, WF), b: px(LEGB, WF), u: px(LEGU, WF) };
  const wTailA = px([
    '.kk.',
    'kmlk',
    'kpmk',
    '.kk.',
  ], WP);
  const wTailB = px([
    '..kk',
    '.klk',
    'kmpk',
    'kkk.',
  ], WP);
  // by = body top. Contact frames drop the body 1px; ears and tail lag behind.
  const walk = [
    frame([[wf.b, 8, 17], [wf.f, 13, 17], [wl.f, 3, 17], [wl.b, 15, 17],
      [wTailB, 19, 9], [wBody, 1, 7], [wEye, 4, 10], [wEarA, 8, 4]]),
    frame([[wf.u, 7, 17], [wf.n, 16, 17], [wl.n, 5, 17], [wl.u, 14, 17],
      [wTailA, 19, 9], [wBody, 1, 6], [wEye, 4, 9], [wEarB, 8, 4]]),
    frame([[wf.f, 5, 17], [wf.b, 16, 17], [wl.b, 6, 17], [wl.f, 12, 17],
      [wTailB, 19, 9], [wBody, 1, 7], [wEyeSquint, 4, 10], [wEarA, 8, 4]]),
    frame([[wf.n, 7, 17], [wf.u, 16, 17], [wl.u, 5, 17], [wl.n, 14, 17],
      [wTailA, 19, 9], [wBody, 1, 6], [wEye, 4, 9], [wEarB, 8, 4]]),
  ];
  const wFlat = px([
    '......kkkkk...........',
    '....kkkSSmmkkkkkkk....',
    '..kklkhhlkmmmmmmmmkk..',
    'kkklllklkmmmmmmmmppkkk',
    'kTTSlllkmmmmmmmmpppmlk',
    'kTkSllklkmmmmmppppddkk',
    'kSSslkmmmkppppppdddrk.',
    '.kkkRRkkrrrrrrrrrrkk..',
    '...kkkk.kkkkkkkkkk....',
  ], WP);
  const wHoofL = px([
    'kkkkk',
    'kyYmk',
    'kkkkk',
  ], WP);
  const wHoofR = px([
    'kkkkk',
    'kmYyk',
    'kkkkk',
  ], WP);
  const squash = frame([[wFlat, 1, 13], [wHoofL, 6, 21], [wHoofR, 16, 21]]);

  // ------------------------------------------------------------------ SPIKER
  const SP = {
    k: P.ink, a: RD[0], b: RD[1], c: RD[2], e: RD[3], f: '#ffd0b0',
    w: P.white, s: ST[3], t: ST[2], o: ST[1],
    Y: P.orange[4], y: P.orange[3], z: P.orange[2],
    d: PU[0], D: '#431c6e', p: PU[1], m: PU[2], l: PU[3], h: '#f4d8ff',
  };
  const SF = Object.assign({}, SP, { m: PU[1], p: '#431c6e', w: ST[3] });
  // dome shell + radial thorns, authored on the full 24-wide grid (rows y0..y20)
  const sShell = px([
    '........................',
    '.............k..........',
    '............kwk.........',
    '....kk......kwk......kk.',
    '....kwk....kwwsk....ksk.',
    '....kwwk...kwwsk...kwtk.',
    '.....kwwk.kwwwstk.kwtk..',
    '.....kswwkkwwwstkkwstk..',
    '......kswwkwwsstkwstk...',
    '......ksswksssttkwstk...',
    '.......kceebbbbbcbak....',
    '......keeffeeeccccbbk...',
    '.....keefffeecccccbbak..',
    '.....keeffeeccccccbbak..',
    '.....keeeeecccccccbbak..',
    '.....kceeeccccccccbbak..',
    '.....kbccccccccbbbbaak..',
    '.....kYYYkYYykYyykyyzk..',
    '.....kYYykYyykyyzkyzzk..',
    '......kkk.kkk.kkk.kkk...',
  ], SP);
  const HEAD = [
    '..kkkkk.',
    '.klhllmk',
    'klpppmpk',
    'kkkkkmpk',
    'klwkwppk',
    'klwwwppk',
    'kkkkmppk',
    '.kwmppk.',
    '..kkkk..',
  ];
  const sHead = px(HEAD, SP);
  const HEADB = HEAD.slice();
  HEADB[3] = 'klpppmpk'; HEADB[4] = 'kkkkkppk'; HEADB[5] = 'klwkwppk';
  const sHeadLow = px(HEADB, SP); // lid sagging even lower
  const SLEG = [
    '.kmpk',
    '.kmpk',
    'kmmpk',
    'klmpk',
    'kkkkk',
  ];
  const sLeg = px(SLEG, SP), sLegFar = px(SLEG, SF);
  const sTail = px([
    'kk.',
    'kmk',
    'kpk',
    '.kk',
  ], SP);
  const swalk = [
    frame([[sTail, 20, 17], [sLegFar, 14, 19], [sLegFar, 11, 19], [sLeg, 7, 19], [sLeg, 18, 19], [sShell, 0, 1], [sHead, 1, 14]]),
    frame([[sTail, 20, 16], [sLegFar, 12, 17], [sLegFar, 15, 19], [sLeg, 9, 19], [sLeg, 16, 17], [sShell, 0, 0], [sHead, 1, 13]]),
    frame([[sTail, 20, 17], [sLegFar, 9, 19], [sLegFar, 17, 19], [sLeg, 11, 19], [sLeg, 14, 19], [sShell, 0, 1], [sHeadLow, 1, 14]]),
    frame([[sTail, 20, 16], [sLegFar, 12, 19], [sLegFar, 15, 17], [sLeg, 9, 17], [sLeg, 16, 19], [sShell, 0, 0], [sHead, 1, 13]]),
  ];

  // ------------------------------------------------------------------- FLYER
  // Coral-magenta so it never melts into the blue sky / sea; wine outline.
  const FP = {
    k: '#3a0a2a', n: '#7a1650', B: '#b82460', b: '#e8446c', c: '#ff7a78', C: '#ffc0a0',
    w: '#fff4cc', s: '#ffd060', t: '#e89038',
    i: P.white, g: ST[3],
    W: P.white, K: P.ink,
    y: GO[1], Y: GO[2],
  };
  const fBody = px([
    '........kkkkk........',
    '......kkcccbbkk......',
    '.....kcCCcbbbbbk.....',
    '.....kcCckkbbbbbk....',
    '....kkckkKWkbbbbBk...',
    '..kkiicWKKWkbbbbBBk..',
    'kkiiggckkkbbbbbbBBk..',
    '.kkkkkkYYcbbbbbBBBnk.',
    '......kyYwwbbbBBBBnk.',
    '.......kwwwwbbBBBnnk.',
    '.......kwwwwsBBBnnnk.',
    '........kwwssBBnnnk..',
    '.........kkssttnnk...',
    '...........kkkkkk....',
  ], FP);
  const fTail = px([
    'kkk...',
    'kBBkk.',
    '.kBBBk',
    '.kBnk.',
    '..kBnk',
    '...kk.',
  ], FP);
  const fWU = px([
    '.....kkk.',
    '....kcBnk',
    '...kcbBnk',
    '...kcbBkk',
    '..kcbbBnk',
    '..kcbBBk.',
    '.kcbbBnk.',
    '.kcbBBk..',
    'kcbbBnk..',
    'kbbBBk...',
  ], FP);
  const fWUf = px([
    '..kk..',
    '.kBnk.',
    '.kBnk.',
    'kBBnk.',
    'kBBnnk',
    'kBBnnk',
    'kBBBnk',
    '.kBBnk',
    '.kBBk.',
  ], FP);
  const fWM = px([
    '...kkkkkk.',
    '.kkcccbBnk',
    'kcbbbBBnnk',
    '.kkBBnnkk.',
    '...kkkk...',
  ], FP);
  const fWM2 = px([
    '.kkkk.....',
    'kccccckkk.',
    'kcbbbbBBnk',
    '.kkBBBnnk.',
    '...kkkkk..',
  ], FP);
  const fWD = px([
    'kkkk....',
    'kcbBk...',
    'kcbbBk..',
    '.kcbBBk.',
    '.kcbbBnk',
    '..kcbBnk',
    '..kcbBnk',
    '...kcBnk',
    '...kcBkk',
    '....kBk.',
    '....kkk.',
  ], FP);
  const fly = [
    frame([[fWUf, 12, 2], [fTail, 17, 15], [fBody, 1, 6], [fWU, 13, 2]]),
    frame([[fTail, 17, 14], [fBody, 1, 5], [fWM, 13, 9]]),
    frame([[fTail, 17, 13], [fBody, 1, 4], [fWD, 14, 9]]),
    frame([[fTail, 17, 14], [fBody, 1, 5], [fWM2, 13, 10]]),
  ];

  return {
    walker: { walk: walk, squash: [squash] },
    spiker: { walk: swalk },
    flyer: { fly: fly },
  };
});
