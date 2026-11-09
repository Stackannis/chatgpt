// SUNFOX — enemies of Emerald Coast. All frames 24x24, facing LEFT, bottom-aligned.
//   walker  "Plumple"   — plum-purple grump, stompable            {walk[4], squash[1]}
//   spiker  "Thornback" — crimson shell bristling with ivory thorns {walk[4]}
//   flyer   "Needlewing"— chubby cobalt hummingbird, ivory needle  {fly[4]}
// Hand-pixelled stamps (outlines baked in), layered at integer offsets per frame.
G.defineArt('enemies', G => {
  'use strict';
  const P = G.PAL;
  const PU = P.purple, RD = P.red, BL = P.blue, GO = P.gold, ST = P.stone;

  const px = (rows, pal) => G.px(rows, pal);
  // Layer stamps [canvas, x, y] back-to-front on a 24x24 frame.
  function frame(parts) {
    const c = G.cv(24, 24);
    for (const [s, x, y] of parts) c.ctx.drawImage(s, x, y);
    return c;
  }

  // ------------------------------------------------------------------ WALKER
  const WP = {
    k: P.ink, d: PU[0], p: PU[1], m: PU[2], l: PU[3], h: '#f4d8ff',
    w: P.white, g: '#c4b8e4',
    o: GO[0], y: GO[1], Y: GO[2], i: GO[3], n: '#5a2a2a',
  };
  const wBodyLow = px([
    '.....dddddddd.....',
    '...ddhhllllmmdk...',
    '..dllhhlllllmmpk..',
    '.dkllmmmmkkmmmppk.',
    '.dwkmmmkkwmmmmppk.',
    'dlwwkkkwwwmmmmpppk',
    'dlkwwmkkwwmmmppppk',
    'dmkwwmkkwwmmppppdk',
    'dmmmmmmwwmmpppppdk',
    'dmmwmmmwmmpppppddk',
    'dmkkkkkkkppppppddk',
    '.kmmppppppppddddk.',
    '..kkkkkkkkkkkkkk..',
  ], WP);
  const wFoot = px([
    '..kkkk.',
    '.kiYYyk',
    'kiYYyok',
    'kkkkkkk',
  ], WP);
  const wFootFar = px([
    '..kkkk.',
    '.kYyyok',
    'kYyyook',
    'kkkkkkk',
  ], WP);
  const wTuft = px([
    '..kkk.',
    '.klmpk',
    '.kmkkk',
    '.kpk..',
  ], WP);
  const wk0 = frame([[wFootFar, 3, 20], [wBodyLow, 3, 9], [wTuft, 10, 5], [wFoot, 12, 20]]);

  // ------------------------------------------------------------------ SPIKER
  const SP = {
    k: P.ink, a: RD[0], b: RD[1], c: RD[2], e: RD[3], f: '#ffc8a8',
    w: P.white, s: ST[3], t: ST[2],
    d: PU[0], p: PU[1], m: PU[2], l: PU[3],
  };
  const sk0 = px([
    '........................',
    '........................',
    '..........k.....k.......',
    '.........kwk...kwk......',
    '.........kwk...kwk......',
    '........kwwsk.kwwsk.....',
    '...k....kwwsk.kwwsk...k.',
    '...kwk.kwwwsskwwwssk.kwk',
    '...kwwkkwwwsskwwwsskkwsk',
    '....kwsaeeeaabcccaaawsk.',
    '.....kaaeefeccccbbbaak..',
    '....keeeffeecccccbbbbak.',
    '....kceeeeeccccccbbbbak.',
    '.kkkkkceeecccccccbbbaak.',
    'kmmlmmkccccccccbbbbbaak.',
    'kllkkkkkccccccbbbbbaaak.',
    'kmwwkpdkbbbbbbbbbaaaaak.',
    'kmwkkpdkwwwwwwsssssttk..',
    '.kmmppdkkkkkkkkkkkkkk...',
    '..kkpppk.....kpppk......',
    '...kkmmk.....kmmpk......',
    '..kwmmpk....kwmmpk......',
    '..kkkkkk....kkkkkk......',
    '........................',
  ], SP);

  // ------------------------------------------------------------------- FLYER
  const FP = {
    k: P.ink, n: BL[0], B: BL[1], b: BL[2], c: BL[3], C: BL[4],
    w: P.white, s: ST[3], t: ST[2],
    r: RD[1], R: RD[2], q: RD[3],
    y: GO[1], Y: GO[2],
  };
  const fl0 = px([
    '........................',
    '................kkk.....',
    '...............kbcBk....',
    '..............kbcbBk....',
    '.............kbcbBBk....',
    '........kkkkkbcbBBk.....',
    '......kkccbbkcbBBk......',
    '.....kcCcbbbbkBBkk......',
    '.....kcckkbbbbkkBBk.....',
    '.kkkkkbwwkbbbbbBBBk.....',
    'kwwwsskwkkbbbbbBBBBk....',
    '.kkkkkRRbbbbbbbBBBBk....',
    '.....kRRqwbbbbbBBBnk....',
    '......kwwwwbbbBBBnnkk...',
    '......kwwwwwsBBBnnkBBk..',
    '.......kwwwssBBnkkkBBBk.',
    '........kksssnnk..kkBBk.',
    '.........ykkkk......kkk.',
    '.........yy.............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ], FP);

  return {
    walker: { walk: [wk0, wk0, wk0, wk0], squash: [wk0] },
    spiker: { walk: [sk0, sk0, sk0, sk0] },
    flyer: { fly: [fl0, fl0, fl0, fl0] },
  };
});
