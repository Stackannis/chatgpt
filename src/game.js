const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const V = { w: canvas.width, h: canvas.height, tile: 16 };
const G = 0.34;

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const levelRows = [
  '........................................................................................................................',
  '........................................................................................................................',
  '........................................................................................................................',
  '........................................................................................................................',
  '............................c......................?..............c.....................................................',
  '.....................===...............====............................====....................c........................',
  '.............c...........................................E...............................................====...........',
  '...........................E....................===.....................====............................................',
  '...............====....................................................................P................................',
  '..........................................................c.............................................................',
  '.................................................====.................................====...............................',
  '.................P..........................................................E............................................',
  '....====.............................................................................................c..................',
  '..................................====.................................................====..............................',
  '.............................E..........................................................................................',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
];

const LEVEL_H = levelRows.length;
const LEVEL_W = levelRows[0].length;

const solids = new Set(['G', '=', '?', 'P']);

function rgba(hex) {
  return '#' + hex;
}

const palette = {
  T: rgba('CE2A2A'), S: rgba('2A57D4'), F: rgba('FFD1A5'), H: rgba('6E3A19'), B: rgba('6E4C29'),
  N: rgba('000000'), W: rgba('FFFFFF'), C: rgba('FFD34D'), D: rgba('B06A31'),
};

const spriteDefs = {
  heroIdle: [
    '....TTTTTT....',
    '...TTTTTTTT...',
    '.....TTTT.....',
    '....FFFFFF....',
    '....HFFFF.....',
    '....HFFFF.....',
    '....HHHHH.....',
    '....TTTTT.....',
    '...SSTTTT.....',
    '...SSSSSS.....',
    '...SCSCSS.....',
    '..SS....SS....',
    '..BB....BB....',
  ],
  heroRun1: [
    '....TTTTTT....',
    '...TTTTTTTT...',
    '.....TTTT.....',
    '....FFFFFF....',
    '....HFFFF.....',
    '....HFFFF.....',
    '....HHHHH.....',
    '....TTTTT.....',
    '...SSTTTT.....',
    '...SSSSSS.....',
    '...SCSCSS.....',
    '..SS....S.....',
    '..B.....BB....',
  ],
  heroRun2: [
    '....TTTTTT....',
    '...TTTTTTTT...',
    '.....TTTT.....',
    '....FFFFFF....',
    '....HFFFF.....',
    '....HFFFF.....',
    '....HHHHH.....',
    '....TTTTT.....',
    '...SSTTTT.....',
    '...SSSSSS.....',
    '...SCSCSS.....',
    '...S....SS....',
    '..BB.....B....',
  ],
  heroJump: [
    '....TTTTTT....',
    '...TTTTTTTT...',
    '.....TTTT.....',
    '....FFFFFF....',
    '....HFFFF.....',
    '....HFFFF.....',
    '....HHHHH.....',
    '....TTTTT.....',
    '...SSTTTT..S..',
    '...SSSSSS.SS..',
    '...SCSCSSSS...',
    '..SS....SS....',
    '..B......B....',
  ],
  enemyA: [
    '..DDDDDDDD..',
    '.DDDDDDDDDD.',
    '.DWWDDDDWWD.',
    '.DNDDDDDDND.',
    '.DDDDDDDDDD.',
    '..BB....BB..',
  ],
  enemyB: [
    '..DDDDDDDD..',
    '.DDDDDDDDDD.',
    '.DDWWDDWWDD.',
    '.DDNDDDDNDD.',
    '.DDDDDDDDDD.',
    '..BB....BB..',
  ],
};

function drawSprite(name, x, y, scale = 1, flip = false) {
  const rows = spriteDefs[name];
  for (let py = 0; py < rows.length; py++) {
    const row = rows[py];
    for (let px = 0; px < row.length; px++) {
      const key = row[px];
      if (key === '.') continue;
      ctx.fillStyle = palette[key];
      const sx = flip ? (row.length - 1 - px) : px;
      ctx.fillRect(x + sx * scale, y + py * scale, scale, scale);
    }
  }
}

const player = {
  x: 24,
  y: 0,
  w: 14,
  h: 20,
  vx: 0,
  vy: 0,
  grounded: false,
  facing: 1,
  anim: 0,
  coins: 0,
};

const entities = { coins: [], enemies: [] };
let flagX = 0;
for (let y = 0; y < LEVEL_H; y++) {
  for (let x = 0; x < LEVEL_W; x++) {
    const c = levelRows[y][x];
    if (c === 'c') entities.coins.push({ x: x * V.tile + 2, y: y * V.tile + 2, t: Math.random() * 6.28, taken: false });
    if (c === 'E') entities.enemies.push({ x: x * V.tile + 1, y: y * V.tile + 5, w: 14, h: 11, vx: Math.random() > .5 ? 0.7 : -0.7, alive: true, t: Math.random() * 6.28 });
    if (c === 'P') flagX = Math.max(flagX, x * V.tile);
  }
}

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= LEVEL_W || ty >= LEVEL_H) return 'G';
  return levelRows[ty][tx];
}

function solidAt(px, py) {
  return solids.has(tileAt(Math.floor(px / V.tile), Math.floor(py / V.tile)));
}

function resolveHorizontal(e) {
  const nx = e.x + e.vx;
  const left = e.vx < 0;
  const edge = left ? nx : nx + e.w;
  const tx = Math.floor(edge / V.tile);
  const y0 = Math.floor((e.y + 1) / V.tile);
  const y1 = Math.floor((e.y + e.h - 1) / V.tile);

  for (let ty = y0; ty <= y1; ty++) {
    if (solids.has(tileAt(tx, ty))) {
      e.x = left ? (tx + 1) * V.tile : tx * V.tile - e.w - 0.01;
      e.vx = 0;
      return;
    }
  }
  e.x = nx;
}

function resolveVertical(e) {
  const ny = e.y + e.vy;
  const up = e.vy < 0;
  const edge = up ? ny : ny + e.h;
  const ty = Math.floor(edge / V.tile);
  const x0 = Math.floor((e.x + 1) / V.tile);
  const x1 = Math.floor((e.x + e.w - 1) / V.tile);
  e.grounded = false;

  for (let tx = x0; tx <= x1; tx++) {
    if (solids.has(tileAt(tx, ty))) {
      if (up) {
        e.y = (ty + 1) * V.tile;
      } else {
        e.y = ty * V.tile - e.h - 0.01;
        e.grounded = true;
      }
      e.vy = 0;
      return;
    }
  }
  e.y = ny;
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let won = false;
let gameOver = false;

function update() {
  if (won || gameOver) {
    if (keys.has('r')) location.reload();
    return;
  }

  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  const jump = keys.has(' ') || keys.has('w') || keys.has('arrowup');

  if (left) { player.vx -= 0.25; player.facing = -1; }
  if (right) { player.vx += 0.25; player.facing = 1; }
  if (!left && !right) player.vx *= 0.82;
  player.vx = Math.max(-2.2, Math.min(2.2, player.vx));

  if (jump && player.grounded) {
    player.vy = -6.15;
    player.grounded = false;
  }

  player.vy += G;
  if (player.vy > 8) player.vy = 8;

  resolveHorizontal(player);
  resolveVertical(player);

  if (player.y > LEVEL_H * V.tile + 60) gameOver = true;

  for (const coin of entities.coins) {
    if (coin.taken) continue;
    coin.t += 0.12;
    const cbox = { x: coin.x, y: coin.y, w: 10, h: 12 };
    if (aabb(player, cbox)) {
      coin.taken = true;
      player.coins += 1;
    }
  }

  for (const en of entities.enemies) {
    if (!en.alive) continue;
    en.x += en.vx;
    const frontX = en.vx > 0 ? en.x + en.w + 1 : en.x - 1;
    const footY = en.y + en.h + 1;
    const wallY = en.y + en.h / 2;
    if (solidAt(frontX, wallY) || !solidAt(frontX, footY)) en.vx *= -1;

    if (aabb(player, en)) {
      if (player.vy > 0 && player.y + player.h - 4 < en.y) {
        en.alive = false;
        player.vy = -4.4;
      } else {
        gameOver = true;
      }
    }
  }

  if (player.x >= flagX + 8) won = true;
  player.anim += Math.abs(player.vx) * 0.2;
}

function drawTile(ch, x, y) {
  if (ch === 'G') {
    ctx.fillStyle = '#8f5e3a';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#79c851';
    ctx.fillRect(x, y, 16, 4);
    ctx.fillStyle = '#6d452c';
    for (let i = 0; i < 16; i += 4) ctx.fillRect(x + i, y + 6, 1, 9);
  } else if (ch === '=') {
    ctx.fillStyle = '#c57b45';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#8d512e';
    for (let i = 0; i <= 16; i += 4) ctx.fillRect(x + i, y, 1, 16);
    for (let j = 0; j <= 16; j += 4) ctx.fillRect(x, y + j, 16, 1);
  } else if (ch === '?') {
    ctx.fillStyle = '#ffd14c';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#c2912b';
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = '#7b4e18';
    ctx.fillRect(x + 7, y + 4, 2, 6);
    ctx.fillRect(x + 6, y + 10, 4, 2);
  } else if (ch === 'P') {
    ctx.fillStyle = '#2cb562';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#3cd078';
    ctx.fillRect(x, y, 16, 4);
    ctx.fillStyle = '#206f3f';
    ctx.fillRect(x + 12, y, 2, 16);
  }
}

function draw() {
  const camX = Math.max(0, Math.min(player.x - V.w / 3, LEVEL_W * V.tile - V.w));

  // sky + parallax
  ctx.fillStyle = '#69b9ff';
  ctx.fillRect(0, 0, V.w, V.h);
  ctx.fillStyle = '#c7ecff';
  for (let i = 0; i < 8; i++) {
    const x = ((i * 92 - camX * 0.25) % (V.w + 80)) - 40;
    const y = 28 + (i % 3) * 14;
    ctx.fillRect(x, y, 22, 10);
    ctx.fillRect(x + 6, y - 4, 24, 12);
  }
  ctx.fillStyle = '#7dd37a';
  for (let i = -1; i < 10; i++) {
    const x = i * 80 - (camX * 0.5 % 80);
    ctx.beginPath();
    ctx.arc(x + 40, 220, 40, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  const x0 = Math.floor(camX / V.tile);
  const x1 = Math.ceil((camX + V.w) / V.tile);

  for (let y = 0; y < LEVEL_H; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y);
      if (t !== '.') drawTile(t, x * 16 - camX, y * 16);
    }
  }

  // flag pole
  const poleX = flagX - camX + 8;
  ctx.fillStyle = '#ececec';
  ctx.fillRect(poleX, 64, 3, 176);
  ctx.fillStyle = '#3dd149';
  ctx.fillRect(poleX + 3, 72, 20, 12);

  for (const coin of entities.coins) {
    if (coin.taken) continue;
    const cx = coin.x - camX;
    const wob = Math.sin(coin.t) * 2;
    ctx.fillStyle = '#ffd54d';
    ctx.fillRect(cx + 4 + wob, coin.y + 2, 4, 12);
    ctx.fillStyle = '#c7942b';
    ctx.fillRect(cx + 3 + wob, coin.y + 3, 1, 10);
  }

  for (const en of entities.enemies) {
    if (!en.alive) continue;
    drawSprite(Math.sin(en.t += 0.09) > 0 ? 'enemyA' : 'enemyB', Math.floor(en.x - camX), Math.floor(en.y), 1, en.vx > 0);
  }

  const moving = Math.abs(player.vx) > 0.25;
  const frame = !player.grounded
    ? 'heroJump'
    : (moving ? ((Math.floor(player.anim) % 2) ? 'heroRun1' : 'heroRun2') : 'heroIdle');
  drawSprite(frame, Math.floor(player.x - camX - 1), Math.floor(player.y - 2), 1.4, player.facing < 0);

  // UI
  ctx.fillStyle = '#0f2449';
  ctx.fillRect(8, 8, 126, 24);
  ctx.fillStyle = '#fff7d1';
  ctx.font = '12px monospace';
  ctx.fillText(`PIÈCES ${player.coins.toString().padStart(2, '0')}`, 14, 24);

  if (won || gameOver) {
    ctx.fillStyle = 'rgba(8, 10, 24, .65)';
    ctx.fillRect(0, 0, V.w, V.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(won ? 'NIVEAU TERMINÉ !' : 'GAME OVER', 140, 130);
    ctx.font = '12px monospace';
    ctx.fillText('Appuie sur R pour recommencer', 150, 156);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
