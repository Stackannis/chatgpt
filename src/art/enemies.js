// SUNFOX — enemies of Emerald Coast. All frames 24x24, facing LEFT, bottom-aligned.
//   walker  "Tuskit"    — plum-purple boar piglet, stompable        {walk[4], squash[1]}
//   spiker  "Thornback" — crimson shell bristling with ivory thorns {walk[4]}
//   flyer   "Needlewing"— chubby cobalt hummingbird, ivory needle   {fly[4]}
// Hand-pixelled stamps (outlines baked in), layered at integer offsets per frame.
G.defineArt('enemies', G => {
  'use strict';
  const P = G.PAL;
  const PU = P.purple, RD = P.red, BL = P.blue, GO = P.gold, ST = P.stone, PK = P.pink;

  const px = (rows, pal) => G.px(rows, pal);
  // Layer stamps [canvas, x, y] back-to-front on a 24x24 frame.
  function frame(parts) {
    const c = G.cv(24, 24);
    for (const [s, x, y] of parts) c.ctx.drawImage(s, x, y);
    return c;
  }

  // ------------------------------------------------------------------ WALKER
  const WP = {
    k: P.ink, D: PU[0], d: PU[0], p: PU[1], m: PU[2], l: PU[3], h: '#f4d8ff',
    w: P.white, g: '#c4b8e4',
    T: PK[2], S: PK[1], s: PK[0],
    o: GO[0], y: GO[1], Y: GO[2], i: GO[3],
  };
  const wBody = px([
    '..............kk........',
    '.............kmpk.......',
    '............kmSpk.......',
    '..........DDkmSpk.......',
    '........DDllkmmpkk......',
    '.......Dlhkkpmmmmpk.....',
    '......Dlkkwpllmmmmpk....',
    '.kkkkkkkwwwplllmmmppk...',
    'kTTSllmkkwwpmllmmmppdk..',
    'kTkSmlmkkwpmmmmmmpppdk..',
    'kSSSmwmppmmmmmmmpppddk..',
    'ksSspwmmmmmmmmppppdddk..',
    '.kkkkkwkmmmmmpppppddk...',
    '......kmmpppppppdddk....',
    '.......kppppddddddk.....',
    '........kkddddddkk......',
    '..........kkkkkk........',
  ], WP);
  const wLeg = px([
    'kmpk',
    'kmpk',
    'kYyk',
    'kyok',
    'kkkk',
  ], WP);
  const wLegFar = px([
    'kpdk',
    'kpdk',
    'kyok',
    'kook',
    'kkkk',
  ], WP);
  const wTail = px([
    '.d.',
    'd.d',
    '.dd',
  ], WP);
  const wk0 = frame([[wLegFar, 10, 19], [wLegFar, 17, 19], [wTail, 21, 10], [wBody, 0, 4], [wLeg, 6, 19], [wLeg, 14, 19]]);

  // ------------------------------------------------------------------ SPIKER
  const SP = {
    k: P.ink, a: RD[0], b: RD[1], c: RD[2], e: RD[3], f: '#ffc8a8',
    w: P.white, s: ST[3], t: ST[2],
    d: PU[0], p: PU[1], m: PU[2], l: PU[3],
  };
  const sShell = px([
    '.............k..........',
    '............kwk.........',
    '.....k......kwk......k..',
    '....kwk....kwwsk....kwk.',
    '....kwwk...kwwsk...kwsk.',
    '.....kwwk.kwwwssk.kwsk..',
    '.....kwwskkwwwsskkwwsk..',
    '......kwwskwwwsskwwsk...',
    '......kwwsebbbaacwssk...',
    '.....kebbaefeecccbaabk..',
    '....keeeeffeeecccccbbbk.',
    '....keeeffeeecccccbbbak.',
    '....kceffeeeccccccbbbak.',
    '....kceeeeecccccccbbbak.',
    '....kcceeccccccccbbbbak.',
    '....kwbccccccccbbbbbatk.',
    '.....kwwwwwwwwwwsssttk..',
    '......kkkkkkkkkkkkkkk...',
  ], SP);
  const sHead = px([
    '...kkkk..',
    '..klllmk.',
    '.kllmkkk.',
    'kllkkwwpk',
    'klmkkwwpk',
    'kmmkkwppk',
    'kkkmmmppk',
    '.kmmmppk.',
    '..kkkkk..',
  ], SP);
  const sLeg = px([
    '.kmpk.',
    '.kmpk.',
    'kmmmpk',
    'kwmwpk',
    'kkkkkk',
  ], SP);
  const sk0 = frame([[sLeg, 15, 18], [sLeg, 7, 18], [sShell, 0, 1], [sHead, 0, 10]]);

  // ------------------------------------------------------------------- FLYER
  const FP = {
    k: P.ink, n: BL[0], B: BL[1], b: BL[2], c: BL[3], C: BL[4],
    w: P.white, s: ST[3], t: ST[2],
    r: RD[1], R: RD[2], q: RD[3],
    y: GO[1], Y: GO[2],
  };
  const FPfar = Object.assign({}, FP, { c: BL[2], b: BL[1], B: BL[0], n: BL[0] });
  const fBody = px([
    '........kkkkk...........',
    '......kkccbbbkk.........',
    '.....kcCcckkbbbk........',
    '.....kcckkwwbbbbk.......',
    '....kkkkwwwwbbbbbk......',
    '..kkwwbbkkwwbbbbbBk.....',
    'kkwwssbbkkwbbbbbbBBk....',
    '.kkkkkkRRqbbbbbbBBBk....',
    '......krRwwbbbbbBBBnk...',
    '.......kwwwwwbbBBBBnk...',
    '.......kwwwwwsBBBBnnk...',
    '........kwwwssBBBnnk....',
    '.........kkssstnnnk.....',
    '...........kkkkkkk......',
  ], FP);
  const fTail = px([
    'kkk....',
    'kBBkk..',
    '.kBBBkk',
    '.knBBBk',
    '..kknBk',
    '....kkk',
  ], FP);
  const wingUp = [
    '......kkk.',
    '.....kcBnk',
    '....kcbBkk',
    '...kccbBnk',
    '...kcbbBkk',
    '..kccbBBnk',
    '..kcbbBBk.',
    '.kccbBBk..',
    '.kcbBBk...',
    'kcbBBk....',
    'kkkkk.....',
  ];
  const fWingUp = px(wingUp, FP), fWingUpFar = px(wingUp, FPfar);
  const fl0 = frame([[fWingUpFar, 10, 0], [fTail, 17, 13], [fBody, 0, 4], [fWingUp, 13, 1]]);

  return {
    walker: { walk: [wk0, wk0, wk0, wk0], squash: [wk0] },
    spiker: { walk: [sk0, sk0, sk0, sk0] },
    flyer: { fly: [fl0, fl0, fl0, fl0] },
  };
});
