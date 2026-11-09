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
    '............DDDDD.......',
    '.......DDDDDmlllmkk.....',
    '......Dlhhlmmpmmllmk....',
    '.....Dlllkkmmmmmmmmpk...',
    '....Dllkkwwpmmmmmmmpk...',
    '.kkklkkwwwwpmmmmmmmppk..',
    'kTTSlllkkwwpmmmmmmppdk..',
    'kTkSmllkkwpmmmmmmpppdk..',
    'kSSSmwmpppmmmmmmpppddk..',
    'ksSspwmmmmmmmmpppppddk..',
    '.kkkkkwkmmmmppppppddk...',
    '.....kmmmppppppppdddk...',
    '......kpppppppdddddk....',
    '.......kkkkkdddddkk.....',
    '............kkkkk.......',
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
  const wLeg = px([
    'kmmpk',
    'kmmpk',
    'kiYyk',
    'kYyok',
    'kkkkk',
  ], WP);
  const wLegFar = px([
    'kppdk',
    'kppdk',
    'kyyok',
    'kyook',
    'kkkkk',
  ], WP);
  const wTail = px([
    '.kk.',
    'kmlk',
    'kpmk',
    '.kk.',
  ], WP);
  const walk = [
    frame([[wLegFar, 7, 19], [wLegFar, 13, 19], [wTail, 20, 7], [wBody, 0, 6], [wEarA, 7, 3], [wLeg, 4, 19], [wLeg, 16, 19]]),
    frame([[wLegFar, 11, 19], [wTail, 20, 8], [wBody, 0, 5], [wEarB, 7, 3], [wLeg, 5, 19], [wLeg, 15, 18]]),
    frame([[wLegFar, 4, 19], [wLegFar, 16, 19], [wTail, 20, 7], [wBody, 0, 6], [wEarA, 7, 3], [wLeg, 7, 19], [wLeg, 13, 19]]),
    frame([[wLegFar, 9, 19], [wTail, 20, 8], [wBody, 0, 5], [wEarB, 7, 3], [wLeg, 5, 18], [wLeg, 15, 19]]),
  ];
  const wFlat = px([
    '.........kkkk...........',
    '......DDDklSmkDDDDDD....',
    '....DDllhlmmpllllmmmkk..',
    '.kkkllllkkmmmmmmmmmmppk.',
    'kTTSlllkmmmmmmmmmmpppdk.',
    'kTkSmwmmkkmmmmmmppppddk.',
    'ksSspwmmmpppppppppddddk.',
    '.kkkkkkkkkkkkkkkkkkkkk..',
  ], WP);
  const wHoofFlat = px([
    'kkkkk',
    'kiYyk',
    'kkkkk',
  ], WP);
  const squash = frame([[wTail, 19, 13], [wFlat, 0, 15], [wHoofFlat, 7, 21], [wHoofFlat, 15, 21]]);

  // ------------------------------------------------------------------ SPIKER
  const SP = {
    k: P.ink, a: RD[0], b: RD[1], c: RD[2], e: RD[3], f: '#ffc8a8',
    w: P.white, s: ST[3], t: ST[2], o: ST[1],
    d: PU[0], p: PU[1], m: PU[2], l: PU[3],
  };
  const sShell = px([
    '..............o.........',
    '.............owk........',
    '......o......owk......o.',
    '.....owk....owwsk....owk',
    '.....owwk...owwsk...owsk',
    '......owwk.owwwssk.owsk.',
    '......owwskowwwstkowwsk.',
    '.......owwskwwwstkwwsk..',
    '.......awsseccbaacwstk..',
    '......aeccbefeecccbaabk.',
    '.....aeeeeeffeecccccbbbk',
    '.....aeeeeffeeccccccbbak',
    '.....aceeffeecccccccbbak',
    '.....aceeeeeccccccbbbbak',
    '.....kcceeeccccccbbbbbak',
    '.....kwbccccccccbbbbbatk',
    '......kwwwwwwwwwwsssttk.',
    '.......kkkkkkkkkkkkkkk..',
  ], SP);
  const sHead = px([
    '...ddddd.',
    '..dlllmmk',
    '.dllmmkkk',
    'dllmkkwwk',
    'dlkkwwwwk',
    'kllmkkwwk',
    'kkkmkkwpk',
    '.kwmmmppk',
    '..kkkkkk.',
  ], SP);
  const sLeg = px([
    '.kmpk.',
    '.kmpk.',
    'kmmmpk',
    'kwmwpk',
    'kkkkkk',
  ], SP);
  const sLegFar = px([
    '.kpdk.',
    '.kpdk.',
    'kpppdk',
    'kspsdk',
    'kkkkkk',
  ], SP);
  const sTail = px([
    'kk.',
    'kmk',
    'kpk',
    '.kk',
  ], SP);
  const swalk = [
    frame([[sTail, 21, 16], [sLegFar, 11, 18], [sLeg, 17, 18], [sLeg, 7, 18], [sShell, 0, 1], [sHead, 0, 11]]),
    frame([[sTail, 21, 16], [sLeg, 16, 17], [sLeg, 8, 18], [sShell, 0, 0], [sHead, 0, 11]]),
    frame([[sTail, 21, 16], [sLegFar, 18, 18], [sLeg, 14, 18], [sLeg, 10, 18], [sShell, 0, 1], [sHead, 1, 11]]),
    frame([[sTail, 21, 16], [sLeg, 16, 18], [sLeg, 8, 17], [sShell, 0, 0], [sHead, 1, 10]]),
  ];

  // ------------------------------------------------------------------- FLYER
  const FP = {
    k: P.ink, n: BL[0], B: BL[1], b: BL[2], c: '#58a8f4', C: BL[4],
    w: P.white, s: ST[3], t: ST[2],
    r: RD[1], R: RD[2], q: RD[3],
    y: GO[1], Y: GO[2],
  };
  const fBody = px([
    '........kkkkk...........',
    '......kkbbbbbkk.........',
    '.....kbCCbkkbbbk........',
    '.....kbbkkwwbbbbk.......',
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
    'kBBkkk.',
    '.kBBBBk',
    '.kBnkk.',
    '..kBBk.',
    '...kBnk',
    '....kk.',
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
  const fWD = px([
    'kkkk....',
    'kcbBk...',
    'kcbbBk..',
    '.kcbBBk.',
    '.kcbbBnk',
    '..kcbBnk',
    '..kcbBkk',
    '...kcBnk',
    '...kkBnk',
    '.....kk.',
  ], FP);
  const fWDf = px([
    'kBBk.',
    '.kBnk',
    '..kk.',
  ], FP);
  const fly = [
    frame([[fWUf, 11, 0], [fTail, 17, 13], [fBody, 0, 5], [fWU, 13, 1]]),
    frame([[fTail, 17, 14], [fBody, 0, 4], [fWM, 13, 7]]),
    frame([[fWDf, 10, 15], [fTail, 17, 13], [fBody, 0, 3], [fWD, 12, 8]]),
    frame([[fTail, 17, 12], [fBody, 0, 4], [fWM, 13, 6]]),
  ];

  return {
    walker: { walk: walk, squash: [squash] },
    spiker: { walk: swalk },
    flyer: { fly: fly },
  };
});
