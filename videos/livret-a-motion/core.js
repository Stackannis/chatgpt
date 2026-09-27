// LIVRET A — édition motion design. Boîte à outils commune. render(t) déterministe.
const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
const K = { ink: '#0B0B0F', paper: '#F4F1EA', red: '#FF3D2E', yel: '#FFD23F', blue: '#3D5AFE', mint: '#00E5A0', night: '#0D0A1A', gold: '#F2B632', grey: '#7C7F8C', deep: '#12163A' };
const COLS = [K.red, K.blue, K.mint, K.yel];
const FD = '"Unbounded"', FM = '"JetBrains Mono"';
const BEAT = .5;
let g;

// garde-fou : un rayon négatif minuscule (arrondi flottant) ne doit jamais planter le rendu
(() => { const C = CanvasRenderingContext2D.prototype, arc = C.arc, ell = C.ellipse;
  C.arc = function (x, y, r, ...a) { return arc.call(this, x, y, Math.max(0, r || 0), ...a); };
  C.ellipse = function (x, y, rx, ry, ...a) { return ell.call(this, x, y, Math.max(0, rx || 0), Math.max(0, ry || 0), ...a); }; })();

// ---------- maths ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const P = (t, a, d) => clamp((t - a) / d);
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const xo = x => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const xi = x => { x = clamp(x); return x <= 0 ? 0 : Math.pow(2, 10 * x - 10); };
const bo = (x, s = 1.9) => { x = clamp(x); const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const el = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * 2 * Math.PI / 3) + 1; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const frac = x => x - Math.floor(x);
const fmt = (n, d = 0) => { const s = Math.abs(n).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (n < 0 ? '−' : '') + s.join(','); };

// ---------- temps local d'une séquence : u (secondes), b(n) = n temps ----------
let U = 0;                                   // temps local courant (fixé par le montage)
const B = n => n * BEAT;
const kb = (n, d = .45) => P(U, B(n), d);   // progression à partir du temps n
const on = n => U >= B(n);

// ---------- dessin de base ----------
function font(size, fam = FD, w = 900) { g.font = `${w} ${size}px ${fam}`; }
function circle(x, y, r, c) { if (r <= 0) return; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }
function ring(x, y, r, w, c, a0 = 0, a1 = Math.PI * 2) { if (r <= 0) return; g.beginPath(); g.arc(x, y, r, a0, a1); g.lineWidth = w; g.strokeStyle = c; g.stroke(); }
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function fond(c) { g.fillStyle = c; g.fillRect(-60, -60, W + 120, H + 120); }
function T(s, x, y, size, c, o = {}) {
  g.save(); font(size, o.mono ? FM : FD, o.w || (o.mono ? 700 : 900)); g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  g.letterSpacing = (o.esp || 0) + 'px'; g.globalAlpha *= (o.a ?? 1);
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 40; }
  if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = c; g.lineJoin = 'round'; g.strokeText(s, x, y); } else { g.fillStyle = c; g.fillText(s, x, y); }
  g.restore();
}
function larg(s, size, mono = false, w) { g.save(); font(size, mono ? FM : FD, w || (mono ? 700 : 900)); const v = g.measureText(s).width; g.restore(); return v; }
function lettres(s, size, esp = 0) {
  g.save(); font(size); const ws = [...s].map(c => g.measureText(c).width); g.restore();
  const tot = ws.reduce((a, b) => a + b, 0) + esp * (s.length - 1); let x = -tot / 2;
  return [...s].map((c, i) => { const o = { c, x: x + ws[i] / 2, w: ws[i] }; x += ws[i] + esp; return o; });
}
function avec(a, fn) { if (a <= .001) return; g.save(); g.globalAlpha *= Math.min(1, a); fn(); g.restore(); }
function chroma(d, fn) {
  if (d < .5) { fn(null); return; }
  g.save(); g.globalCompositeOperation = 'lighter';
  [['#FF0040', -d], ['#00FF60', 0], ['#2040FF', d]].forEach(([c, dx]) => { g.save(); g.translate(dx, 0); fn(c); g.restore(); });
  g.restore();
}
// ---- typographie cinétique ----
function revele(s, x, y, size, c, n, o = {}) {       // lettres qui montent derrière un cache
  const L = lettres(s, size, o.esp || 0), st = o.st ?? .035;
  g.save(); g.beginPath(); g.rect(x - W, y - size * .62, W * 2, size * 1.2); g.clip();
  L.forEach((l, i) => { const k = xo(P(U, B(n) + i * st, .55)); if (k > 0) T(l.c, x + l.x, y + (1 - k) * size * 1.15, size, c, o); });
  g.restore();
}
function slam(s, x, y, size, c, n, o = {}) {           // impact : grossit puis se pose, aberration sur fond sombre
  const k = P(U, B(n), .3); if (k <= 0) return;
  const sc = lerp(o.de ?? 1.8, 1, xo(k)), d = o.chroma ? 34 * (1 - eo(P(U, B(n), .4))) : 0;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.globalAlpha *= clamp(k * 5);
  if (d > .5) chroma(d, cc => T(s, 0, 0, size, cc, o)); else T(s, 0, 0, size, c, o);
  g.restore();
}
function tape(s, x, y, size, c, n, dur = .6, o = {}) {  // machine à écrire (mono)
  const k = P(U, B(n), dur); if (k <= 0) return; const m = Math.round(s.length * k);
  const cur = k < 1 && Math.floor(U * 8) % 2 ? '▌' : '';
  T(s.slice(0, m) + cur, x, y, size, c, { mono: true, esp: o.esp ?? 4, align: o.align, a: o.a });
}
function elastique(s, x, y, size, c, n, o = {}) {
  const L = lettres(s, size, o.esp || 0);
  L.forEach((l, i) => { const k = el(P(U, B(n) + i * .045, .7)); if (P(U, B(n) + i * .045, .01) <= 0) return; const sq = 1 + .25 * Math.sin(Math.PI * P(U, B(n) + i * .045, .18));
    g.save(); g.translate(x + l.x, y + (1 - k) * 380); g.scale(1 / sq, sq); T(l.c, 0, 0, size, c, o); g.restore(); });
}
function pill(s, x, y, c, size = 30, fc = K.ink, n = null) {
  const k = n === null ? 1 : bo(P(U, B(n), .4)); if (k <= 0) return;
  const w = larg(s, size, true, 800) + size * 1.3, h = size * 1.9;
  g.save(); g.translate(x, y); g.scale(k, k); rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = c; g.fill(); T(s, 0, 2, size, fc, { mono: true, w: 800 }); g.restore();
}
function pop(n, x, y, fn, d = .45, s0 = 0) { const k = P(U, B(n), d); if (k <= 0) return; g.save(); g.translate(x, y); const s = lerp(s0, 1, bo(k)); g.scale(s, s); g.globalAlpha *= clamp(k * 4); fn(); g.restore(); }
function glisse(n, x, y, dx, dy, fn, d = .5) { const k = P(U, B(n), d); if (k <= 0) return; const e = xo(k); g.save(); g.translate(x + dx * (1 - e), y + dy * (1 - e)); g.globalAlpha *= clamp(k * 3); fn(); g.restore(); }
function hors(n, fn, d = .3) { const k = 1 - P(U, B(n), d); if (k <= 0) return; g.save(); g.globalAlpha *= k; g.translate(0, (1 - k) * -30); fn(); g.restore(); }
function fleche(x1, y1, x2, y2, c, lw = 8, k = 1) {
  const x = lerp(x1, x2, k), y = lerp(y1, y2, k); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x, y); g.stroke(); const a = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath(); g.moveTo(x + Math.cos(a) * lw * 1.4, y + Math.sin(a) * lw * 1.4); g.lineTo(x + Math.cos(a + 2.5) * lw * 3.6, y + Math.sin(a + 2.5) * lw * 3.6); g.lineTo(x + Math.cos(a - 2.5) * lw * 3.6, y + Math.sin(a - 2.5) * lw * 3.6); g.fill();
}
// ---- compteur à rouleaux ----
function odo(v, x, y, size, c, o = {}) {
  const pre = o.pre || '', suf = o.suf || '', ent = Math.max(0, v), s = fmt(Math.floor(ent));
  g.save(); font(size); g.textBaseline = 'middle'; g.fillStyle = c; if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 40; }
  const cw = g.measureText('0').width, sp = g.measureText(' ').width, chars = [...s];
  let tot = g.measureText(pre).width + g.measureText(suf).width; chars.forEach(ch => tot += ch === ' ' ? sp : cw);
  let cx = x - (o.align === 'left' ? 0 : tot / 2); g.textAlign = 'left'; g.fillText(pre, cx, y); cx += g.measureText(pre).width;
  let p = chars.filter(ch => ch !== ' ').length - 1;
  g.save(); g.beginPath(); g.rect(cx - 6, y - size * .62, tot + 12, size * 1.24); g.clip();
  for (const ch of chars) {
    if (ch === ' ') { cx += sp; continue; }
    const col = ent / Math.pow(10, p), d = Math.floor(col) % 10, fr = p === 0 ? col % 1 : clamp(((col % 1) - .9) * 10), off = fr * size * 1.1;
    g.textAlign = 'center'; g.fillText(String(d), cx + cw / 2, y - off); g.fillText(String((d + 1) % 10), cx + cw / 2, y - off + size * 1.1); g.textAlign = 'left'; cx += cw; p--;
  }
  g.restore(); g.fillText(suf, cx, y); g.restore();
}
// ---- pièce en 3D : face, tranche, rotation, flou de mouvement ----
function piece(x, y, r, rot, a = 1, tilt = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), w = Math.max(.08, Math.abs(c)), ep = r * .16 * s;
  g.save(); g.translate(x, y); g.rotate(tilt); g.globalAlpha *= a;
  g.beginPath(); g.ellipse(ep, 0, r * w, r, 0, 0, 7); g.fillStyle = '#B07A12'; g.fill();          // tranche
  g.fillRect(Math.min(0, ep), -r, Math.abs(ep), 2 * r);
  const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#FFF0B0'); gr.addColorStop(.45, '#F7C948'); gr.addColorStop(1, '#C9921A');
  g.beginPath(); g.ellipse(0, 0, r * w, r, 0, 0, 7); g.fillStyle = gr; g.fill();
  g.beginPath(); g.ellipse(0, 0, r * w * .78, r * .78, 0, 0, 7); g.strokeStyle = 'rgba(140,90,0,.55)'; g.lineWidth = r * .07; g.stroke();
  if (w > .25) { g.save(); g.scale(w * (c < 0 ? -1 : 1), 1); T('€', 0, r * .06, r * 1.1, 'rgba(120,75,0,.85)'); g.restore(); }
  const sh = g.createLinearGradient(-r * w, -r, r * w, r); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(.4, 'rgba(255,255,255,0)'); g.beginPath(); g.ellipse(0, 0, r * w, r, 0, 0, 7); g.fillStyle = sh; g.fill();
  g.restore();
}
// ---- icônes au trait ----
function icone(nom, x, y, s, c = K.paper, lw = 6) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw / s; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  const I = {
    horloge: () => { g.arc(0, 0, 40, 0, 7); g.moveTo(0, 0); g.lineTo(0, -26); g.moveTo(0, 0); g.lineTo(18, 8); },
    bouclier: () => { g.moveTo(0, -44); g.quadraticCurveTo(30, -34, 40, -34); g.quadraticCurveTo(42, 20, 0, 46); g.quadraticCurveTo(-42, 20, -40, -34); g.quadraticCurveTo(-30, -34, 0, -44); g.moveTo(-16, 2); g.lineTo(-3, 15); g.lineTo(18, -12); },
    coffre: () => { g.rect(-40, -34, 80, 68); g.moveTo(22, 0); g.arc(12, 0, 10, 0, 7); },
    personne: () => { g.arc(0, -20, 16, 0, 7); g.moveTo(-28, 38); g.quadraticCurveTo(-28, 4, 0, 4); g.quadraticCurveTo(28, 4, 28, 38); },
    banque: () => { g.moveTo(-44, -14); g.lineTo(0, -42); g.lineTo(44, -14); g.closePath(); for (let i = 0; i < 4; i++) { g.moveTo(-30 + i * 20, -8); g.lineTo(-30 + i * 20, 26); } g.moveTo(-44, 34); g.lineTo(44, 34); },
    voiture: () => { g.moveTo(-44, 16); g.lineTo(-44, -2); g.lineTo(-26, -6); g.lineTo(-14, -26); g.lineTo(18, -26); g.lineTo(30, -6); g.lineTo(44, -2); g.lineTo(44, 16); g.closePath(); g.moveTo(-18, 24); g.arc(-24, 24, 8, 0, 7); g.moveTo(30, 24); g.arc(24, 24, 8, 0, 7); },
    machine: () => { g.rect(-34, -40, 68, 80); g.moveTo(18, 8); g.arc(0, 8, 18, 0, 7); g.moveTo(-22, -28); g.lineTo(0, -28); },
    malette: () => { g.rect(-42, -20, 84, 56); g.moveTo(-14, -20); g.lineTo(-14, -34); g.lineTo(14, -34); g.lineTo(14, -20); g.moveTo(-42, 4); g.lineTo(42, 4); },
    pain: () => { g.moveTo(-44, 10); g.quadraticCurveTo(-44, -30, 0, -30); g.quadraticCurveTo(44, -30, 44, 10); g.lineTo(44, 24); g.lineTo(-44, 24); g.closePath(); g.moveTo(-20, -10); g.lineTo(-10, -22); g.moveTo(2, -10); g.lineTo(12, -22); },
    maison: () => { g.moveTo(-40, -4); g.lineTo(0, -40); g.lineTo(40, -4); g.moveTo(-30, -12); g.lineTo(-30, 38); g.lineTo(30, 38); g.lineTo(30, -12); g.moveTo(-8, 38); g.lineTo(-8, 14); g.lineTo(8, 14); g.lineTo(8, 38); },
    ticket: () => { g.moveTo(-44, -24); g.lineTo(44, -24); g.lineTo(44, -8); g.arc(44, 0, 8, -Math.PI / 2, Math.PI / 2, true); g.lineTo(44, 24); g.lineTo(-44, 24); g.lineTo(-44, 8); g.arc(-44, 0, 8, Math.PI / 2, -Math.PI / 2, true); g.closePath(); g.moveTo(-12, -24); g.lineTo(-12, 24); },
    marteau: () => { g.rect(-34, -34, 44, 22); g.moveTo(-12, -12); g.lineTo(24, 30); g.moveTo(-40, 42); g.lineTo(40, 42); },
  };
  I[nom](); g.stroke(); g.restore();
}
// ---- isométrique ----
const ISO = { x: CX, y: 640, s: 60 };
function iso(x, y, z) { return [ISO.x + (x - y) * .866 * ISO.s, ISO.y + (x + y) * .5 * ISO.s - z * ISO.s]; }
function boite(x, y, w, d, h, cT, cL, cR) {
  if (h <= 0) return; const p = (a, b, c) => iso(a, b, c);
  const poly = (pts, c) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = c; g.fill(); };
  poly([p(x, y + d, 0), p(x + w, y + d, 0), p(x + w, y + d, h), p(x, y + d, h)], cL);
  poly([p(x + w, y, 0), p(x + w, y + d, 0), p(x + w, y + d, h), p(x + w, y, h)], cR);
  poly([p(x, y, h), p(x + w, y, h), p(x + w, y + d, h), p(x, y + d, h)], cT);
}
// ---- particules : cibles de texte ----
const NP = 1700;
function cibleTexte(s, size, seed = 1) {
  const c = document.createElement('canvas'); c.width = 1800; c.height = 500; const q = c.getContext('2d');
  q.font = `900 ${size}px ${FD}`; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillStyle = '#fff'; q.fillText(s, 900, 250);
  const d = q.getImageData(0, 0, 1800, 500).data, pts = [];
  for (let y = 0; y < 500; y += 5) for (let x = 0; x < 1800; x += 5) if (d[(y * 1800 + x) * 4 + 3] > 128) pts.push([(x - 900) / 320, (y - 250) / 320, 0]);
  const r = rng(seed), out = []; for (let i = 0; i < NP; i++) { const p = pts[Math.floor(r() * pts.length)] || [0, 0, 0]; out.push([p[0] + (r() - .5) * .012, p[1] + (r() - .5) * .012, (r() - .5) * .08]); }
  return out;
}
function cibleSphere(R = 1.15) { const o = []; for (let i = 0; i < NP; i++) { const y = 1 - 2 * (i + .5) / NP, r = Math.sqrt(1 - y * y), th = i * 2.399963; o.push([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R]); } return o; }
function ciblePiece() { const o = [], r = rng(4); for (let i = 0; i < NP; i++) { const a = r() * 7, d = Math.sqrt(r()); const bord = i % 3 === 0; o.push([Math.cos(a) * (bord ? 1.1 : d * .95), Math.sin(a) * (bord ? 1.1 : d * .95), (r() - .5) * .1]); } return o; }
// ---- givre ----
function givre(x, y, taille, k, seed) {
  const r = rng(seed); g.save(); g.translate(x, y); g.strokeStyle = 'rgba(220,240,255,.85)'; g.lineCap = 'round';
  const branche = (len, ep, prof) => { if (prof > 3 || len < 4) return; g.lineWidth = ep; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len); g.stroke();
    for (let i = 1; i <= 3; i++) { g.save(); g.translate(0, -len * i / 4); g.rotate(.9); branche(len * .38, ep * .7, prof + 1); g.restore(); g.save(); g.translate(0, -len * i / 4); g.rotate(-.9); branche(len * .38, ep * .7, prof + 1); g.restore(); } };
  g.rotate(r() * 3); for (let b = 0; b < 6; b++) { g.save(); g.rotate(b * Math.PI / 3); branche(taille * k, 3, 0); g.restore(); }
  g.restore();
}
// ---- icônes de données ----
const TAUX = [["2005-08", 2.0], ["2006-02", 2.25], ["2006-08", 2.75], ["2007-08", 3.0], ["2008-02", 3.5], ["2008-08", 4.0], ["2009-02", 2.5], ["2009-05", 1.75], ["2009-08", 1.25], ["2010-08", 1.75], ["2011-02", 2.0], ["2011-08", 2.25], ["2013-02", 1.75], ["2013-08", 1.25], ["2014-08", 1.0], ["2015-08", .75], ["2020-02", .5], ["2022-02", 1.0], ["2022-08", 2.0], ["2023-02", 3.0], ["2025-02", 2.4], ["2025-08", 1.7]];
const INF = { 2006: 1.6, 2007: 1.5, 2008: 2.8, 2009: .1, 2010: 1.5, 2011: 2.1, 2012: 2.0, 2013: .9, 2014: .5, 2015: 0, 2016: .2, 2017: 1.0, 2018: 1.85, 2019: 1.1, 2020: .5, 2021: 1.64, 2022: 5.2, 2023: 4.9, 2024: 2.0, 2025: .9 };
const taux = (a, m) => { const k = `${a}-${String(m).padStart(2, '0')}`; let r = 0; for (const [d, v] of TAUX) if (d <= k) r = v; return r; };
const tauxMoyen = a => { let s = 0; for (let m = 1; m <= 12; m++) s += taux(a, m); return s / 12; };
const NOMINAL = [10000]; { let c = 10000; for (let a = 2006; a <= 2025; a++) { c *= 1 + tauxMoyen(a) / 100; NOMINAL.push(c); } }
const PERF = [7, -2, -38, 26, 20, -2, 14, 21, 19, 10, 11, 7.5, -4, 30, 6, 31, -13, 19.6, 26.6, 6.8];
const BOURSE = (() => { let c = 10000; const v = [c]; PERF.forEach(p => { c *= 1 + p / 100; v.push(c); }); const k = 51000 / v.at(-1); return v.map((x, i) => i ? x * Math.pow(k, i / 20) : x); })();
