// ============ 06 · QUI FIXE LE TAUX : la formule, puis le gel ============
const S_TAUX = { id: 'taux', label: '05 / QUI FIXE LE TAUX ?', barres: 10, bg: K.ink, sortie: 'iris', next: K.yel,
  sons: [[0, 'impact', .9], [2, 'buzz', .8], [3, 'ding', .8], [6, 'flip', .7], [7, 'flip', .7], ...[10, 11, 12, 13, 14].map(n => [n, 'pop', .8]), [15, 'impact', .9], [18, 'whoosh', .7], [22, 'mot', .6], [24, 'marteau', 1], [28, 'gel', 1], [34, 'impact', 1]],
  chocs: [2, 15, 24, 28, 34],
  draw() {
    fond(K.ink);
    if (U < B(9.6)) hors(9.6, () => {
      // écran partagé : ta banque (barrée) / l'État
      const kp = xo(kb(0, .5)); g.fillStyle = '#1A1B22'; g.fillRect(0, 0, CX * kp, H); g.fillStyle = K.yel; g.fillRect(W - CX * xo(kb(1, .5)), 0, CX, H);
      pop(.5, CX / 2, 440, () => { icone('banque', 0, 0, 2.6, K.grey, 8); T('TA BANQUE', 0, 190, 64, K.grey); });
      if (on(2)) { const k = eo(kb(2, .25)); g.strokeStyle = K.red; g.lineWidth = 24; g.lineCap = 'round'; g.beginPath(); g.moveTo(CX / 2 - 200, 240); g.lineTo(CX / 2 - 200 + 400 * k, 240 + 400 * k); g.stroke(); }
      pop(3, CX * 1.5, 440, () => { icone('banque', 0, 0, 2.6, K.ink, 8); T('L’ÉTAT', 0, 190, 80, K.ink); });
      pill('1ER FÉVRIER', CX * 1.5 - 170, 830, K.ink, 28, K.yel, 6); pill('1ER AOÛT', CX * 1.5 + 170, 830, K.ink, 28, K.yel, 7);
      tape('RÉVISÉ 2 FOIS PAR AN', CX / 2, 830, 34, K.paper, 6.5);
    });
    if (U >= B(9.6) && U < B(21.6)) hors(21.6, () => {
      tape('LA FORMULE', CX, 180, 40, K.yel, 9.8, .4, { esp: 12 });
      const parts = [['(', K.paper, 10], ['INFLATION', K.red, 10.5], ['+', K.paper, 11], ['€STR', K.blue, 11.5], [')', K.paper, 12], ['÷ 2', K.paper, 13]];
      const ws = parts.map(([s]) => larg(s, 96)), gap = 34, tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1); let xx = -tot / 2;
      parts.forEach((p, i) => { p.push(xx + ws[i] / 2); xx += ws[i] + gap; });
      parts.forEach(([s, c, n, dx]) => { const k = P(U, B(n), .35); if (k <= 0) return; g.save(); g.translate(CX + dx, 440 - (1 - xo(k)) * 200); g.rotate((1 - xo(k)) * .6); T(s, 0, 0, 96, c); g.restore(); });
      if (on(15)) { slam('= TAUX DU LIVRET A', CX, 600, 70, K.yel, 15, { chroma: true }); }
      // plancher
      const kp = eo(kb(18, .7)); if (kp > 0) { g.save(); g.setLineDash([26, 16]); g.strokeStyle = K.mint; g.lineWidth = 8; g.beginPath(); g.moveTo(160, 820); g.lineTo(160 + 1600 * kp, 820); g.stroke(); g.restore(); pill('PLANCHER : 0,5 %', CX, 820, K.mint, 34, K.ink, 18.5); }
    });
    if (U >= B(21.6) && U < B(33.6)) hors(33.6, () => {
      tape('MAIS…', CX, 200, 70, K.paper, 22, .3, { esp: 20 });
      // le marteau du gouvernement
      const km = P(U, B(23.4), .6), ang = km < .7 ? lerp(0, -.9, eo(km / .7)) : lerp(-.9, .25, xi((km - .7) / .3));
      if (km > 0) { g.save(); g.translate(560, 560); g.rotate(ang); g.fillStyle = K.yel; rr(-150, -60, 170, 100, 16); g.fill(); g.fillRect(-20, -18, 260, 30); g.restore(); }
      if (on(24)) { circle(560, 700, 90 * eo(kb(24, .3)), 'rgba(255,210,63,.15)'); }
      revele('LE GOUVERNEMENT', 1250, 470, 64, K.paper, 24); revele('A LE DERNIER MOT.', 1250, 560, 64, K.yel, 24.5);
      // le gel à 3 %
      if (on(27.6)) {
        const kg = eo(P(U, B(28), 2.2)); g.fillStyle = `rgba(150,200,255,${.9 * eo(P(U, B(27.6), .4))})`; g.fillRect(0, 0, W, H);
        const r = rng(9); for (let i = 0; i < 16; i++) givre(r() * W, r() * H, 60 + r() * 80, clamp(kg * 1.6 - r() * .6), i + 3);
        slam('3 %', CX, 480, 300, K.ink, 28, { de: 2.6 }); T('GELÉ', CX, 240, 90, '#FFFFFF', { a: eo(kb(28.5)), esp: 30 });
        tape('AOÛT 2023 → JANVIER 2025 · ALORS QUE LA FORMULE POUSSAIT PLUS HAUT', CX, 760, 28, K.ink, 30, .9);
      }
    });
    if (U >= B(33.6)) { fond(K.red); slam('RETIENS :', CX, 330, 80, K.ink, 34); revele('LE TAUX SUIT', CX, 500, 110, K.paper, 35); revele('L’INFLATION.', CX, 650, 150, K.ink, 36); }
  } };

// ============ 07 · L'EXPÉRIENCE : 20 ans en accéléré ============
const S_XP = { id: 'xp', label: '06 / L’EXPÉRIENCE', barres: 8, bg: K.yel, sortie: 'split', next: K.red,
  sons: [[0, 'impact', 1], [2, 'chute', .6], [3, 'piece', 1], ...Array.from({ length: 20 }, (_, i) => [6 + i * .7, 'tic', .7]), [20, 'caisse', 1], [21, 'impact', 1], [25, 'pop', .8], [28, 'boing', .9]],
  chocs: [0, 21],
  draw() {
    fond(K.yel);
    g.save(); g.globalAlpha = .08; for (let x = 0; x < W; x += 60) { g.fillStyle = K.ink; g.fillRect(x, 0, 2, H); } g.restore();
    slam('L’EXPÉRIENCE', CX, 120, 90, K.ink, 0);
    const an = clamp(2006 + (U - B(6)) / B(14) * 20, 2006, 2025.999), x = an - 2006, i = Math.floor(x);
    const val = U < B(6) ? 10000 : U >= B(20) ? 13965 : lerp(NOMINAL[i], NOMINAL[Math.min(20, i + 1)], x - i);
    // calendrier qui s'effeuille
    pop(2, 430, 560, () => { rr(-200, -230, 400, 460, 36); g.fillStyle = K.paper; g.fill(); rr(-200, -230, 400, 120, [36, 36, 0, 0]); g.fillStyle = K.red; g.fill();
      const fin = U >= B(20); T(fin ? 'DÉCEMBRE' : 'JANVIER', 0, -170, 40, K.paper); T(fin ? '31' : '1ER', 0, 10, 150, K.ink); T(String(Math.min(2025, Math.floor(an))), 0, 160, 64, K.red); });
    if (on(6) && U < B(20)) { const f = frac(an); if (f < .3) { g.save(); g.translate(430, 390); g.rotate(-f * 5); g.globalAlpha = 1 - f / .3; rr(-200, 0, 400, 120, 10); g.fillStyle = K.paper; g.fill(); g.restore(); } }
    // pile de pièces : capital + intérêts composés
    const nb = 10 + Math.floor((val - 10000) / 220);
    pop(3, 1000, 820, () => { for (let j = 0; j < nb; j++) { const cap = j < 10; g.save(); g.translate(0, -j * 18); g.scale(1, .3); circle(0, 10, 130, cap ? '#C9921A' : '#00B383'); circle(0, 0, 130, cap ? '#F7C948' : '#00E5A0'); g.restore(); } });
    if (on(8)) { pill('CAPITAL', 1000 - 260, 800, K.ink, 24, K.yel, 8); pill('INTÉRÊTS', 1000 - 260, 800 - Math.max(0, nb - 10) * 18 - 70, '#00B383', 24, K.ink, 10); }
    tape('INTÉRÊTS COMPOSÉS : LES INTÉRÊTS RAPPORTENT À LEUR TOUR', CX, 1000, 26, K.ink, 9, .9);
    if (on(2)) { rr(1260, 250, 560, 190, 40); g.fillStyle = U >= B(20) ? K.ink : 'rgba(11,11,15,.9)'; g.fill(); odo(val, 1540, 345, 80, U >= B(20) ? K.mint : K.paper, { suf: ' €' }); }
    slam('+ 3 965 €', 1540, 540, 90, K.ink, 25, { de: 2 });
    elastique('PAS MAL, NON ?', 1540, 680, 60, K.red, 28);
    if (U >= B(21)) { const r = rng(12); for (let q = 0; q < 40; q++) { const k = P(U, B(21) + r() * .2, 1.6); if (k > 0 && k < 1) { const a = r() * 7, v = 400 + r() * 700; piece(1540 + Math.cos(a) * v * eo(k), 345 + Math.sin(a) * v * eo(k) * .6 + 900 * k * k, 18 + r() * 14, k * 14 + q, 1 - k); } } }
  } };

// ============ 08 · L'INFLATION : le rouge prend tout ============
const S_INFL = { id: 'infl', label: '07 / L’ENNEMI : L’INFLATION', barres: 12, bg: K.red, sortie: 'slab', next: K.ink,
  sons: [[0, 'impact', .9], [4, 'boom', 1], [8, 'pop', .8], [9, 'gonfle', 1], [16, 'pop', .6], [17, 'pop', .6], [18, 'pop', .6], [19, 'pop', .6], [20, 'impact', 1], ...[24, 25, 26, 27].map(n => [n, 'pop', .7]), [30, 'whoosh', .7], [32, 'fond', 1], [38, 'boom', 1], [42, 'impact', .9]],
  chocs: [4, 20, 38, 42],
  draw() {
    fond(K.red);
    if (U < B(7.6)) hors(7.6, () => { tape('IL MANQUE QUELQU’UN DANS CETTE HISTOIRE.', CX, 260, 40, K.ink, 0, 1); const k = P(U, B(4), .35);
      if (k > 0) { g.save(); g.translate(CX, 560); const s = lerp(3, 1, xo(k)); g.scale(s, s); g.transform(1, 0, -.12 * Math.sin(U * 3), 1, 0, 0); T('L’INFLATION', 0, 0, 200, K.ink); g.restore(); } });
    if (U >= B(7.6) && U < B(15.6)) hors(15.6, () => {
      const kg = eio(P(U, B(9), 2.2)), s = lerp(1, 1.45, kg);
      pop(8, 820, 520, () => { g.scale(s, s); g.rotate(-.08 + .03 * Math.sin(U * 2)); g.fillStyle = K.paper; g.beginPath(); g.moveTo(-230, -110); g.lineTo(170, -110); g.lineTo(250, 0); g.lineTo(170, 110); g.lineTo(-230, 110); g.closePath(); g.fill(); circle(180, 0, 18, K.red); odo(lerp(100, 137, kg), -30, 4, 120, K.ink, { suf: ' €' }); });
      glisse(10, 1500, 400, 80, 0, () => { T('2006 → 2025', 0, 0, 56, K.ink); T('SOURCE : INSEE', 0, 70, 26, 'rgba(11,11,15,.7)', { mono: true }); });
      slam('+ 37 %', 1500, 640, 130, K.paper, 13, { de: 2 });
    });
    if (U >= B(15.6) && U < B(23.6)) hors(23.6, () => {
      [['pain', 'LE PAIN'], ['maison', 'LE LOYER'], ['voiture', 'L’ESSENCE'], ['ticket', 'LE CINÉMA']].forEach(([ic, s], i) => pop(16 + i, 330 + i * 420, 420, () => { circle(0, 0, 130, 'rgba(11,11,15,.18)'); icone(ic, 0, 0, 1.9, K.paper, 9); T(s, 0, 190, 40, K.ink); const k = eo(P(U, B(16 + i) + .3, .5)); fleche(95, 60, 95, 60 - 110 * k, K.paper, 9, 1); }));
      slam('TOUT.', CX, 820, 180, K.ink, 20, { de: 2.6 });
    });
    if (U >= B(23.6) && U < B(29.6)) hors(29.6, () => {
      const parts = [['70', K.ink, 24, -560], ['÷', K.paper, 25, -330], ['2 %', K.ink, 26, -80], ['=', K.paper, 27, 180]];
      parts.forEach(([s, c, n, dx]) => pop(n, CX + dx, 440, () => T(s, 0, 0, 170, c), .35));
      slam('35 ANS', CX + 540, 440, 170, K.paper, 27.5, { de: 2 });
      revele('POUR QUE LES PRIX DOUBLENT.', CX, 700, 70, K.ink, 28);
    });
    if (U >= B(29.6) && U < B(37.6)) hors(37.6, () => {
      fond(K.ink);
      const barre = (x, h, c, lab) => { rr(x - 190, 900 - h, 380, h, [26, 26, 0, 0]); g.fillStyle = c; g.fill(); T(lab, x, 950, 30, K.grey, { mono: true }); };
      const h1 = 580 * eo(kb(30, .6)); barre(640, h1, K.yel, 'SUR TON COMPTE'); if (on(30)) T('13 965 €', 640, 900 - h1 - 70, 84, K.paper);
      const k2 = eio(P(U, B(32), 2)), h2 = lerp(580, 580 * 10155 / 13965, k2);
      if (on(31)) { barre(1280, h2 * eo(kb(31, .5)), '#FFE58A', 'EN EUROS DE 2006'); g.fillStyle = K.red; g.fillRect(1090, 320, 380, (580 - h2)); if (k2 > .05) T('INFLATION', 1280, 320 + (580 - h2) / 2, 30, K.paper, { mono: true });
        odo(lerp(13965, 10155, k2), 1280, 900 - h2 - 70, 84, K.paper, { suf: ' €' }); }
      revele('EN POUVOIR D’ACHAT…', CX, 150, 64, K.paper, 30);
    });
    if (U >= B(37.6)) { fond(K.ink); const gl = g.createRadialGradient(CX, 520, 20, CX, 520, 800); gl.addColorStop(0, 'rgba(242,182,50,.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      revele('20 ANS D’ÉPARGNE', CX, 230, 72, K.paper, 38); const k = eio(P(U, B(39), 1.2)); if (on(38.8)) odo(155 * k, CX, 500, 280, K.yel, { pre: '+ ', suf: ' €', glow: 'rgba(242,182,50,.6)' });
      tape('DE VRAI GAIN', CX, 700, 44, K.paper, 40.5, .4, { esp: 14 }); pill('MÊME PAS 8 € PAR AN', CX, 850, K.red, 44, K.paper, 42); }
  } };

// ============ 09 · VINGT ANS EN QUATRE ÉPOQUES ============
const GX0 = 250, GX1 = 1690, GY0 = 640, GY1 = 250, BZ = 820, BK = 26;
const gx = a => lerp(GX0, GX1, (a - 2006) / 20), gy = v => lerp(GY0, GY1, v / 6);
const EPO = [[0, 2006, 2010, 'L’ÂGE D’OR', K.mint], [10, 2010, 2022, 'LES ANNÉES ZÉRO', K.paper], [22, 2022, 2024, 'LE CHOC', K.red], [32, 2024, 2026, 'LE RATTRAPAGE', K.mint]];
const S_EPOQ = { id: 'epoques', label: '08 / 20 ANS EN 4 ÉPOQUES', barres: 14, bg: K.ink, sortie: 'iris', next: K.deep,
  sons: [[0, 'impact', 1], [2, 'trace', .8], [10, 'impact', 1], [12, 'trace', .8], [22, 'boom', 1], [23, 'glitch', 1], [24, 'trace', .8], [28, 'impact', .8], [32, 'impact', 1], [34, 'trace', .8], [42, 'whoosh', .8], [50, 'impact', 1]],
  chocs: [0, 10, 22, 23, 28, 32, 50],
  draw() {
    fond(K.ink);
    if (U < B(41.6)) hors(41.6, () => {
      let e = 0; while (e + 1 < EPO.length && U >= B(EPO[e + 1][0])) e++;
      const [n0, a0, a1, nom, c] = EPO[e], rev = lerp(a0, a1, eio(P(U, B(n0 + 2), B(6))));
      const ktit = P(U, B(n0), B(2));
      // bande colorée de l'époque
      g.save(); g.globalAlpha = .12; g.fillStyle = c; g.fillRect(gx(a0), GY1 - 50, gx(a1) - gx(a0), BZ + 130 - GY1); g.restore();
      // axes
      g.strokeStyle = 'rgba(244,241,234,.1)'; g.lineWidth = 2; for (let v = 0; v <= 6; v++) { g.beginPath(); g.moveTo(GX0, gy(v)); g.lineTo(GX1, gy(v)); g.stroke(); T(v + ' %', GX0 - 24, gy(v), 22, K.grey, { mono: true, align: 'right' }); }
      for (let a = 2006; a <= 2026; a += 4) T(String(a), gx(a), GY0 + 34, 22, K.grey, { mono: true });
      g.strokeStyle = 'rgba(244,241,234,.3)'; g.beginPath(); g.moveTo(GX0, BZ); g.lineTo(GX1, BZ); g.stroke(); T('GAIN RÉEL', GX0 - 24, BZ, 20, K.grey, { mono: true, align: 'right' });
      pill('TAUX DU LIVRET A', 1350, 190, K.yel, 20); pill('INFLATION', 1620, 190, K.red, 20, K.paper);
      g.save(); g.beginPath(); g.rect(0, 0, gx(rev), H); g.clip();
      for (let a = 2006; a <= 2025; a++) { const r = tauxMoyen(a) - INF[a], h = r * BK; rr(gx(a) + 12, r >= 0 ? BZ - h : BZ, gx(a + 1) - gx(a) - 24, Math.abs(h) + .1, 6); g.fillStyle = r >= 0 ? K.mint : K.red; g.fill(); }
      g.shadowBlur = 24; g.shadowColor = K.red; g.strokeStyle = K.red; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); for (let a = 2006; a <= 2025; a++) { const x = gx(a + .5), y = gy(INF[a]); a === 2006 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
      g.shadowColor = K.yel; g.strokeStyle = K.yel; g.lineWidth = 8; g.beginPath(); let py = null;
      for (let a = 2006; a <= 2025; a++) for (let m = 1; m <= 12; m++) { const x = gx(a + (m - 1) / 12), y = gy(taux(a, m)); if (py === null) g.moveTo(x, y); else { g.lineTo(x, py); g.lineTo(x, y); } py = y; }
      g.lineTo(gx(2026), py); g.stroke(); g.restore();
      // tête lumineuse
      if (rev < a1 - .01 && on(n0 + 2)) { const aa = Math.floor(rev), mm = Math.floor((rev - aa) * 12) + 1; circle(gx(rev), gy(taux(aa, mm)), 12, K.yel); }
      const lab = (n, a, v, s, cc, dy = -56, fc = K.ink) => pill(s, gx(a), gy(v) + dy, cc, 24, fc, n);
      lab(6, 2008.8, 4, '4 %', K.yel); lab(16, 2015.9, .75, '0,75 %', K.yel); lab(18, 2020.6, .5, '0,5 %', K.yel, -56);
      lab(26, 2022.5, 5.2, '5,2 %', K.red, -56, K.paper); lab(27, 2023.5, 4.9, '4,9 %', K.red, 56, K.paper); lab(27.5, 2020.2, 3.3, '1 % → 2 % → 3 %', K.yel, 0);
      if (on(28)) slam('− 546 €', gx(2014.6), gy(4.9), 70, K.red, 28, { chroma: true });
      lab(36, 2025.3, 3, 'GELÉ À 3 %', K.yel, -56); lab(38, 2025.5, 1.7, '1,7 %', K.yel, 56);
      // titre de l'époque : claque plein écran puis s'installe en haut
      if (ktit < 1) { const k = xo(ktit); g.save(); g.globalAlpha = 1 - clamp((ktit - .7) / .3); g.fillStyle = c === K.paper ? K.paper : c; g.fillRect(0, CY - 130 * (1 - k * .2), W, 260 * (1 - k * .2)); T(nom, CX, CY, lerp(190, 150, k), K.ink); g.restore(); }
      else T(nom, CX, 110, 64, c);
      if (e === 2 && U < B(23.3)) { const r = rng(Math.floor(U * 40)); for (let i = 0; i < 6; i++) { const y = r() * H, h = 12 + r() * 50; g.drawImage(g.canvas, 0, y, W, h, (r() - .5) * 140, y, W, h); } }
    });
    if (U >= B(41.6)) {
      fond(K.ink); slam('TOUJOURS EN RETARD', CX, 130, 80, K.yel, 42);
      const fin = eio(kb(49.5, .5));
      avec(1 - fin, () => {
        const yc = 560, ph = (U - B(42)) * .3, per = 560, f = x => 180 * Math.sin((x / per - ph) * 2 * Math.PI);
        g.save(); g.lineWidth = 9; g.shadowBlur = 24; g.shadowColor = K.red; g.strokeStyle = K.red; g.beginPath(); for (let x = 140; x <= 1780; x += 6) x === 140 ? g.moveTo(x, yc - f(x)) : g.lineTo(x, yc - f(x)); g.stroke();
        const pas = per / 5, off = ((ph * per) % pas + pas) % pas; g.shadowColor = K.yel; g.strokeStyle = K.yel; g.beginPath(); let py;
        for (let x = 140; x <= 1780; x += 4) { const xs = Math.floor((x - off) / pas) * pas + off - pas * .5, y = yc - f(xs) * .9; if (x === 140) g.moveTo(x, y); else { g.lineTo(x, py); g.lineTo(x, y); } py = y; } g.stroke(); g.restore();
        pill('INFLATION', 1650, 300, K.red, 24, K.paper); pill('LIVRET A', 1650, 360, K.yel, 24);
        tape('QUAND LES PRIX S’ENVOLENT, IL COURT DERRIÈRE.', CX, 900, 32, K.paper, 44, .8);
      });
      if (fin > 0) avec(fin, () => { const bal = .25 * Math.cos((U - B(50)) * 2.4) * Math.exp(-(U - B(50)) * 1);
        g.save(); g.translate(CX, 560); g.fillStyle = K.paper; g.beginPath(); g.moveTo(-70, 280); g.lineTo(70, 280); g.lineTo(0, 0); g.fill(); g.rotate(bal); g.strokeStyle = K.paper; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-440, 0); g.lineTo(440, 0); g.stroke();
        [[-420, K.mint, 'GAINS'], [420, K.red, 'PERTES']].forEach(([x, cc, s]) => { g.save(); g.translate(x, 0); g.rotate(-bal); g.lineWidth = 3; g.beginPath(); g.moveTo(-80, 100); g.lineTo(0, 0); g.lineTo(80, 100); g.stroke(); g.fillStyle = cc; g.beginPath(); g.ellipse(0, 105, 130, 28, 0, 0, 7); g.fill(); T(s, 0, 180, 44, K.paper); g.restore(); }); g.restore();
        slam('≈ 0 DE GAIN RÉEL', CX, 280, 90, K.yel, 50, { chroma: true }); });
    }
  } };

// ============ 10 · ET AILLEURS ? ============
const S_AILL = { id: 'ailleurs', label: '09 / ET AILLEURS ?', barres: 12, bg: K.deep, sortie: 'slab', next: K.ink,
  sons: [[0, 'impact', 1], ...[2, 4, 6, 8].map(n => [n, 'flip', .9]), [12, 'impact', 1], [14, 'trace', 1], [16, 'crash', 1], [20, 'glitch', .6], [24, 'caisse', 1], [25, 'impact', 1], [28, 'whoosh', .8], [34, 'impact', 1], [40, 'mot', .6]],
  chocs: [0, 12, 16, 25, 34],
  draw() {
    fond(K.deep);
    if (U < B(11.6)) hors(11.6, () => {
      slam('LES MÊMES 10 000 €, AILLEURS ?', CX, 150, 64, K.paper, 0);
      [['LIVRET A', '1,7 %', K.yel, 'SANS IMPÔT · 22 950 €'], ['LDDS', '1,7 %', K.yel, 'MÊME TAUX · 12 000 €'], ['LEP', '2,5 %', K.blue, 'REVENUS MODESTES · 10 000 €'], ['FONDS EUROS', '2,6 %', '#9B6BFF', '2025 · PRÉLÈVEMENTS SOCIAUX']].forEach(([n, v, c, s], i) => {
        const k = P(U, B(2 + i * 2), .5); if (k <= 0) return; g.save(); g.translate(300 + i * 440, 560); g.scale(1, Math.sin(xo(k) * Math.PI / 2)); rr(-200, -250, 400, 500, 36); g.fillStyle = 'rgba(244,241,234,.07)'; g.fill(); g.strokeStyle = c; g.lineWidth = 4; g.stroke();
        T(n, 0, -170, 40, K.paper); T(v, 0, 0, 130, c); T(s, 0, 170, 18, K.grey, { mono: true }); g.restore(); });
      tape('LE LEP DÉPEND DE TON REVENU FISCAL DE RÉFÉRENCE. BEAUCOUP Y ONT DROIT SANS LE SAVOIR.', CX, 900, 24, K.blue, 7, 1.2);
      tape('TAUX EN VIGUEUR EN AOÛT 2026', CX, 960, 20, K.grey, 9, .5);
    });
    if (U >= B(11.6) && U < B(27.6)) hors(27.6, () => {
      slam('LA BOURSE MONDIALE', CX, 110, 72, K.mint, 12);
      const x0 = 240, x1 = 1700, y0 = 880, X = a => lerp(x0, x1, a / 20), Y = v => lerp(y0, 230, v / 55000), k = eio(P(U, B(14), B(10)));
      g.strokeStyle = 'rgba(244,241,234,.08)'; g.lineWidth = 2; for (let v = 0; v <= 50000; v += 10000) { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); T(fmt(v) + ' €', x0 - 18, Y(v), 20, K.grey, { mono: true, align: 'right' }); }
      for (let a = 0; a <= 20; a += 4) T(String(2006 + a), X(a), y0 + 32, 20, K.grey, { mono: true });
      const trace = (vals, c, gl) => { g.save(); g.shadowColor = c; g.shadowBlur = gl; g.strokeStyle = c; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); const n = 20 * k; for (let i = 0; i <= Math.ceil(n); i++) { const ii = Math.min(i, n), a = Math.floor(ii), f = ii - a, v = lerp(vals[a], vals[Math.min(20, a + 1)], f); i ? g.lineTo(X(ii), Y(v)) : g.moveTo(X(ii), Y(v)); } g.stroke();
        const ii = 20 * k, a = Math.floor(ii), v = lerp(vals[Math.min(20, a)], vals[Math.min(20, a + 1)], ii - a); circle(X(ii), Y(v), 12, c); g.restore(); };
      trace(NOMINAL, K.yel, 10); trace(BOURSE, K.mint, 30);
      if (on(16) && U < B(24)) { const kc = P(U, B(16), .3); g.fillStyle = `rgba(255,61,46,${.35 * (1 - kc)})`; g.fillRect(0, 0, W, H); pill('2008 : ≈ −50 %', X(2.6), Y(BOURSE[3]) - 90, K.red, 26, K.paper, 16); pill('2020 : COVID', X(14.2), Y(BOURSE[14]) - 110, K.red, 24, K.paper, 21); }
      if (on(24)) { pill('≈ 51 000 €', X(20) - 70, Y(51000) - 70, K.mint, 34, K.ink, 24); pill('13 965 €', X(20) - 70, Y(13965) - 60, K.yel, 26, K.ink, 24.5); slam('× 5', 1180, 330, 200, K.mint, 25, { chroma: true }); }
      tape('TRAJECTOIRE ILLUSTRATIVE · MSCI WORLD, DIVIDENDES RÉINVESTIS', x0, 180, 18, K.grey, 13, .8, { align: 'left', esp: 2 });
    });
    if (U >= B(27.6)) {
      fond(K.ink);
      glisse(28, 520, 460, -300, 0, () => { rr(-340, -220, 680, 440, 40); g.fillStyle = K.mint; g.fill(); T('BOURSE', 0, -110, 76, K.ink); T('+ DE RENDEMENT', 0, 10, 40, K.ink, { mono: true }); T('+ DE RISQUE', 0, 80, 40, K.red, { mono: true }); });
      glisse(29, 1400, 460, 300, 0, () => { rr(-340, -220, 680, 440, 40); g.fillStyle = K.yel; g.fill(); T('LIVRET A', 0, -110, 76, K.ink); T('PEU DE RENDEMENT', 0, 10, 40, K.ink, { mono: true }); T('AUCUN RISQUE', 0, 80, 40, '#00875E', { mono: true }); });
      slam('PAS DE RENDEMENT SANS RISQUE.', CX, 820, 76, K.paper, 34, { chroma: true });
      tape('SUR 1 AN, TOUT PEUT ARRIVER. SUR 15-20 ANS, LE TEMPS LISSE.', CX, 930, 26, K.mint, 38, .9);
      tape('LES PERFORMANCES PASSÉES NE GARANTISSENT PAS LES PERFORMANCES FUTURES.', CX, 990, 20, K.grey, 41, .9);
    }
  } };

// ============ 11 · ALORS, ON FAIT QUOI ? ============
const S_FAIRE = { id: 'faire', label: '10 / ALORS, ON FAIT QUOI ?', barres: 12, bg: K.ink, sortie: 'stores', next: K.mint,
  sons: [[0, 'mot', .8], [4, 'tampon', 1], [8, 'trace', .8], ...[14, 15, 16].map(n => [n, 'pop', .9]), [20, 'impact', .9], [24, 'remplit', 1], [32, 'cascade', 1], ...[36, 37, 38].map(n => [n, 'pop', .9]), [42, 'mot', .6]],
  chocs: [4, 20, 32],
  draw() {
    fond(K.ink);
    if (U < B(7.6)) hors(7.6, () => { revele('FAUT-IL FUIR', CX, 320, 110, K.paper, 0); revele('LE LIVRET A ?', CX, 460, 110, K.yel, 1); const k = P(U, B(4), .3);
      if (k > 0) { g.save(); g.translate(CX, 740); g.rotate(-.08); const s = lerp(2.6, 1, xo(k)); g.scale(s, s); rr(-260, -110, 520, 220, 30); g.strokeStyle = K.mint; g.lineWidth = 16; g.stroke(); T('NON.', 0, 8, 150, K.mint); g.restore(); } });
    if (U >= B(7.6) && U < B(23.6)) hors(23.6, () => {
      const ks = eo(kb(8, 1.2)); g.save(); g.translate(360, 480); g.scale(4, 4); g.setLineDash([400 * ks, 400]); icone('bouclier', 0, 0, 1, K.mint, 7); g.restore();
      revele('ÉPARGNE', 1150, 330, 120, K.paper, 9); revele('DE PRÉCAUTION', 1150, 460, 90, K.mint, 9.5);
      [['voiture', 'PANNE'], ['machine', 'MACHINE À LAVER'], ['malette', 'PERTE D’EMPLOI']].forEach(([ic, s], i) => pop(14 + i, 800 + i * 330, 700, () => { circle(0, 0, 90, 'rgba(244,241,234,.08)'); icone(ic, 0, -5, 1.3, K.paper, 7); T(s, 0, 130, 22, K.grey, { mono: true }); }));
      if (on(20)) { g.fillStyle = `rgba(11,11,15,${.85 * eo(kb(20, .3))})`; g.fillRect(0, 0, W, H); const k = eio(P(U, B(20.5), 1)); slam('3 À 6 MOIS', CX, 460, 200, K.yel, 20, { chroma: true }); tape('DE DÉPENSES DE CÔTÉ', CX, 640, 44, K.paper, 21, .6, { esp: 12 }); }
    });
    if (U >= B(23.6)) {
      // le coffre qui se remplit puis déborde
      const kf = eio(P(U, B(24), 3.2)), x = 620, y = 560;
      rr(x - 260, y - 240, 520, 480, 30); g.fillStyle = '#23252E'; g.fill(); g.strokeStyle = K.paper; g.lineWidth = 8; g.stroke();
      g.save(); rr(x - 230, y - 210, 460, 420, 18); g.clip(); const hh = 420 * Math.min(1, kf); g.fillStyle = K.yel; g.fillRect(x - 230, y + 210 - hh, 460, hh);
      g.fillStyle = 'rgba(201,146,26,.6)'; for (let i = 0; i < 12; i++) g.fillRect(x - 230, y + 210 - hh + i * 36 + 12, 460, 7); g.restore();
      circle(x + 200, y, 20, K.paper); T('TA RÉSERVE', x, y + 300, 44, K.paper);
      for (let i = 0; i < 16; i++) { const k = P(U, B(32) + i * .09, 1); if (k > 0) piece(lerp(x + 150, 1250 + (i % 4) * 60, eo(k)), lerp(y - 240, 520 + (i % 3) * 40, eo(k)) - Math.sin(k * Math.PI) * 200, 26, i + k * 9); }
      slam('ET LE RESTE ?', 1450, 250, 90, K.mint, 32.5);
      [['ASSURANCE VIE', '#9B6BFF'], ['PEA', K.blue], ['FONDS INDICIELS', K.mint]].forEach(([s, c], i) => pill(s, 1450, 480 + i * 130, c, 36, i === 1 ? K.paper : K.ink, 36 + i));
      tape('CHACUN SES RÈGLES, SES FRAIS, SES RISQUES.', 1450, 900, 26, K.grey, 42, .7);
    }
  } };

// ============ 12 · À RETENIR ============
const S_RET = { id: 'retenir', label: '11 / À RETENIR', barres: 6, bg: K.mint, sortie: 'iris', next: K.ink,
  sons: [[0, 'impact', 1], [8, 'impact', 1], [16, 'impact', 1]],
  chocs: [0, 8, 16],
  draw() {
    const i = Math.min(2, Math.floor(U / B(8)));
    const cfg = [[K.mint, '1', 'SÛR, DISPONIBLE,', 'SANS IMPÔT.', 'TA RÉSERVE DE SECOURS'], [K.yel, '2', 'SUR 20 ANS,', '≈ L’INFLATION.', 'IL PROTÈGE, IL NE FAIT PAS GROSSIR'], [K.blue, '3', 'GROSSIR =', 'TEMPS + RISQUE.', 'ET BIEN COMPRENDRE OÙ L’ON MET LES PIEDS']][i];
    fond(cfg[0]); const n = i * 8, fc = i === 2 ? K.paper : K.ink;
    const k = xo(kb(n, .6)); g.save(); g.globalAlpha = .12; T(cfg[1], 1500, 560 + (1 - k) * 400, 900, fc); g.restore();
    revele(cfg[2], 820, 420, 110, fc, n + .5); revele(cfg[3], 820, 560, 110, fc, n + 1); tape(cfg[4], 820, 720, 34, fc, n + 2.5, .7, { esp: 6 });
  } };

// ============ 13 · FIN ============
const S_FIN = { id: 'fin', label: 'FIN', barres: 8, bg: K.ink, sortie: null,
  sons: [[0, 'impact', 1], [1, 'impact', .8], [2, 'impact', 1], [5, 'mot', .6], [12, 'pop', .9], [18, 'clic', 1], [19, 'ding', 1], [26, 'piece', 1], [30, 'boom', 1]],
  chocs: [0, 1, 2],
  draw() {
    fond(K.ink);
    if (U < B(11.6)) hors(11.6, () => {
      [['20 ANS', K.paper, 0], ['10 000 €', K.paper, 1], ['+ 155 €', K.yel, 2]].forEach(([s, c, n], i) => slam(s, 360 + i * 600, 380, 88, c, n, { chroma: true }));
      revele('LA VÉRITÉ SUR TON LIVRET A.', CX, 620, 80, K.mint, 4);
      tape('CECI N’EST PAS UN CONSEIL EN INVESTISSEMENT. CHAQUE SITUATION EST DIFFÉRENTE.', CX, 860, 24, K.grey, 6, 1);
    });
    if (U >= B(11.6) && U < B(25.6)) hors(25.6, () => {
      pop(12, CX - 200, 380, () => { rr(-440, -110, 880, 220, 60); g.fillStyle = K.paper; g.fill(); g.beginPath(); g.moveTo(-260, 105); g.lineTo(-310, 190); g.lineTo(-170, 105); g.fill(); T('LA BOURSE POUR DÉBUTANTS ?', 0, 4, 40, K.ink); });
      pill('DIS-LE EN COMMENTAIRE', CX + 420, 230, K.yel, 30, K.ink, 14);
      const clic = P(U, B(18), .15);
      pop(16, CX, 740, () => { const s = 1 - .1 * Math.sin(clic * Math.PI); g.scale(s, s); rr(-300, -80, 600, 160, 80); g.fillStyle = clic < 1 ? K.red : '#34363F'; g.fill(); T(clic < 1 ? 'S’ABONNER' : 'ABONNÉ', 0, 4, 64, K.paper); });
      const k = eio(P(U, B(16.6), .7)); if (k > 0) { g.save(); g.translate(lerp(1450, CX + 120, k), lerp(1100, 790, k)); g.rotate(-.4); g.fillStyle = K.paper; g.strokeStyle = K.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 80); g.lineTo(20, 62); g.lineTo(38, 98); g.lineTo(52, 91); g.lineTo(34, 55); g.lineTo(62, 55); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    });
    if (U >= B(25.6)) { const k = P(U, B(26), 2.2), s = 1 - xi(P(U, B(30), .5)); piece(CX, CY, 140 * s * bo(P(U, B(26), .5)), U * 5 * (1 - k * .7), 1); T('LIVRET A', CX, CY + 230, 40, K.paper, { a: eo(kb(27)) * s, esp: 20 }); }
  } };

// ================= MONTAGE =================
const SEQ = [S_INTRO, S_HIST, S_REGLES, S_QUINZ, S_ARGENT, S_TAUX, S_XP, S_INFL, S_EPOQ, S_AILL, S_FAIRE, S_RET, S_FIN];
let DUREE = 0; const SONS = [], CHOCS = [];
function construire() {
  initCibles(); let t = 0;
  SEQ.forEach((s, i) => {
    s.t0 = t; s.t1 = t + s.barres * 4 * BEAT; t = s.t1;
    s.sons.forEach(([n, nom, v]) => SONS.push({ nom, t: +(s.t0 + B(n)).toFixed(3), v }));
    s.chocs.forEach(n => CHOCS.push(s.t0 + B(n)));
    if (i > 0) SONS.push({ nom: 'whoosh', t: +(s.t0 - .45).toFixed(3), v: .7 });
    s.bgSuivant = SEQ[i + 1] ? SEQ[i + 1].bg : K.ink;
  });
  DUREE = t;
}
function secousse(t) { let a = 0; for (const c of CHOCS) if (t >= c && t < c + .6) a += 16 * Math.exp(-(t - c) * 12); return [a * Math.sin(t * 97.3), a * Math.cos(t * 83.1)]; }
function transition(s, t) {   // recouvre l'écran avec le fond de la séquence suivante, pile sur la coupe
  const k = P(t, s.t1 - .45, .45); if (k <= 0 || !s.sortie) return; const c = s.bgSuivant;
  g.save(); g.fillStyle = c;
  if (s.sortie === 'iris') { g.beginPath(); g.arc(CX, CY, 2300 * xi(k), 0, 7); g.fill(); }
  else if (s.sortie === 'slab') { const x = lerp(W + 500, -700, eio(k)); g.beginPath(); g.moveTo(x, 0); g.lineTo(W + 900, 0); g.lineTo(W + 900, H); g.lineTo(x - 500, H); g.fill(); g.fillStyle = K.yel; g.beginPath(); g.moveTo(x - 60, 0); g.lineTo(x, 0); g.lineTo(x - 500, H); g.lineTo(x - 560, H); g.fill(); }
  else if (s.sortie === 'split') { const h = CY * eio(k); g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h); }
  else if (s.sortie === 'stores') { for (let i = 0; i < 12; i++) { const kk = eio(clamp(k * 1.6 - i * .05)); g.fillRect(i * W / 12, 0, W / 12 * kk + 1, H); } }
  else if (s.sortie === 'flash') { g.fillStyle = K.paper; g.globalAlpha = 1; g.fillRect(0, 0, W, H); }
  g.restore();
}
let GRAIN = [];
function initPost() {
  for (let v = 0; v < 3; v++) { const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; const q = c.getContext('2d'), im = q.createImageData(W / 2, H / 2), r = rng(99 + v);
    for (let i = 0; i < im.data.length; i += 4) { const x = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = x; im.data[i + 3] = 20; } q.putImageData(im, 0, 0); GRAIN.push(c); }
}
function hud(t, s) {
  g.save(); g.globalCompositeOperation = 'difference';
  if (s.id !== 'intro' && s.id !== 'fin') { const k = xo(P(t, s.t0, .4)); T(s.label, 80 - 30 * (1 - k), 70, 20, `rgba(255,255,255,${k})`, { mono: true, align: 'left', esp: 4 }); }
  g.fillStyle = '#fff'; g.fillRect(80, H - 44, (W - 160) * t / DUREE, 3);
  SEQ.forEach(q => { g.fillRect(80 + (W - 160) * q.t0 / DUREE - 1, H - 50, 2, 15); });
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (const [x, y, sx, sy] of [[40, 40, 1, 1], [W - 40, 40, -1, 1], [40, H - 40, 1, -1], [W - 40, H - 40, -1, -1]]) { g.beginPath(); g.moveTo(x, y + 26 * sy); g.lineTo(x, y); g.lineTo(x + 26 * sx, y); g.stroke(); }
  g.restore();
}
function render(t) {
  g.resetTransform(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.shadowBlur = 0;
  const s = SEQ.find(q => t >= q.t0 && t < q.t1) || SEQ.at(-1); U = t - s.t0;
  const [sx, sy] = secousse(t);
  g.save(); g.translate(sx, sy); g.translate(CX, CY); g.scale(1.02, 1.02); g.translate(-CX, -CY);
  s.draw(); g.restore();
  g.resetTransform(); g.globalAlpha = 1; g.setLineDash([]); g.shadowBlur = 0;
  transition(s, t);
  if (t < DUREE - 3) hud(t, s);
  g.drawImage(GRAIN[Math.floor(t * 60) % 3], 0, 0, W, H);
  const v = g.createRadialGradient(CX, CY, H * .5, CX, CY, H * 1.1); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.32)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  const noir = Math.max(1 - P(t, 0, .4), P(t, DUREE - .8, .8)); if (noir > 0) { g.fillStyle = `rgba(0,0,0,${noir})`; g.fillRect(0, 0, W, H); }
}
