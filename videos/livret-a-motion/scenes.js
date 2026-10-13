// LIVRET A — édition motion design : les séquences. Chaque séquence dure un nombre de mesures (1 mesure = 4 temps = 2 s).
// sons : [temps, nom, volume] — chocs : temps où l'image tremble.

// ============ 01 · INTRO : la pluie de pièces, puis le doute ============
const PLUIE = (() => { const r = rng(21), o = []; for (let i = 0; i < 60; i++) o.push({ t0: .3 + r() * 4.4, x: CX - 240 + r() * 480, r: 26 + r() * 16, spin: 5 + r() * 7, ph: r() * 7, tilt: (r() - .5) * .5 }); return o; })();
const Y_CARTE = 600, G_CHUTE = 2400;
function posPiece(p, u) {       // chute accélérée vers la carte, qui l'absorbe
  const tt = u - p.t0; if (tt < 0) return null; const y = -100 + .5 * G_CHUTE * tt * tt;
  return { x: p.x, y, rot: p.ph + tt * p.spin, absorbee: y >= Y_CARTE, tImp: Math.sqrt(2 * (Y_CARTE + 100) / G_CHUTE) + p.t0 };
}
function carteLivret(x, y, s, gris = 0, fissure = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 60; g.shadowOffsetY = 30; rr(-300, -190, 600, 380, 34); g.fillStyle = gris ? '#777' : K.yel; g.fill(); g.restore();
  const gr = g.createLinearGradient(-300, -190, 300, 190); gr.addColorStop(0, gris ? '#B8B8B8' : '#FFE68A'); gr.addColorStop(1, gris ? '#6A6A6A' : '#F0A81C');
  rr(-300, -190, 600, 380, 34); g.fillStyle = gr; g.fill();
  const sh = frac(U * .3) * 2 - .5, lg = g.createLinearGradient(-300 + sh * 600, -190, -150 + sh * 600, 190); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.4)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  rr(-300, -190, 600, 380, 34); g.fillStyle = lg; g.fill();
  T('LIVRET A', -250, -120, 54, K.ink, { align: 'left' }); T('ÉPARGNE RÉGLEMENTÉE', -250, -70, 20, 'rgba(11,11,15,.6)', { mono: true, align: 'left', esp: 3 });
  rr(-250, 10, 100, 74, 12); g.fillStyle = 'rgba(11,11,15,.22)'; g.fill(); T('0000 1818 2026', -250, 140, 30, 'rgba(11,11,15,.7)', { mono: true, align: 'left', esp: 6 });
  if (fissure > 0) { g.strokeStyle = K.red; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); const pts = [[-60, -190], [0, -100], [-40, -30], [30, 40], [-10, 110], [40, 190]]; pts.forEach(([a, b], i) => { if (i / (pts.length - 1) <= fissure + .01) i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
  g.restore();
}
const S_INTRO = { id: 'intro', label: 'INTRO', barres: 8, bg: K.ink, sortie: 'slab',
  sons: [[0, 'monte', 1], ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => [n, 'piece', .5]), [4, 'mot', .6], [6, 'mot', .6], [10, 'gel', 1], [13, 'impact', 1], [16, 'chute', .8], [18, 'impact', .8], [24, 'iris', 1], [26, 'mot', .7], [31, 'impact', 1]],
  chocs: [13, 18, 24, 31],
  draw() {
    const gel = B(10), ug = Math.min(U, gel), gris = eio(kb(10, 1.2));
    if (U < B(24)) {
      fond(K.ink);
      // halo derrière la carte
      const hal = g.createRadialGradient(CX, 560, 50, CX, 560, 800); hal.addColorStop(0, `rgba(242,182,50,${.28 * (1 - gris)})`); hal.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hal; g.fillRect(0, 0, W, H);
      const kc = bo(kb(0, .7)), chute = U > B(16) ? xi(P(U, B(16), 1.6)) : 0;
      const nb = PLUIE.filter(p => { const q = posPiece(p, ug); return q && q.absorbee; }).length;
      const pulse = PLUIE.reduce((m, p) => { const d = ug - posPiece(p, 99).tImp; return d >= 0 && d < .25 ? Math.max(m, 1 - d / .25) : m; }, 0);
      carteLivret(CX, Y_CARTE + chute * 900, .85 * kc * (1 + .025 * pulse), gris > .5 ? 1 : 0, eo(kb(13, .5)));
      // pièces : chute, rebonds, gel sur « Enfin », puis elles tombent dans le vide
      PLUIE.forEach((p, i) => {
        const q = posPiece(p, ug); if (!q) return;
        if (q.absorbee) { const d = ug - q.tImp; if (d < .3 && U < gel + .1) { g.save(); g.globalCompositeOperation = 'lighter'; for (let s2 = 0; s2 < 6; s2++) { const a = s2 * 1.05 + i; circle(p.x + Math.cos(a) * 70 * eo(d / .3), Y_CARTE - 150 + Math.sin(a) * 40 * eo(d / .3), 5 * (1 - d / .3), K.yel); } g.restore(); } return; }
        let { x, y, rot } = q;
        if (U > gel) { rot += .15 * Math.sin(U * 2 + i); y += 5 * Math.sin(U * 1.5 + i); }
        if (U > B(16)) { const tt = U - B(16) - (i % 10) * .04; if (tt > 0) { y += 1800 * tt * tt; rot += tt * 9; x += (p.x - CX) * tt * .8; } }
        const v = G_CHUTE * (ug - p.t0), flou = U < gel ? clamp(v / 1400) : 0;
        for (let k = 3; k >= 1 && flou > .1; k--) piece(x, y - k * v * .012, p.r, rot - k * .1, .14 * flou * (1 - gris), p.tilt);
        const ech = y > Y_CARTE - 170 ? lerp(1, .3, clamp((y - (Y_CARTE - 170)) / 170)) : 1;
        piece(x, y, p.r * ech, rot, 1 - gris * .55, p.tilt);
      });
      if (gris > 0) { g.fillStyle = `rgba(20,20,26,${.45 * gris})`; g.fillRect(0, 0, W, H); }
      // compteur qui s'arrête net sur le gel
      avec(eo(kb(1)) * (1 - kb(16, .4)), () => { const w = 330; rr(CX + 300 - w / 2, Y_CARTE - 250, w, 84, 42); g.fillStyle = gris > .5 ? '#2A2B33' : 'rgba(0,229,160,.16)'; g.fill(); T('+ ' + fmt(nb * 1.25, 2) + ' €', CX + 300, Y_CARTE - 206, 40, gris > .5 ? K.grey : K.mint, { mono: true, w: 800 }); });
      hors(9.6, () => { revele('TON LIVRET A', CX, 170, 96, K.paper, 4); revele('TE RAPPORTE DE L’ARGENT.', CX, 270, 60, K.yel, 6); });
      hors(16, () => { tape('ENFIN…', CX, 170, 60, K.paper, 11, .5, { esp: 16 }); slam('C’EST CE QUE TU CROIS.', CX, 280, 84, K.red, 13, { chroma: true }); });
      // tranches « glitch » sur l'impact
      const gl = kb(13, .35); if (gl > 0 && gl < 1) { const r = rng(Math.floor(U * 30)); for (let i = 0; i < 7; i++) { const y = r() * H, h = 10 + r() * 60, dx = (r() - .5) * 120 * (1 - gl); g.drawImage(g.canvas, 0, y, W, h, dx, y, W, h); } }
      // la courbe rouge de l'inflation traverse l'écran
      const ki = eio(P(U, B(17), 2.4));
      if (ki > 0) { g.save(); g.strokeStyle = K.red; g.lineWidth = 16; g.lineCap = 'round'; g.shadowColor = K.red; g.shadowBlur = 40; g.beginPath();
        for (let i = 0; i <= 80 * ki; i++) { const v = i / 80, x = -40 + v * (W + 80), y = 960 - v * v * 760 + 26 * Math.sin(v * 22) * v; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore(); }
      slam('20 ANS.', 420, 250, 90, K.paper, 18); slam('+ L’INFLATION.', 1380, 250, 90, K.red, 19.5, { chroma: true });
      revele('LA RÉALITÉ EST MOINS ROSE.', CX, 820, 70, '#F7B2C4', 21);
    }
    // titre : iris jaune
    const ki = xi(P(U, B(24) - .45, .45));
    if (U >= B(24) - .45) { if (U < B(24)) { g.save(); g.beginPath(); g.arc(CX, CY, 2300 * ki, 0, 7); g.fillStyle = K.yel; g.fill(); g.restore(); }
      else {
        fond(K.yel);
        g.save(); g.globalAlpha = .1; g.fillStyle = K.ink; g.translate((U * 140) % 90, 0); for (let x = -W; x < W * 2; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 45, 0); g.lineTo(x + 45 - H * .6, H); g.lineTo(x - H * .6, H); g.fill(); } g.restore();
        revele('LIVRET A', CX, 330, 230, K.ink, 24, { st: .05 });
        revele('20 ANS POUR GAGNER…', CX, 560, 72, K.ink, 26);
        const kv = eio(P(U, B(28), 1.4));
        if (on(28)) { odo(155 * kv, CX - 70, 760, 190, K.ink, { suf: ' €' }); }
        slam('?', CX + 360, 760, 190, K.red, 31, { de: 2.4 });
      }
    }
  } };

// ============ 02 · HISTOIRE : les particules racontent ============
let CIBLES = null;
function initCibles() {
  CIBLES = [[0, cibleSphere()], [4, cibleTexte('1818', 360, 2)], [12, ciblePiece()], [18, cibleTexte('2009', 360, 3)], [26, cibleTexte('56 000 000', 160, 4)], [34, cibleTexte('440 Md€', 270, 5)], [40, cibleTexte('6 000 €', 320, 6)]];
}
const S_HIST = { id: 'histoire', label: '01 / UN PEU D’HISTOIRE', barres: 12, bg: K.night, sortie: 'flash',
  sons: [[0, 'impact', .9], [4, 'morph', 1], [12, 'morph', 1], [18, 'morph', 1], [26, 'morph', 1], [34, 'morph', 1], [40, 'morph', 1], [45, 'monte', 1], [47, 'boom', 1]],
  chocs: [4, 18, 26, 34, 40],
  draw() {
    const bg = g.createRadialGradient(CX, CY, 50, CX, CY, 1150); bg.addColorStop(0, '#1C1850'); bg.addColorStop(1, K.ink); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // étoiles en parallaxe
    const r0 = rng(3); for (let i = 0; i < 120; i++) { const x = (r0() * W + U * 10 * (1 + r0())) % W, y = r0() * H; circle(x, y, r0() * 1.8, 'rgba(244,241,234,.35)'); }
    let j = 0; while (j + 1 < CIBLES.length && U >= B(CIBLES[j + 1][0])) j++;
    const [n0, A0] = CIBLES[Math.max(0, j - 1)], [n1, A1] = CIBLES[j];
    const expl = xi(P(U, B(45), 1.4)), nais = xo(kb(0, .9)), ry = .3 * Math.sin(U * .8) + (j <= 0 ? U * .9 : 0) + (j === 2 ? (U - B(12)) * 1.4 : 0), rx = .12 * Math.sin(U * .6);
    const cy = Math.cos(ry), sy = Math.sin(ry), cx_ = Math.cos(rx), sx = Math.sin(rx), F = 1400, D = 4;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NP; i++) {
      const k = j === 0 ? 1 : eio(P(U, B(n1) + (i / NP) * .35, .9));
      const a = j === 0 ? A1[i] : A0[i], b = A1[i];
      let p = [0, 1, 2].map(m => lerp(a[m], b[m], k) * (j === 0 ? nais : 1));
      const e = 1 + expl * 8 * (.5 + (i % 7) / 6); p = p.map(v => v * e);
      const X = p[0] * cy - p[2] * sy, Z1 = p[0] * sy + p[2] * cy, Y = p[1] * cx_ - Z1 * sx, Z = p[1] * sx + Z1 * cx_;
      if (Z + D < .3) continue; const s = F / (Z + D), x = CX + X * s, y = CY - 40 + Y * s;
      const c = COLS[i % 4], al = clamp(.35 + .65 * (1 - (Z + 1.2) / 2.4));
      g.fillStyle = c; g.globalAlpha = al * (1 - expl * .4); const sz = 4.6 * s / 350; g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      g.globalAlpha = al * .16; g.fillRect(x - sz * 1.6, y - sz * 1.6, sz * 3.2, sz * 3.2);
    }
    g.restore(); g.globalAlpha = 1;
    const cap = [[5, 'NAISSANCE DES CAISSES D’ÉPARGNE', 11.5], [13, 'METTRE DES PIÈCES DE CÔTÉ, EN SÉCURITÉ', 17.5], [19, 'TOUTES LES BANQUES PEUVENT LE PROPOSER', 25.5], [27, 'LIVRETS A OUVERTS EN FRANCE', 33.5], [35, 'DÉPOSÉS AU TOTAL', 39.5], [41, 'PAR FRANÇAIS. BÉBÉS COMPRIS.', 45]];
    cap.forEach(([n, s, f]) => { if (U >= B(n) && U < B(f)) hors(f - .5, () => { tape(s, CX, 880, 34, K.yel, n, .7, { esp: 6 }); }); });
    const fl = P(U, B(47), .5); if (fl > 0) { g.fillStyle = `rgba(244,241,234,${fl})`; g.fillRect(0, 0, W, H); }
  } };

// ============ 03 · LES RÈGLES : quatre claques de couleur ============
const S_REGLES = { id: 'regles', label: '02 / LES RÈGLES', barres: 8, bg: K.mint, sortie: 'iris', next: K.blue,
  sons: [[0, 'impact', 1], [4, 'impact', 1], [8, 'impact', 1], [12, 'impact', 1], [13, 'tic', .8], [16, 'whoosh', .8], ...[17, 17.5, 18, 18.5].map(n => [n, 'pop', .6]), [20, 'caisse', .8], [24, 'flip', .8], [26, 'piece', .7], [27, 'piece', .7]],
  chocs: [0, 4, 8, 12, 20],
  draw() {
    const i = Math.min(4, Math.floor(U / B(4)));
    if (i < 4) {
      const cfg = [[K.mint, 'DISPONIBLE', 'horloge', 'À TOUT MOMENT · SANS FRAIS'], [K.blue, 'SANS RISQUE', 'bouclier', 'TON CAPITAL NE PEUT PAS BAISSER'], [K.yel, '0 IMPÔT', null, 'NI IMPÔT, NI PRÉLÈVEMENTS SOCIAUX'], [K.red, 'PLAFOND', 'coffre', '']][i];
      fond(cfg[0]); const n = i * 4, fc = i === 1 ? K.paper : K.ink;
      // motif de fond : grille de points qui pulse sur le temps
      const pl = Math.exp(-frac(U / BEAT) * 5); g.fillStyle = i === 1 ? 'rgba(255,255,255,.12)' : 'rgba(11,11,15,.1)';
      for (let y = 60; y < H; y += 80) for (let x = 60; x < W; x += 80) { const d = Math.hypot(x - CX, y - CY) / 900; circle(x, y, 3 + 5 * pl * Math.max(0, 1 - d), g.fillStyle); }
      if (cfg[2]) pop(n + .5, CX, 330, () => { g.rotate(i === 0 ? U * 2 : 0); icone(cfg[2], 0, 0, 2.2, fc, 10); }, .5);
      else pop(n + .5, CX, 330, () => { T('%', 0, 0, 220, fc); g.strokeStyle = K.red; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(-110, 110); g.lineTo(110, -110); g.stroke(); }, .5);
      slam(cfg[1], CX, 600, 170, fc, n, { de: 2.2 });
      if (i === 3) { const k = eio(P(U, B(13), 1.1)); if (on(13)) odo(22950 * k, CX, 800, 120, K.ink, { suf: ' €' }); }
      else tape(cfg[3], CX, 780, 36, fc, n + 1.5, .6, { esp: 6 });
    } else {
      fond(K.ink);
      const k2 = P(U, B(24) - .3, .3);
      avec(1 - k2, () => {
        revele('1 LIVRET A PAR PERSONNE', CX, 220, 72, K.paper, 16);
        [0, 1, 2, 3].forEach(p => pop(17 + p * .5, 480 + p * 320, 500, () => { circle(0, 0, 110, p ? 'rgba(244,241,234,.08)' : 'rgba(255,210,63,.15)'); icone('personne', 0, 0, p > 1 ? 1.5 : 2, p ? K.paper : K.yel, 8); T('×1', 0, 150, 34, p ? K.paper : K.yel, { mono: true }); }));
        slam('4 × 22 950 € = 91 800 €', CX, 820, 76, K.yel, 20, { chroma: true });
      });
      if (k2 > 0) {
        revele('LES INTÉRÊTS TOMBENT UNE FOIS PAR AN', CX, 200, 56, K.paper, 24);
        const kf = eio(P(U, B(24), .6));
        g.save(); g.translate(700, 560); g.scale(1, Math.abs(Math.cos(kf * Math.PI)) || .01);
        rr(-190, -210, 380, 420, 34); g.fillStyle = K.paper; g.fill(); rr(-190, -210, 380, 110, [34, 34, 0, 0]); g.fillStyle = K.red; g.fill();
        T(kf > .5 ? 'DÉC.' : 'JAN.', 0, -155, 48, K.paper); T(kf > .5 ? '31' : '1', 0, 40, 190, K.ink); g.restore();
        fleche(930, 560, 1080, 560, K.mint, 10, eo(P(U, B(25.5), .4)));
        for (let q = 0; q < 6; q++) { const k = P(U, B(26) + q * .12, .7); if (k > 0) piece(1330 + (q % 3 - 1) * 90, lerp(200, 600 - Math.floor(q / 3) * 40, eo(k)), 44, k * 9 + q, 1); }
        slam('+ INTÉRÊTS', 1330, 820, 72, K.mint, 27);
      }
    }
  } };

// ============ 04 · LA RÈGLE DES QUINZAINES : le calendrier ============
const S_QUINZ = { id: 'quinzaine', label: '03 / LA RÈGLE DES QUINZAINES', barres: 8, bg: K.blue, sortie: 'stores', next: K.ink,
  sons: [[0, 'impact', 1], [2, 'cascade', 1], [6, 'whoosh', .6], [8, 'pop', .8], [10, 'mot', .8], [14, 'pop', .8], [16, 'mot', .8], [20, 'impact', .8], [22, 'mot', .6]],
  chocs: [0, 20],
  draw() {
    fond(K.blue);
    slam('LA RÈGLE DES QUINZAINES', CX, 120, 66, K.paper, 0);
    const x0 = 170, y0 = 230, cw = 155, ch = 108, pos = d => [x0 + ((d - 1) % 7) * cw + cw / 2, y0 + Math.floor((d - 1) / 7) * ch + ch / 2];
    for (let d = 1; d <= 31; d++) {
      const [x, y] = pos(d), kf = P(U, B(2) + (d - 1) * .03, .45), moi = d <= 15 ? 0 : 1, kc = eo(P(U, B(6) + moi * .5, .5));
      if (kf <= 0) continue;
      g.save(); g.translate(x, y); g.scale(1, Math.sin(kf * Math.PI / 2)); rr(-cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12, 16);
      g.fillStyle = kc > 0 ? (moi ? `rgba(0,229,160,${.25 + .5 * kc})` : `rgba(255,210,63,${.25 + .6 * kc})`) : 'rgba(244,241,234,.18)'; g.fill();
      T(String(d), 0, 2, 38, kc > .5 ? K.ink : K.paper, { mono: true, w: 800 }); g.restore();
    }
    pill('1 → 15', 400, 820, K.yel, 28, K.ink, 6.5); pill('16 → FIN', 1040, 820, K.mint, 28, K.ink, 7);
    const halo = (d, c, n) => { const k = P(U, B(n), .5); if (k <= 0) return; const [x, y] = pos(d); ring(x, y, 60 + 10 * Math.sin(U * 6), 8 * bo(k), c); };
    halo(10, K.paper, 8); slam('DÉPÔT LE 10', 1560, 360, 44, K.paper, 8.5, { de: 1.4 });
    if (on(9.5)) { const [a, b] = pos(10), [c, d] = pos(16); fleche(a, b + 30, c + 10, d - 38, K.paper, 8, eo(P(U, B(9.5), .6))); halo(16, K.paper, 10); }
    slam('RAPPORTE À PARTIR DU 16', 1560, 430, 36, K.yel, 10.5, { de: 1.4 });
    halo(24, K.red, 14); slam('RETRAIT LE 24', 1560, 560, 44, K.paper, 14.5, { de: 1.4 });
    if (on(15.5)) { const [a, b] = pos(24), [c, d] = pos(15); fleche(a - 20, b - 30, c + 30, d + 30, K.red, 8, eo(P(U, B(15.5), .6))); halo(15, K.red, 16); }
    slam('S’ARRÊTE DÈS LE 15', 1560, 630, 36, K.red, 16.5, { de: 1.4 });
    if (on(20)) { g.fillStyle = `rgba(20,30,90,${.75 * eo(kb(20, .4))})`; g.fillRect(0, 0, W, H);
      slam('ASTUCE', CX, 360, 150, K.yel, 20, { de: 2.4 }); revele('DÉPOSE JUSTE AVANT LE 15 OU LA FIN DU MOIS.', CX, 560, 50, K.paper, 22); revele('RETIRE JUSTE APRÈS.', CX, 650, 50, K.mint, 24); }
  } };

// ============ 05 · OÙ VA TON ARGENT : la ville isométrique ============
const IMM = [[3.2, -3.4, 1.6, 1.6, 4.6, 10, 'LOGEMENT SOCIAL'], [5.4, -1.6, 1.4, 1.4, 3.2, 12, 'RÉNOVATION'], [5.4, .6, 1.8, 1.4, 2.4, 14, 'COLLECTIVITÉS'], [3.4, 3.4, 2.2, 1.6, 1.6, 19, 'PME']];
const S_ARGENT = { id: 'argent', label: '04 / OÙ VA TON ARGENT ?', barres: 8, bg: K.ink, sortie: 'slab', next: K.ink,
  sons: [[0, 'impact', 1], [4, 'flux', 1], [6, 'pop', .8], [10, 'batir', .9], [12, 'batir', .9], [14, 'batir', .9], [16, 'flux', .8], [19, 'batir', .9], [24, 'impact', 1]],
  chocs: [0, 24],
  draw() {
    fond(K.ink); const gr = g.createRadialGradient(CX, 700, 50, CX, 700, 1000); gr.addColorStop(0, '#12254A'); gr.addColorStop(1, K.ink); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    slam('OÙ VA TON ARGENT ?', CX, 110, 80, K.paper, 0);
    // sol isométrique
    ISO.x = CX + 60; ISO.y = 560; ISO.s = 70;
    g.strokeStyle = 'rgba(0,229,160,.12)'; g.lineWidth = 2; for (let i = -6; i <= 8; i++) { let [a, b] = iso(i, -6, 0), [c, d] = iso(i, 8, 0); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); [a, b] = iso(-6, i, 0); [c, d] = iso(8, i, 0); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    // la Caisse des dépôts (au centre) et les banques
    const hC = 3.4 * el(kb(6, .9)); boite(-.9, -.9, 1.8, 1.8, hC, '#F7D35E', '#C99A1C', '#E6B634');
    const hB = 2.2 * el(kb(16, .9)); boite(-.6, 3.6, 1.4, 1.4, hB, '#8FA8FF', '#3D5AFE', '#6580FF');
    IMM.forEach(([x, y, w, d, h, n, lab], i) => {
      const k = el(P(U, B(n), 1)); if (k <= 0) return; const hh = h * k, c = i === 3 ? ['#9FF5D8', '#00B383', '#00E5A0'] : ['#F4F1EA', '#9EA2B5', '#C9CCD8'];
      boite(x, y, w, d, hh, ...c);
      // fenêtres qui s'allument
      const r = rng(i + 5); for (let f = 0; f < Math.floor(hh * 3); f++) { if (P(U, B(n) + .6 + f * .05, .2) <= 0) continue; const zz = .3 + f * .33; if (zz > hh - .2) break; for (let q = 0; q < 3; q++) { const [a, b] = iso(x + w, y + .25 + q * (d - .5) / 2, zz); g.fillStyle = r() > .3 ? '#FFD23F' : 'rgba(255,210,63,.3)'; g.fillRect(a - 8, b - 6, 12, 10); } }
      const [lx, ly] = iso(x + w / 2, y + d / 2, hh + .6); pill(lab, lx, ly - 30, i === 3 ? K.mint : K.paper, 22, K.ink, n + 1);
    });
    const [cxC, cyC] = iso(0, 0, hC + .5); if (on(6.5)) pill('CAISSE DES DÉPÔTS', cxC, cyC - 30, K.yel, 24, K.ink, 6.5);
    const [cxB, cyB] = iso(.1, 4.3, hB + .5); if (on(16.5)) pill('TA BANQUE', cxB, cyB - 30, K.blue, 22, K.paper, 16.5);
    // flux de pièces : de la carte vers la Caisse, puis vers les immeubles
    g.save(); g.translate(250, 780); g.scale(.36, .36); carteLivret(0, 0, 1); g.restore();
    const flux = (x0, y0, x1, y1, n, c, nb = 14) => { if (!on(n)) return; const k = eo(P(U, B(n), .6)); g.save(); g.strokeStyle = c + '44'; g.lineWidth = 5; g.setLineDash([12, 12]); g.lineDashOffset = -U * 60; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 160, lerp(x0, x1, k), lerp(y0, y1, k)); g.stroke(); g.restore();
      if (k < 1) return; for (let i = 0; i < nb; i++) { const v = frac(U * .5 + i / nb), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 160, x = (1 - v) * (1 - v) * x0 + 2 * v * (1 - v) * mx + v * v * x1, y = (1 - v) * (1 - v) * y0 + 2 * v * (1 - v) * my + v * v * y1; piece(x, y, 14, U * 6 + i, 1); } };
    flux(330, 740, cxC, cyC + 60, 4, '#F2B632');
    IMM.slice(0, 3).forEach(([x, y, w, d, h, n]) => { const [a, b] = iso(x + w / 2, y + d / 2, h * .5); flux(cxC + 20, cyC + 80, a, b, n - .5, '#F4F1EA', 8); });
    flux(330, 760, cxB, cyB + 40, 16, '#3D5AFE', 10);
    { const [x, y, w, d, h, n] = IMM[3]; const [a, b] = iso(x + w / 2, y + d / 2, h * .5); flux(cxB + 20, cyB + 60, a, b, n - .5, '#00E5A0', 8); }
    if (on(24)) { g.fillStyle = `rgba(11,11,15,${.8 * eo(kb(24, .3))})`; g.fillRect(0, 0, W, H); slam('TON ÉPARGNE TRAVAILLE.', CX, CY, 110, K.mint, 24, { chroma: true }); }
  } };
