/* Pompom Bridge: rendering, input, audio and UI around the deterministic sim (sim.js). */
(function () {
  'use strict';
  var S = window.BridgeSim, CFG = S.CFG, EV = S.EV;
  var INK = '#4a3b52';
  var qs = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[p[0]] = decodeURIComponent(p[1] || '1'); });
  var AUTO = qs.autoplay || '', SPEED = Math.max(0.25, Math.min(16, +qs.speed || 1));
  var FR = (qs.lang || navigator.language || 'en').toLowerCase().indexOf('fr') === 0;
  var T = FR ? {
    title: 'Pont Pompom', sub: 'Glisse à gauche et à droite. Ton escouade tire toute seule.',
    l1: 'Tapis bleu : +1 pompom par tuile', l2: 'Centre : repousse les Grognons', l3: 'Cadeau : casse-le pour le héros et les +5',
    play: 'Jouer', win: 'Gagné !', lose: 'Perdu…', retry: 'Rejouer', drag: 'Glisse !',
    squad: 'Pompoms restants : ', bossLeft: 'Il restait {n} PV au boss !', horde: 'Les Grognons ont débordé l’escouade.', boss: 'BOSS !', hero: 'HÉROS !'
  } : {
    title: 'Pompom Bridge', sub: 'Drag left and right. Your squad fires on its own.',
    l1: 'Blue belt: +1 pompom per tile', l2: 'Centre: push the Grumblies back', l3: 'Gift: break it for the hero and the +5s',
    play: 'Play', win: 'You win!', lose: 'So close…', retry: 'Try again', drag: 'Drag!',
    squad: 'Pompoms left: ', bossLeft: 'The boss had {n} HP left!', horde: 'The Grumblies overran the squad.', boss: 'BOSS!', hero: 'HERO!'
  };
  document.documentElement.lang = FR ? 'fr' : 'en';

  var cv = document.getElementById('game'), ctx = cv.getContext('2d');
  var overlay = document.getElementById('overlay'), panel = document.getElementById('panel'), muteBtn = document.getElementById('mute');
  var W = 360, H = 640, scale = 1, K = 0.85, WN = 174, WF = 98, Y0 = 0, Y1 = 0, CX = 180;
  var bg = document.createElement('canvas');
  var sim = new S.Sim(+qs.seed || ((Math.random() * 1e9) | 0) + 1);
  var state = 'menu', acc = 0, last = 0, tAnim = 0, shake = 0, hidden = false, hintT = 0, bannerT = 0, bannerTxt = '';
  var inTx = 0.5, dragId = null, dragX = 0, keyL = false, keyR = false;

  /* ---------- projection ---------- */
  var P = { x: 0, y: 0, s: 1 };
  function proj(x, y) {
    var p = y * (1 + K) / (1 + K * y), hw = WN + (WF - WN) * p;
    P.x = CX + (x - 0.5) * 2 * hw; P.y = Y0 - p * (Y0 - Y1); P.s = hw / WN;
  }

  /* ---------- sprites (pre-rendered) ---------- */
  function mk(w, h, fn) {
    var c = document.createElement('canvas'), r = 2; c.width = w * r; c.height = h * r;
    var g = c.getContext('2d'); g.scale(r, r); g.lineJoin = g.lineCap = 'round'; fn(g, w, h); c.lw = w; c.lh = h; return c;
  }
  function blob(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fillStyle = fill; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
  function eyes(g, x, y, d, r) { g.fillStyle = INK; g.beginPath(); g.arc(x - d, y, r, 0, 6.283); g.arc(x + d, y, r, 0, 6.283); g.fill(); }
  function pompom(col, belly, ears) {
    return mk(30, 32, function (g) {
      g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2;
      if (ears === 'bunny') { [-5, 5].forEach(function (dx) { g.beginPath(); g.ellipse(15 + dx, 7, 3, 7, dx * 0.04, 0, 6.283); g.fill(); g.stroke(); }); }
      else { [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(15 + s * 3, 10); g.lineTo(15 + s * 9, 4); g.lineTo(15 + s * 10, 13); g.closePath(); g.fill(); g.stroke(); }); }
      blob(g, 15, 20, 10, col);
      g.fillStyle = belly; g.beginPath(); g.arc(15, 23, 5.5, 0, 6.283); g.fill();
      eyes(g, 15, 18.5, 4, 1.5);
      g.fillStyle = 'rgba(255,120,150,.55)'; g.beginPath(); g.arc(8.5, 21.5, 2, 0, 6.283); g.arc(21.5, 21.5, 2, 0, 6.283); g.fill();
    });
  }
  function grumbly(col, dark) {
    return mk(28, 28, function (g) {
      g.beginPath(); g.moveTo(4, 24); g.quadraticCurveTo(2, 4, 14, 4); g.quadraticCurveTo(26, 4, 24, 24);
      g.quadraticCurveTo(21, 21, 19, 24); g.quadraticCurveTo(16.5, 21, 14, 24); g.quadraticCurveTo(11.5, 21, 9, 24); g.quadraticCurveTo(6.5, 21, 4, 24); g.closePath();
      g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      eyes(g, 14, 14, 4, 1.6);
      g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(7, 9.5); g.lineTo(12, 11.5); g.moveTo(21, 9.5); g.lineTo(16, 11.5); g.stroke();
      g.beginPath(); g.arc(14, 20.5, 2.6, 3.5, 5.9); g.stroke();
      g.fillStyle = dark; g.beginPath(); g.arc(8, 17, 1.8, 0, 6.283); g.arc(20, 17, 1.8, 0, 6.283); g.fill();
    });
  }
  function bossSprite(col, dark, crown) {
    return mk(120, 130, function (g) {
      g.lineWidth = 4; g.strokeStyle = INK;
      g.beginPath(); g.moveTo(14, 122); g.quadraticCurveTo(4, 26, 60, 26); g.quadraticCurveTo(116, 26, 106, 122);
      for (var i = 0; i < 4; i++) { var x = 106 - i * 23; g.quadraticCurveTo(x - 11.5, 106, x - 23, 122); }
      g.closePath(); g.fillStyle = col; g.fill(); g.stroke();
      g.fillStyle = crown; g.beginPath(); g.moveTo(34, 30); g.lineTo(30, 6); g.lineTo(46, 20); g.lineTo(60, 2); g.lineTo(74, 20); g.lineTo(90, 6); g.lineTo(86, 30); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(42, 68, 11, 0, 6.283); g.arc(78, 68, 11, 0, 6.283); g.fill(); g.lineWidth = 3; g.stroke();
      eyes(g, 60, 70, 18, 5);
      g.lineWidth = 5; g.beginPath(); g.moveTo(26, 50); g.lineTo(52, 60); g.moveTo(94, 50); g.lineTo(68, 60); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.arc(60, 102, 12, 3.5, 5.9); g.stroke();
      g.fillStyle = dark; g.beginPath(); g.arc(26, 86, 7, 0, 6.283); g.arc(94, 86, 7, 0, 6.283); g.fill();
    });
  }
  function streak(col, core) {
    return mk(10, 30, function (g) {
      g.fillStyle = INK; rr(g, 1, 1, 8, 28, 4); g.fill(); g.fillStyle = col; rr(g, 2.2, 2.2, 5.6, 25.6, 2.8); g.fill();
      g.fillStyle = core; rr(g, 3.6, 4, 2.8, 12, 1.4); g.fill();
    });
  }
  function tile(fill, edge, txt) {
    return mk(60, 34, function (g) {
      g.fillStyle = edge; rr(g, 2, 6, 56, 26, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      g.fillStyle = fill; rr(g, 2, 2, 56, 25, 8); g.fill(); g.stroke();
      g.font = '800 19px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = INK; g.strokeText(txt, 30, 15); g.fillStyle = '#fff'; g.fillText(txt, 30, 15);
    });
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var SP = {
    pom: [pompom('#fff7ef', '#ffe3ea', 'bunny'), pompom('#ffd27a', '#fff1c9', 'cat'), pompom('#bfe8c6', '#e9f8ec', 'cat'), pompom('#ffc2d6', '#ffe8f0', 'bunny')],
    hero: mk(46, 52, function (g) {
      g.fillStyle = '#ffc83d'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(12, 16); g.lineTo(10, 3); g.lineTo(18, 10); g.lineTo(23, 1); g.lineTo(28, 10); g.lineTo(36, 3); g.lineTo(34, 16); g.closePath(); g.fill(); g.stroke();
      blob(g, 23, 32, 17, '#fff7ef'); g.fillStyle = '#ffe3ea'; g.beginPath(); g.arc(23, 38, 9, 0, 6.283); g.fill();
      eyes(g, 23, 29, 7, 2.6); g.fillStyle = 'rgba(255,120,150,.6)'; g.beginPath(); g.arc(11, 34, 3.2, 0, 6.283); g.arc(35, 34, 3.2, 0, 6.283); g.fill();
    }),
    grum: [grumbly('#b79cf2', '#8f6fe0'), grumbly('#f29cc4', '#e06fa3'), grumbly('#9cc4f2', '#6f9fe0')],
    boss: [bossSprite('#c9a2ff', '#a174ee', '#ffc83d'), bossSprite('#ff9aa8', '#ee6f86', '#ffc83d')],
    plus: tile('#4aa8f0', '#2d7fd0', '+1'), gold: tile('#ffc83d', '#e09a12', '+' + CFG.GOLD_VAL),
    shot: streak('#fff3a6', '#ffffff'), shotH: streak('#ffc83d', '#fff3a6'),
    gift: mk(84, 92, function (g) {
      g.lineWidth = 3.5; g.strokeStyle = INK;
      g.fillStyle = '#ff7fa8'; rr(g, 8, 34, 68, 52, 10); g.fill(); g.stroke();
      g.fillStyle = '#ff9dbd'; rr(g, 3, 22, 78, 20, 8); g.fill(); g.stroke();
      g.fillStyle = '#ffc83d'; g.fillRect(36, 23.5, 12, 61); g.strokeRect(36, 23.5, 12, 61);
      [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(42 + s * 13, 13, 13, 8, s * -0.5, 0, 6.283); g.fill(); g.stroke(); });
      blob(g, 42, 19, 6, '#ffc83d');
    })
  };
  function draw(img, x, y, s, anchorBottom) {
    var w = img.lw * s, h = img.lh * s;
    ctx.drawImage(img, x - w / 2, anchorBottom ? y - h : y - h / 2, w, h);
  }

  /* ---------- layout ---------- */
  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight, cw, ch;
    if (vw / vh < 360 / 560) { H = Math.min(800, Math.round(360 * vh / vw)); cw = Math.min(vw, vh * 360 / H); ch = cw * H / 360; }
    else { H = 640; ch = vh; cw = ch * 360 / 640; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); scale = cv.width / W;
    Y0 = H - 70; Y1 = 84;
    var r = cv.getBoundingClientRect();
    overlay.style.left = r.left + 'px'; overlay.style.top = r.top + 'px'; overlay.style.width = cw + 'px'; overlay.style.height = ch + 'px';
    muteBtn.style.left = (r.left + cw - 54) + 'px'; muteBtn.style.top = (r.top + 10) + 'px';
    paintBg();
  }
  function quad(g, x0, x1, y0, y1, fill) {
    g.beginPath(); proj(x0, y0); g.moveTo(P.x, P.y); proj(x1, y0); g.lineTo(P.x, P.y); proj(x1, y1); g.lineTo(P.x, P.y); proj(x0, y1); g.lineTo(P.x, P.y); g.closePath();
    g.fillStyle = fill; g.fill();
  }
  function paintBg() {
    bg.width = cv.width; bg.height = cv.height;
    var g = bg.getContext('2d'); g.setTransform(scale, 0, 0, scale, 0, 0); g.lineJoin = 'round';
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#bfeaf5'); gr.addColorStop(0.35, '#8fd3e8'); gr.addColorStop(1, '#5fb6d6');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (var i = 0; i < 26; i++) { var wx = (i * 97) % 360, wy = 120 + (i * 53) % (H - 140); rr(g, wx, wy, 16 + (i % 3) * 8, 3, 1.5); g.fill(); }
    g.fillStyle = '#fff'; [[40, 40, 18], [62, 44, 14], [300, 30, 16], [322, 36, 12]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.283); g.fill(); });
    // deck
    quad(g, -0.035, 1.035, -0.12, 1.02, INK);
    quad(g, -0.02, 1.02, -0.12, 1.02, '#e9c99b');
    quad(g, 0, 1, -0.12, 1.02, '#fff1d6');
    quad(g, 0.02, 0.22, -0.12, 1.02, '#d3ebff');
    quad(g, 0.26, 0.74, -0.12, 1.02, '#ffe6ec');
    quad(g, 0.78, 0.98, -0.12, 1.02, '#fff0b8');
    g.strokeStyle = 'rgba(74,59,82,.13)'; g.lineWidth = 1.2;
    for (var y = -0.1; y < 1.02; y += 0.05) { g.beginPath(); proj(0, y); g.moveTo(P.x, P.y); proj(1, y); g.lineTo(P.x, P.y); g.stroke(); }
    g.strokeStyle = 'rgba(74,59,82,.35)'; g.lineWidth = 1.6;
    [0.22, 0.26, 0.74, 0.78].forEach(function (x) { g.beginPath(); proj(x, -0.12); g.moveTo(P.x, P.y); proj(x, 1.02); g.lineTo(P.x, P.y); g.stroke(); });
    // rail posts
    for (y = -0.08; y < 1.02; y += 0.12) [-0.028, 1.028].forEach(function (x) { proj(x, y); g.fillStyle = '#fff6e6'; g.strokeStyle = INK; g.lineWidth = 1.6 * P.s + 0.6; g.beginPath(); g.arc(P.x, P.y - 5 * P.s, 5 * P.s + 1, 0, 6.283); g.fill(); g.stroke(); });
    // far gate
    proj(0.5, 1.02); g.fillStyle = INK; rr(g, P.x - WF - 12, P.y - 30, WF * 2 + 24, 34, 10); g.fill();
    g.fillStyle = '#b79cf2'; rr(g, P.x - WF - 8, P.y - 26, WF * 2 + 16, 28, 8); g.fill();
  }

  /* ---------- particles / floating text ---------- */
  var NP = 140, pX = new Float32Array(NP), pY = new Float32Array(NP), pVX = new Float32Array(NP), pVY = new Float32Array(NP), pL = new Float32Array(NP), pS = new Float32Array(NP), pC = new Uint8Array(NP), pI = 0;
  var PCOL = ['#ffffff', '#ffd1e0', '#fff3a6', '#c9a2ff', '#4aa8f0', '#ffc83d'];
  function spark(x, y, n, col, sp, sz) {
    for (var i = 0; i < n; i++) {
      var k = pI; pI = (pI + 1) % NP; var a = Math.random() * 6.283, v = sp * (0.4 + Math.random() * 0.6);
      pX[k] = x; pY[k] = y; pVX[k] = Math.cos(a) * v; pVY[k] = Math.sin(a) * v - sp * 0.4; pL[k] = 0.45 + Math.random() * 0.25; pS[k] = sz; pC[k] = col;
    }
  }
  var NF = 14, fX = new Float32Array(NF), fY = new Float32Array(NF), fL = new Float32Array(NF), fT = [], fC = new Uint8Array(NF), fI = 0;
  for (var q = 0; q < NF; q++) fT.push('');
  function floatTxt(x, y, txt, col) { var k = fI; fI = (fI + 1) % NF; fX[k] = x; fY[k] = y; fL[k] = 0.8; fT[k] = txt; fC[k] = col; }

  /* ---------- audio ---------- */
  var AC = null, muted = qs.mute === '1', lastPop = 0;
  function audioInit() { if (AC || muted) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  function tone(f0, f1, dur, type, vol, delay) {
    if (!AC || muted || hidden) return;
    var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    plus: function () { tone(620, 980, 0.09, 'triangle', 0.16); },
    gold: function () { tone(700, 1400, 0.14, 'triangle', 0.2); tone(1050, 2100, 0.14, 'sine', 0.1, 0.05); },
    pop: function () { var n = performance.now(); if (n - lastPop < 70) return; lastPop = n; tone(420 + Math.random() * 200, 200, 0.05, 'sine', 0.06); },
    lost: function () { tone(300, 120, 0.16, 'sawtooth', 0.09); },
    brk: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f, 0.16, 'triangle', 0.18, i * 0.07); }); },
    bossIn: function () { tone(140, 70, 0.5, 'sawtooth', 0.14); tone(110, 60, 0.5, 'square', 0.06, 0.12); },
    bossDown: function () { [392, 523, 659].forEach(function (f, i) { tone(f, f * 1.5, 0.18, 'triangle', 0.18, i * 0.08); }); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.22, 'triangle', 0.2, i * 0.11); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.9, 0.26, 'triangle', 0.17, i * 0.16); }); }
  };
  function setMuteLabel() { muteBtn.textContent = muted ? '✕' : '♪'; muteBtn.style.opacity = muted ? 0.6 : 1; }
  muteBtn.addEventListener('click', function () { muted = !muted; setMuteLabel(); if (!muted) audioInit(); muteBtn.blur(); });
  setMuteLabel();

  /* ---------- events from the sim ---------- */
  function consume() {
    for (var i = 0; i < sim.evN; i++) {
      var t = sim.evT[i]; proj(sim.evX[i], sim.evY[i]);
      if (t === EV.POP) { if ((i & 1) === 0) spark(P.x, P.y - 8 * P.s, 2, 1 + (i & 2 ? 2 : 0), 60 * P.s, 3 * P.s + 1); SFX.pop(); }
      else if (t === EV.PLUS) { spark(P.x, P.y - 10, 7, 4, 120, 4); floatTxt(P.x + 30, P.y - 30, '+1', 4); SFX.plus(); }
      else if (t === EV.GOLD) { spark(P.x, P.y - 10, 12, 5, 150, 5); floatTxt(P.x - 34, P.y - 30, '+' + CFG.GOLD_VAL, 5); SFX.gold(); }
      else if (t === EV.LOST) { spark(P.x, P.y - 10, 5, 1, 110, 4); shake = Math.max(shake, 5); SFX.lost(); }
      else if (t === EV.THIT) { if ((i & 3) === 0) spark(P.x, P.y - 26 * P.s, 1, 5, 70, 3); }
      else if (t === EV.BREAK) { spark(P.x, P.y - 30, 30, 5, 220, 5); spark(P.x, P.y - 30, 14, 0, 160, 4); shake = 9; banner(T.hero); SFX.brk(); }
      else if (t === EV.BOSSIN) { banner(T.boss); SFX.bossIn(); }
      else if (t === EV.BOSSHIT) { if ((i & 3) === 0) spark(P.x, P.y - 20 * P.s, 1, 2, 60, 3); }
      else if (t === EV.BOSSDOWN) { spark(P.x, P.y - 50 * P.s, 36, 3, 260, 6); spark(P.x, P.y - 50 * P.s, 20, 1, 200, 5); shake = 12; SFX.bossDown(); }
      else if (t === EV.WIN) { SFX.win(); endT = 1.1; }
      else if (t === EV.LOSE) { shake = 14; SFX.lose(); endT = 1.1; }
    }
    sim.evN = 0;
  }
  var endT = 0;
  function banner(txt) { bannerTxt = txt; bannerT = 1.6; }

  /* ---------- squad formation ---------- */
  var NSQ = 52, sqX = new Float32Array(NSQ), sqY = new Float32Array(NSQ), sqOrder = [];
  (function () {
    for (var i = 0; i < NSQ; i++) { var r = 8 * Math.sqrt(i), a = i * 2.39996; sqX[i] = Math.cos(a) * r; sqY[i] = Math.sin(a) * r * 0.55; sqOrder.push(i); }
  })();
  var sqSorted = [], sqSortedN = -1;
  function squadOrder(n) {
    if (n === sqSortedN) return sqSorted;
    sqSorted = sqOrder.slice(0, n).sort(function (a, b) { return sqY[a] - sqY[b]; }); sqSortedN = n; return sqSorted;
  }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  /* ---------- render ---------- */
  var FONT = '800 px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
  function font(px) { ctx.font = FONT.replace('px', px + 'px'); }
  function label(txt, x, y, px, fill) {
    font(px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(3, px * 0.24); ctx.strokeStyle = INK; ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  }
  function render(dt) {
    var i, c, r, y, C = CFG.COLS, B = sim.boss;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0);
    var sx = 0, sy = 0;
    if (shake > 0.3) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; shake *= Math.pow(0.002, dt); } else shake = 0;
    ctx.setTransform(scale, 0, 0, scale, sx * scale, sy * scale); ctx.lineJoin = 'round';

    // locked lane shade + treasure
    if (sim.trHp > 0) { quad(ctx, 0.78, 0.98, CFG.TREAS_Y, 1.02, 'rgba(74,59,82,.20)'); }
    // +1 belt tiles (far to near)
    for (i = 0; i < CFG.TILE_N; i++) { y = sim.tileY[i]; if (y > 1.0 || y < -0.1) continue; proj(CFG.FARM_X, y); draw(SP.plus, P.x, P.y, P.s * 1.05, true); }
    for (i = 0; i < CFG.GOLD_N; i++) if (sim.goldOn[i]) { y = sim.goldY[i]; if (y > 1.0 || y < -0.1) continue; proj(CFG.TREAS_X, y); draw(SP.gold, P.x, P.y, P.s * 1.05, true); }
    if (sim.trHp > 0) {
      proj(CFG.TREAS_X, CFG.TREAS_Y); var wob = 1 + 0.03 * Math.sin(tAnim * 9) * (sim.sx > CFG.TREAS_X0 ? 1 : 0);
      draw(SP.gift, P.x, P.y, P.s * 0.86 * wob, true);
      label('' + Math.ceil(sim.trHp), P.x, P.y - 92 * P.s * 0.86 - 8, 20, '#fff');
    }

    // horde, far rows first; the boss is inserted at its depth
    var bossDrawn = !B.active, rows = 29;
    for (r = rows; r >= 0; r--) {
      for (c = 0; c < C; c++) {
        y = sim.front[c] + r * CFG.ROW_SP; if (y > 1.0) continue;
        var id = sim.killed[c] + r, h = hash(c + 1, id);
        proj(CFG.HORDE_X0 + (c + 0.5 + (h - 0.5) * 0.7) * S.CW, y);
        var bob = Math.sin(tAnim * 7 + h * 40) * 1.6 * P.s;
        draw(SP.grum[(h * 97 | 0) % 3], P.x, P.y + bob, P.s * (1.22 + (r === 0 ? 0.1 : 0)), true);
      }
    }
    if (!bossDrawn) drawBoss(B);

    // shots
    var simg = sim.hero ? SP.shotH : SP.shot;
    var extra = sim.squad >= 50 ? 3 : sim.squad >= 25 ? 2 : sim.squad >= 8 ? 1 : 0, spv = sim.spread() * 0.8;
    for (i = 0; i < sim.nShots; i++) {
      proj(sim.shX[i], sim.shY[i]); draw(simg, P.x, P.y - 12 * P.s, P.s * 1.1, false);
      for (c = 1; c <= extra; c++) { proj(sim.shX[i] + (hash(i + 1, c * 7 + (sim.shotCount & 3)) - 0.5) * 2 * spv, sim.shY[i] - 0.035 * c); if (P.y < Y0 - 30) draw(simg, P.x, P.y - 12 * P.s, P.s * 1.1, false); }
    }

    // squad
    proj(sim.sx, CFG.SQUAD_Y); var qx = P.x, qy = P.y, n = Math.min(sim.squad, NSQ), ord = squadOrder(n);
    ctx.fillStyle = 'rgba(74,59,82,.14)'; ctx.beginPath(); ctx.ellipse(qx, qy + 2, 16 + 8 * Math.sqrt(n), 7 + 4.3 * Math.sqrt(n), 0, 0, 6.283); ctx.fill();
    for (i = 0; i < n; i++) {
      var k = ord[i], hop = Math.abs(Math.sin(tAnim * 9 + k * 1.7)) * 3;
      draw(SP.pom[k & 3], qx + sqX[k], qy + sqY[k] - hop, 1.12, true);
    }
    if (sim.hero) draw(SP.hero, qx, qy + 10 - Math.abs(Math.sin(tAnim * 6)) * 4, 1.2, true);
    if (state === 'play' || state === 'end') label('' + sim.squad, qx, qy - 48 - 4.3 * Math.sqrt(n), 20, sim.contact ? '#ff9aa8' : '#fff');

    // particles
    for (i = 0; i < NP; i++) if (pL[i] > 0) {
      pL[i] -= dt; pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt; pVY[i] += 260 * dt;
      ctx.globalAlpha = Math.min(1, pL[i] * 3); ctx.fillStyle = PCOL[pC[i]]; ctx.fillRect(pX[i] - pS[i] / 2, pY[i] - pS[i] / 2, pS[i], pS[i]);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < NF; i++) if (fL[i] > 0) { fL[i] -= dt; fY[i] -= 46 * dt; ctx.globalAlpha = Math.min(1, fL[i] * 3); label(fT[i], fX[i], fY[i], 20, PCOL[fC[i]]); }
    ctx.globalAlpha = 1;

    // danger pulse when the horde is close
    if (state === 'play' && sim.minFront < 0.3) {
      ctx.globalAlpha = (0.3 - sim.minFront) / 0.14 * (0.25 + 0.15 * Math.sin(tAnim * 10)); ctx.fillStyle = '#ff5f7f';
      ctx.fillRect(0, H - 26, W, 26); ctx.globalAlpha = 1;
    }
    hud();
  }
  function drawBoss(B) {
    proj(B.x, B.y); var s = P.s * (B.final ? 1.25 : 1.0), img = SP.boss[B.final ? 1 : 0];
    var wob = Math.sin(tAnim * 5) * 3 * P.s;
    ctx.fillStyle = 'rgba(74,59,82,.16)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 52 * s, 14 * s, 0, 0, 6.283); ctx.fill();
    draw(img, P.x + wob, P.y, s, true);
    var top = P.y - 130 * s - 16, bw = 78, f = Math.max(0, B.hp / B.max);
    ctx.fillStyle = INK; rr(ctx, P.x - bw / 2 - 2, top - 2, bw + 4, 12, 6); ctx.fill();
    ctx.fillStyle = '#ff5f7f'; rr(ctx, P.x - bw / 2, top, Math.max(8, bw * f), 8, 4); ctx.fill();
    label('' + Math.ceil(B.hp), P.x, top - 12, 17, '#fff');
  }
  function hud() {
    // progress bar with boss markers
    var x0 = 16, w = W - 86, y = 22, dur = sim.duration(), f = Math.min(1, sim.t / dur);
    ctx.fillStyle = INK; rr(ctx, x0 - 3, y - 3, w + 6, 18, 9); ctx.fill();
    ctx.fillStyle = '#fff6e6'; rr(ctx, x0, y, w, 12, 6); ctx.fill();
    if (f > 0.02) { ctx.fillStyle = '#ff7fa8'; rr(ctx, x0, y, w * f, 12, 6); ctx.fill(); }
    for (var i = 0; i < CFG.BOSS.length; i++) {
      var bx = x0 + w * (CFG.BOSS[i].t + CFG.BOSS[i].dur * (i === CFG.BOSS.length - 1 ? 1 : 0)) / dur;
      draw(SP.boss[i], Math.min(bx, x0 + w - 4), y + 16, 0.2, true);
    }
    if (bannerT > 0) {
      bannerT -= 1 / 60; var a = Math.min(1, bannerT * 3), sc = 1 + Math.max(0, bannerT - 1.3) * 2;
      ctx.globalAlpha = a; label(bannerTxt, W / 2, H * 0.3, 40 * sc, '#ffc83d'); ctx.globalAlpha = 1;
    }
    if (state === 'play' && hintT > 0 && !AUTO) {
      var al = Math.min(1, hintT), b = Math.sin(tAnim * 6) * 5;
      ctx.globalAlpha = al;
      proj(0.5, CFG.SQUAD_Y); label('◀  ' + T.drag + '  ▶', W / 2, P.y + 44, 20, '#fff');
      proj(CFG.FARM_X, 0.2); label('▲', P.x, P.y + b, 22, '#4aa8f0');
      proj(CFG.TREAS_X, 0.2); label('▲', P.x, P.y + b, 22, '#ffc83d');
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- UI panels ---------- */
  function showMenu() {
    state = 'menu'; overlay.hidden = false;
    panel.innerHTML = '<h1>' + T.title + '</h1><p>' + T.sub + '</p><ul><li><i style="background:#4aa8f0"></i><span>' + T.l1 + '</span></li><li><i style="background:#ffb3c7"></i><span>' + T.l2 +
      '</span></li><li><i style="background:#ffc83d"></i><span>' + T.l3 + '</span></li></ul><button id="btn-play" type="button">' + T.play + '</button>';
    document.getElementById('btn-play').addEventListener('click', start);
  }
  function showResult() {
    state = 'result'; overlay.hidden = false;
    var win = sim.result === 'win', st = '';
    for (var i = 1; i <= 3; i++) st += '<span class="' + (i <= sim.stars ? '' : 'off') + '">★</span>';
    var msg = win ? T.squad + sim.squad : (sim.reason === 'boss' ? T.bossLeft.replace('{n}', sim.bossLeft) : T.horde);
    panel.innerHTML = '<h1>' + (win ? T.win : T.lose) + '</h1>' + (win ? '<div class="stars">' + st + '</div>' : '') + '<p id="result-msg">' + msg + '</p><button id="btn-retry" type="button">' + T.retry + '</button>';
    document.getElementById('btn-retry').addEventListener('click', start);
  }
  function start() {
    audioInit(); if (AC && AC.state === 'suspended') AC.resume();
    sim.reset(+qs.seed || ((Math.random() * 1e9) | 0) + 1);
    inTx = 0.5; acc = 0; endT = 0; hintT = 6; bannerT = 0; shake = 0;
    for (var i = 0; i < NP; i++) pL[i] = 0; for (i = 0; i < NF; i++) fL[i] = 0;
    overlay.hidden = true; state = 'play';
  }

  /* ---------- input ---------- */
  cv.addEventListener('pointerdown', function (e) {
    if (dragId !== null) return; dragId = e.pointerId; dragX = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== dragId) return;
    var cw = cv.getBoundingClientRect().width, dx = (e.clientX - dragX) / cw; dragX = e.clientX;
    inTx = Math.max(CFG.X_MIN, Math.min(CFG.X_MAX, inTx + dx * 360 / (2 * WN) * 1.15)); if (hintT > 1) hintT = 1;
    e.preventDefault();
  });
  function up(e) { if (e.pointerId === dragId) dragId = null; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  ['contextmenu', 'selectstart', 'dragstart'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'q') keyL = true;
    else if (e.key === 'ArrowRight' || e.key === 'd') keyR = true;
    else if ((e.key === 'Enter' || e.key === ' ') && state !== 'play' && state !== 'end' && !e.repeat) { start(); e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'q') keyL = false; else if (e.key === 'ArrowRight' || e.key === 'd') keyR = false;
  });
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden; last = 0;
    if (AC) { if (hidden) AC.suspend(); else if (!muted) AC.resume(); }
  });
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);

  /* ---------- loop ---------- */
  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now; tAnim += dt;
    if (state === 'play') {
      if (keyL || keyR) { inTx = Math.max(CFG.X_MIN, Math.min(CFG.X_MAX, inTx + (keyR ? 1 : -1) * 1.1 * dt)); if (hintT > 1) hintT = 1; }
      hintT -= dt; acc += dt * SPEED;
      var guard = 0;
      while (acc >= CFG.DT && guard++ < 40) {
        acc -= CFG.DT;
        if (AUTO) sim.botStep(AUTO); else { sim.tx = inTx; sim.moveSpeed = 2.4; }
        sim.step(); consume();
        if (sim.result) { state = 'end'; acc = 0; break; }
      }
    } else if (state === 'end') { endT -= dt; if (endT <= 0) showResult(); }
    render(dt);
  }

  window.__bridge = {
    sim: sim, start: start,
    get state() {
      var B = sim.boss;
      return { screen: state, time: sim.t, squad: sim.squad, x: sim.sx, hordeFront: sim.minFront, treasureHp: sim.trHp, hero: sim.hero,
        boss: B.active ? { hp: B.hp, max: B.max, y: B.y, final: B.final } : null, result: sim.result, reason: sim.reason, stars: sim.stars };
    }
  };
  resize(); showMenu();
  if (AUTO) start();
  requestAnimationFrame(frame);
})();
