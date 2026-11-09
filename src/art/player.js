// SUNFOX — Kit the fox (player). WORK IN PROGRESS master pose.
G.defineArt('player', G => {
  'use strict';
  const P = G.PAL;
  const C = {
    k: P.ink,
    o: P.orange[0], r: P.orange[1], O: P.orange[2], y: P.orange[3], Y: P.orange[4],
    w: P.white, c: P.brown[5], s: P.brown[4], u: P.brown[3],
    D: P.brown[0], d: P.brown[1], b: P.brown[2],
    g: P.teal[0], t: P.teal[1], T: P.teal[2], h: P.teal[3],
    p: P.pink[1], q: P.pink[0],
    e: P.blue[2],
  };
  const F = rows => G.px(rows, C);

  const master = F([
    '................................',
    '............k...................',
    '...........kDk........k.........',
    '...........kDDk......kDk........',
    '..........kDddOk....kDdOk.......',
    '..........kOppOk....kOpOk.......',
    '..........kOpqpOk..kOpqOk.......',
    '..........kOOpqOOkkkOOqOOk......',
    '.........kyyyyOOOOOOOOOOOk......',
    '.........kyyyyyOOOOOOOOOOOk.....',
    '.........kyyyyOkkkkOkkkOOOk.....',
    '.........kyyOOkwwkkowkkOOOk.....',
    '.........kyOOOkwwkkowkkOOOOk....',
    '.........kOOOOkwwkkowkkccOOkk...',
    '........kcOOOOkwwkkcwkkccckkk...',
    '.......kwccOOOckwwkccwkcccck....',
    '........kwcccccckkccccccckkk....',
    '.........kwcccccccccckkkck......',
    '....kk..kgkssccccccccccck.......',
    '...kTTkkgTTtttttttttttkk........',
    '....kttTgtTTTTTTTTTTtk..........',
    '.kk..kkgkOOOOyOcccwwck..........',
    'kwwk....kOOOOyOdccwwck..........',
    'kwwck..kkOOOOOddcccck...........',
    'kwcccOkOOkOOOOddscck............',
    'kcccOOOOOOkOOOkkssck............',
    '.kcOOOOOOOkOOOOkOOOk............',
    '.kOOOOOOOOkOOOkkOOOk............',
    '..krOOOOOrkdddkkdddkk...........',
    '...kkrrrrkkddddbkdddbk..........',
    '.....kkkk.kDDDDDkDDDDk..........',
    '..........kkkkkkkkkkkk..........',
  ]);

  const idle = [master, master, master, master];
  return {
    idle, run: [master, master, master, master, master, master, master, master],
    jump: [master, master], fall: [master, master], skid: [master], hurt: [master], duck: [master],
    win: [master, master], icon: G.copy(master, 16, 16, -9, -3),
  };
});
