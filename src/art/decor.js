// SUNFOX — decor: non-interactive scenery for Emerald Coast.
// Everything is authored on small indexed pixel buffers with deliberate, integer-only
// drawing (no anti-aliasing), light from the upper-left, dark local-colour outlines.
G.defineArt('decor', G => {
  'use strict';
  const P = G.PAL;
  const GR = P.green, BR = P.brown, ST = P.stone, BL = P.blue, OR = P.orange, RD = P.red,
    GO = P.gold, PK = P.pink, TE = P.teal, PU = P.purple, W = P.white;

  // ---------------------------------------------------------------- buffers
  function B(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function S(b, x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < b.w && y < b.h) b.d[y * b.w + x] = c;
  }
  function Gt(b, x, y) { return x >= 0 && y >= 0 && x < b.w && y < b.h ? b.d[y * b.w + x] : null; }
  function rect(b, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) S(b, x + i, y + j, c); }
  function out(b) {
    const c = G.cv(b.w, b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const v = b.d[y * b.w + x];
      if (v) { c.ctx.fillStyle = v; c.ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function clone(b) { return { w: b.w, h: b.h, d: b.d.slice() }; }
  function blit(dst, src, ox, oy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.d[y * src.w + x]; if (v) S(dst, x + ox, y + oy, v);
    }
  }
  // stamp rows of palette chars ('.'/' ' transparent)
  function stamp(b, rows, pal, ox, oy, flip) {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[flip ? r.length - 1 - x : x];
        if (ch === '.' || ch === ' ') continue;
        if (!pal[ch]) throw new Error('decor stamp: unknown char ' + ch);
        S(b, ox + x, oy + y, pal[ch]);
      }
    }
  }
  function line(b, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx - dy;
    for (;;) {
      S(b, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 > -dy) { e -= dy; x0 += sx; }
      if (e2 < dx) { e += dx; y0 += sy; }
    }
  }
  function poly(b, pts, c) {
    let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
    pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); });
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5; let ins = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], q = pts[j];
        if ((a[1] > py) !== (q[1] > py) && px < (q[0] - a[0]) * (py - a[1]) / (q[1] - a[1]) + a[0]) ins = !ins;
      }
      if (ins) S(b, x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }

  // Outline families: colour -> [dark outline, lit-side outline]
  const FAM = {};
  function fam(ramp, d, l) { ramp.forEach(c => { FAM[c] = [d, l]; }); }
  fam(GR, GR[0], GR[1]); fam(BR, BR[0], BR[1]); fam(ST, ST[0], ST[1]); fam(BL, BL[1], BL[2]);
  fam(OR, OR[0], OR[1]); fam(RD, RD[0], RD[1]); fam(GO, GO[0], OR[1]); fam(PK, RD[0], PK[0]);
  fam(TE, TE[0], TE[1]); fam(PU, PU[0], PU[1]); FAM[W] = [ST[1], ST[2]];
  // Expand the silhouette by 1px with a dark local colour (selout: lighter on the lit top/left side).
  function outline(b, opt) {
    opt = opt || {};
    const src = b.d.slice(), g = (x, y) => (x >= 0 && y >= 0 && x < b.w && y < b.h ? src[y * b.w + x] : null);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (g(x, y)) continue;
      const dn = g(x, y + 1), rt = g(x + 1, y), up = g(x, y - 1), lf = g(x - 1, y);
      const n = dn || rt || up || lf; if (!n) continue;
      const f = (opt.fam && opt.fam[n]) || FAM[n] || [P.ink, P.ink];
      const lit = !up && !lf && !opt.flat;
      b.d[y * b.w + x] = lit ? f[1] : f[0];
    }
    return b;
  }

  // paint something on its own layer, give it its own dark rim, then composite (crisp overlaps)
  function layer(b, fn, opt) { const t = B(b.w, b.h); fn(t); outline(t, opt); blit(b, t, 0, 0); }

  // --------------------------------------------------------------- foliage
  const LEAF = [
    [GR[0], GR[0], GR[1], GR[2]], // shaded side
    [GR[0], GR[1], GR[2], GR[3]], // mid
    [GR[1], GR[2], GR[3], GR[4]], // sunlit
  ];
  // A leaf clump: ball with crescent bands, light core pushed to the upper-left.
  function puff(b, cx, cy, rx, ry, ramp) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const d = Math.hypot(dx + 0.36, dy + 0.46);
      S(b, x, y, ramp[d < 0.36 ? 3 : d < 0.84 ? 2 : d < 1.22 ? 1 : 0]);
    }
  }
  // Leaf mass: big clusters (form) built from small scalloped leaf lobes (texture).
  // clusters = [x, y, rx, ry], painted back (first) to front (last).
  const G6 = ['#0a2a2e', GR[0], GR[1], GR[2], GR[3], GR[4]];
  function lobe(b, cx, cy, tone, r) {
    const rx = r || 3.2, ry = rx * 0.9;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const rim = Math.hypot(dx - 0.34, dy - 0.44), sh = Math.hypot(dx + 0.34, dy + 0.44);
      const t = rim > 0.98 ? tone + 1 : sh > 1.2 ? tone - 1 : tone;
      S(b, x, y, G6[Math.max(0, Math.min(5, t))]);
    }
  }
  function leafMass(b, clusters, C, seed, o) {
    o = o || {};
    let sd = seed || 1;
    const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    clusters.forEach(cl => {
      const [cx, cy, rx] = cl, ry = cl[3] || rx;
      const gb = -(((cx - C[0]) / C[2]) * 0.5 + ((cy - C[1]) / C[3]) * 0.75) * 0.55 + (o.bias || 0) + (cl[4] || 0);
      const lobes = [];
      const sy = o.sy || 3, sx = o.sx || 4;
      let row = 0;
      for (let gy = -ry; gy <= ry + 0.01; gy += sy, row++) for (let gx = -rx + (row & 1 ? sx / 2 : 0); gx <= rx + 0.01; gx += sx) {
        const lx = gx + (rnd() - 0.5) * 1.4, ly = gy + (rnd() - 0.5) * 1.0;
        const e = (lx / rx) * (lx / rx) + (ly / ry) * (ly / ry);
        if (e > 0.94) continue;
        const lit = -(lx / rx * 0.6 + ly / ry * 0.8);
        const v = lit * 0.8 + gb;
        lobes.push([cx + lx, cy + ly, v > 0.5 ? 4 : v > 0.08 ? 3 : v > -0.42 ? 2 : 1]);
      }
      // dark core so there are no holes between lobes
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 0.8) S(b, x, y, G6[1]);
      }
      lobes.forEach(l => lobe(b, l[0], l[1], l[2], o.r));
    });
  }
  // Feathered frond along a quadratic bezier. Leaflets hang from the spine as slanted saw-teeth.
  function frond(b, p0, p1, p2, o) {
    const pts = []; let last = null;
    for (let i = 0; i <= 600; i++) {
      const t = i / 600, u = 1 - t;
      const x = u * u * p0[0] + 2 * t * u * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * t * u * p1[1] + t * t * p2[1];
      const xi = Math.round(x), yi = Math.round(y);
      if (!last || xi !== last[0] || yi !== last[1]) {
        let tx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
        const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        last = [xi, yi, tx, ty]; pts.push(last);
      }
    }
    const n = pts.length, per = o.per || 5, c = o.cols;
    const sideLo = o.side || 0;
    const FAC = per >= 5 ? [1, 0.86, 0.64, 0.4, 0.14] : per === 4 ? [1, 0.78, 0.48, 0.14] : [1, 0.6, 0.15];
    function leaflets(up) {
      const CC = up ? [c.a, c.a, c.m, c.m, c.b] : per >= 5 ? [c.a, c.m, c.m, c.b, c.b] : per === 4 ? [c.a, c.m, c.b, c.b] : [c.a, c.m, c.b];
      for (let i0 = (o.phase || 0) % per; i0 < n; i0 += per) {
        const [, , tx, ty] = pts[i0], s = i0 / (n - 1);
        let nx = -ty, ny = tx; // normal
        if (sideLo ? sideLo * nx < 0 : ny < 0) { nx = -nx; ny = -ny; } // lower / chosen side
        if (up) { nx = -nx; ny = -ny; }
        const g = up ? (o.gravUp || 0) : (o.grav == null ? 0.55 : o.grav), ln = o.lean == null ? 0.45 : o.lean;
        let dx = nx * (1 - g) + tx * ln, dy = ny * (1 - g) + g + ty * ln;
        const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, (o.e0 == null ? 0.03 : o.e0) + Math.pow(s, 0.8) * 0.93)), o.pow || 0.7);
        for (let q = 0; q < per && i0 + q < n; q++) {
          const len = Math.round((up ? o.lenUp || 0 : o.len) * env * FAC[q]);
          for (let k = 1; k <= len; k++) S(b, pts[i0 + q][0] + dx * k, pts[i0 + q][1] + dy * k, CC[q]);
        }
      }
    }
    leaflets(false);
    if (o.lenUp) leaflets(true);
    for (let i = 0; i < n; i++) S(b, pts[i][0], pts[i][1], i > n * 0.8 ? c.a : c.spine);
  }
  const FR_FRONT = { spine: GR[4], a: GR[3], m: GR[2], b: GR[1] };
  const FR_MID = { spine: GR[3], a: GR[3], m: GR[2], b: GR[1] };
  const FR_BACK = { spine: GR[2], a: GR[2], m: GR[1], b: GR[0] };

  // grass blade / stem: quadratic lean, 2px at the base tapering to 1px
  function blade(b, x0, y0, h, lean, cl, cd, w) {
    for (let i = 0; i < h; i++) {
      const t = i / h, x = Math.round(x0 + lean * t * t), y = y0 - i;
      if ((w || 2) >= 2 && t < 0.6) { S(b, x, y, cl); S(b, x + 1, y, cd); } else S(b, x + (lean > 0 && (w || 2) >= 2 ? 1 : 0), y, t > 0.8 ? cl : cl);
    }
  }

  // ----------------------------------------------------------------- stone
  // Bump-map renderer: rows of height chars (' '/'.' empty, 'o' recess, '#' base, '+' raised, '*' higher).
  const HV = { o: 0, '#': 1, '+': 2, '*': 3 };
  function mirrorRows(rows) { return rows.map(r => r + r.split('').reverse().join('')); }
  function stone(b, rows, ox, oy, opt) {
    opt = opt || {};
    const h = (x, y) => { const r = rows[y]; if (!r) return -1; const v = HV[r[x]]; return v == null ? -1 : v; };
    const wd = rows[0].length;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < wd; x++) {
      const v = h(x, y); if (v < 0) continue;
      const l = h(x - 1, y), u = h(x, y - 1), r = h(x + 1, y), d = h(x, y + 1);
      let t = v === 0 ? 1 : 2;
      const litE = (l < v && l >= -1) || (u < v), shE = (r < v) || (d < v), inSh = (l > v) || (u > v);
      if (inSh) t -= 1; else if (litE && !shE) t += 1; else if (shE && !litE) t -= 1;
      if (v >= 2 && litE && u < v && l < v) t = 4; // sparkling raised corner
      if (opt.shadeFrom != null && x >= opt.shadeFrom && t > 1) t -= 1; // cylinder falloff on the right
      if (opt.lightTo != null && x <= opt.lightTo && v > 0 && t < 3 && !inSh && !shE) t += 1;
      S(b, ox + x, oy + y, ST[Math.max(0, Math.min(4, t))]);
    }
  }
  // moss lying on a top surface: list of [x, y, thickness] columns
  function moss(b, x0, y, pattern, cols) {
    cols = cols || [GR[3], GR[2], GR[1]];
    for (let i = 0; i < pattern.length; i++) {
      const th = pattern[i];
      for (let k = 0; k < th; k++) S(b, x0 + i, y + k, k === 0 ? cols[0] : k === th - 1 && th > 2 ? cols[2] : cols[1]);
    }
  }

  const LEAFP = { a: GR[0], b: GR[1], c: GR[2], d: GR[3], e: GR[4] };

  // =================================================================== PALM
  function makePalm() {
    const b = B(64, 96);
    const crown = [35, 29];
    const fr = (p1, p2, o) => layer(b, t => frond(t, crown, p1, p2, o));
    // back fronds (shaded)
    fr([45, 30], [50, 57], { len: 7, cols: FR_BACK, grav: 0.5, lenUp: 2 });
    fr([25, 30], [20, 56], { len: 7, cols: FR_BACK, grav: 0.5, lenUp: 2, phase: 2 });
    fr([40, 8], [52, 3], { len: 7, cols: FR_MID, lenUp: 3 });
    fr([31, 8], [19, 3], { len: 7, cols: FR_MID, lenUp: 3, phase: 3 });
    // trunk
    const cxAt = y => 26 + 9 * Math.pow((95 - y) / 66, 1.7);
    for (let y = 95; y >= 29; y--) {
      const t = (95 - y) / 66, seg = (95 - y) % 6;
      let hw = 3.6 - 1.2 * t + (y > 90 ? (y - 90) * 0.5 : 0);
      const cx = cxAt(y - seg + 2); // each ring is a straight cup, stepping along the curve
      let xa = Math.round(cx - hw), xb = Math.round(cx + hw);
      if (seg === 5) { xa -= 1; xb += 1; } // lip of each ring
      for (let x = xa; x <= xb; x++) {
        const f = (x - xa) / Math.max(1, xb - xa);
        let c = f < 0.18 ? BR[4] : f < 0.5 ? BR[3] : f < 0.82 ? BR[2] : BR[1];
        if (seg === 0) c = f < 0.5 ? BR[2] : BR[1]; // shadow under the lip
        if (seg === 5 && f < 0.6) c = f < 0.3 ? BR[5] : BR[4];
        S(b, x, y, c);
      }
    }
    // coconuts
    const nut = ['.kk.', 'knmk', 'kmmk', '.kk.'], NP = { k: BR[0], n: BR[3], m: BR[1] };
    stamp(b, nut, NP, 30, 30); stamp(b, nut, NP, 36, 31); stamp(b, nut, NP, 33, 33);
    // front fronds
    fr([19, 20], [4, 46], { len: 9, cols: FR_FRONT, lenUp: 3 });
    fr([52, 20], [60, 48], { len: 9, cols: FR_FRONT, lenUp: 3, phase: 1 });
    fr([23, 1], [3, 22], { len: 9, cols: FR_FRONT, lenUp: 3, phase: 2 });
    fr([48, 1], [61, 23], { len: 9, cols: FR_FRONT, lenUp: 3 });
    // crown heart
    stamp(b, ['.dd.', 'dedc', 'dccb', '.cb.'], LEAFP, 33, 27);
    outline(b);
    return out(b);
  }

  // =================================================================== TREE
  function makeTree() {
    const b = B(56, 72);
    // limbs disappearing into the canopy
    for (let i = 0; i <= 12; i++) {
      rect(b, 25 - Math.round(i * 0.7), 52 - i, 3, 1, BR[1]); S(b, 25 - Math.round(i * 0.7), 52 - i, BR[2]);
      rect(b, 30 + Math.round(i * 0.7), 52 - i, 3, 1, BR[1]);
    }
    // trunk with root flare
    for (let y = 70; y >= 40; y--) {
      const k = y > 62 ? (y - 62) : 0;
      const xa = 24 - Math.round(k * k * 0.1) - (y < 50 ? 0 : 0), xb = 32 + Math.round(k * k * 0.085);
      for (let x = xa; x <= xb; x++) {
        const f = (x - xa) / (xb - xa);
        let t = f < 0.14 ? 4 : f < 0.42 ? 3 : f < 0.8 ? 2 : 1;
        if (y < 51) t = Math.max(1, t - 1); // canopy shade
        S(b, x, y, BR[t]);
      }
    }
    // bark: staggered grooves + root creases
    [[27, 52, 5], [30, 56, 6], [26, 60, 5], [29, 64, 4], [31, 48, 4]].forEach(g => rect(b, g[0], g[1], 1, g[2], BR[1]));
    [[26, 54, 3], [28, 61, 3]].forEach(g => rect(b, g[0], g[1], 1, g[2], BR[4]));
    line(b, 25, 66, 22, 70, BR[2]); line(b, 31, 66, 34, 70, BR[1]); line(b, 28, 67, 28, 70, BR[1]);
    leafMass(b, [
      [28, 14, 13, 10], [13.5, 23, 10.5, 10], [42, 23, 10.5, 10], [28, 26, 14, 10],
      [11, 34, 8, 7.5], [44.5, 34, 8, 7.5], [21, 38, 10, 7.5], [36, 38, 10, 7.5],
    ], [28, 24, 26, 22], 7);
    outline(b);
    return out(b);
  }

  // ================================================================= BUSHES
  function makeBush1() {
    const b = B(32, 16);
    rect(b, 3, 10, 26, 6, GR[0]);
    leafMass(b, [[16, 9, 7, 5], [8, 12, 5, 3.5], [24, 12, 5, 3.5], [12, 14, 5, 2.5], [21, 14, 5, 2.5]], [16, 9, 15, 8], 3, { bias: 0.1 });
    outline(b);
    return out(b);
  }
  function makeBush2() {
    const b = B(48, 24);
    rect(b, 4, 14, 40, 10, GR[0]);
    leafMass(b, [[21, 10.5, 8, 6], [32, 12, 8, 6], [10, 16.5, 6, 5], [39.5, 18, 5.5, 4.5], [17, 19.5, 8, 4], [29, 20.5, 8, 3.5]], [24, 13, 23, 12], 5, { bias: 0.1 });
    // berries
    const berry = ['.r.', 'rRr', '.r.'], BP = { r: RD[2], R: RD[3] };
    stamp(b, berry, BP, 24, 10); stamp(b, berry, BP, 12, 15); stamp(b, berry, BP, 35, 15); stamp(b, berry, BP, 28, 19);
    outline(b);
    return out(b);
  }

  // =================================================================== FERN
  function makeFern() {
    const b = B(24, 16);
    const o = { len: 3, lenUp: 2, cols: FR_FRONT, per: 3, grav: 0.3, gravUp: 0, lean: 0.5, pow: 0.5 };
    const ob = Object.assign({}, o, { cols: FR_BACK });
    frond(b, [12, 15], [9, 4], [5, 1], Object.assign({ side: -1 }, ob));
    frond(b, [12, 15], [15, 4], [19, 2], Object.assign({ side: 1 }, ob));
    frond(b, [12, 15], [7, 6], [1, 8], o);
    frond(b, [12, 15], [17, 6], [22, 8], o);
    frond(b, [12, 15], [8, 10], [3, 13], o);
    frond(b, [12, 15], [16, 10], [21, 13], o);
    frond(b, [12, 15], [12, 6], [12, 2], Object.assign({ side: 1 }, o));
    outline(b);
    return out(b);
  }

  // ================================================================ FLOWERS
  function makeFlowerA(f) {
    const b = B(16, 16), s = f ? 1 : 0;
    // leaves at the base
    stamp(b, ['.dd....', 'dccb...', '.bccb..', '...bb..'], LEAFP, 1, 11);
    stamp(b, ['....dd.', '...dccb', '..dcbb.', '..bb...'], LEAFP, 8, 11);
    // stems
    blade(b, 5, 15, 9, s, GR[2], GR[1], 1);
    blade(b, 10, 15, 6, s, GR[2], GR[1], 1);
    const FP = { w: W, p: PK[2], q: PK[1], y: GO[2], o: OR[2] };
    const big = ['..ww.ww', '.wwwwwp', '.wwyywp', 'wwyyowq', 'wwpoopq', '.ppwpq.', '..pq.q.'].map(r => r.slice(0, 7));
    const small = ['.w.w.', 'wwywp', '.yoy.', 'wpopq', '.p.q.'];
    stamp(b, big, FP, 2 + s, 1);
    stamp(b, small, FP, 9 + s, 6);
    outline(b, { fam: { [W]: [PK[0], PK[1]] } });
    return out(b);
  }
  function makeFlowerB(f) {
    const b = B(16, 24), s = f ? 1 : 0;
    // stem
    for (let y = 23; y >= 11; y--) { const x = 7 + Math.round(s * Math.pow((23 - y) / 12, 2)); S(b, x, y, GR[2]); S(b, x + 1, y, GR[1]); }
    stamp(b, ['.ddd..', 'dcccb.', '.bbccb', '...bb.'], LEAFP, 1, 15);
    stamp(b, ['..ddd.', '.dcccb', 'dccbb.', '.bb...'], LEAFP, 9, 17);
    // head: 8 petals around a seed disc
    const cx = 7.5 + s, cy = 6.5;
    const HP = { y: GO[2], h: GO[3], o: GO[1], d: OR[1], k: BR[1], m: BR[2], n: BR[3] };
    const head = [
      '....yh.yy....',
      '.yh.yy.yy.yy.',
      '.yyyyyoyyoyy.',
      '..yoykkkkyo..',
      'hyyykmnmkkyyy',
      'yyookmmmkkooy',
      '..ykkmmkkky..',
      'yyyykkkkkyyyo',
      'yooyykkkyoooo',
      '..yoyyoyyoy..',
      '.yyo.yo.yyoo.',
      '.oo..yo..oo..',
    ];
    stamp(b, head, HP, Math.round(cx - 6.5), 0);
    outline(b, { fam: { [GO[2]]: [OR[1], OR[1]], [GO[3]]: [OR[1], OR[1]], [GO[1]]: [OR[0], OR[1]] } });
    return out(b);
  }
  function makeTuft() {
    const b = B(16, 8);
    blade(b, 2, 7, 4, -1, GR[3], GR[2]);
    blade(b, 5, 7, 6, -2, GR[3], GR[2]);
    blade(b, 7, 7, 7, 0, GR[4], GR[2]);
    blade(b, 9, 7, 6, 2, GR[3], GR[2]);
    blade(b, 12, 7, 4, 2, GR[3], GR[1]);
    blade(b, 4, 7, 3, 0, GR[2], GR[1]);
    blade(b, 11, 7, 3, 0, GR[2], GR[1]);
    outline(b);
    return out(b);
  }

  // ================================================================== ROCKS
  function makeRock1() {
    const b = B(16, 12);
    poly(b, [[1, 12], [1, 8], [3, 4], [7, 1], [11, 2], [14, 6], [15, 12]], ST[2]);
    poly(b, [[3, 4], [7, 1], [11, 2], [9, 5], [5, 6]], ST[3]);
    poly(b, [[9, 5], [11, 2], [14, 6], [15, 12], [10, 12]], ST[1]);
    S(b, 6, 2, ST[4]); S(b, 7, 2, ST[4]); S(b, 5, 3, ST[4]);
    line(b, 5, 7, 6, 9, ST[1]);
    outline(b);
    return out(b);
  }
  function makeRock2() {
    const b = B(32, 24);
    poly(b, [[1, 24], [1, 17], [4, 10], [9, 5], [16, 3], [23, 5], [28, 10], [31, 17], [31, 24]], ST[2]);
    poly(b, [[9, 5], [16, 3], [23, 5], [20, 9], [11, 10]], ST[3]);
    poly(b, [[20, 9], [23, 5], [28, 10], [31, 17], [31, 24], [22, 24], [23, 15]], ST[1]);
    poly(b, [[1, 17], [4, 10], [9, 5], [11, 10], [8, 16]], ST[3]);
    poly(b, [[26, 18], [31, 17], [31, 24], [25, 24]], ST[0]);
    line(b, 11, 11, 13, 16, ST[1]); line(b, 13, 16, 12, 20, ST[1]);
    line(b, 8, 17, 4, 20, ST[1]);
    moss(b, 8, 4, [1, 2, 2, 3, 2, 2, 3, 4, 3, 2, 2, 3, 2, 2, 1, 1]);
    outline(b);
    return out(b);
  }

  // =============================================================== MUSHROOM
  function makeMushroom() {
    return G.px([
      '................',
      '................',
      '.....kkkkkk.....',
      '...kkrRRRrrkk...',
      '..krRRwwRrrrrk..',
      '.krRRRwwRrrwwrk.',
      '.krRRrrrrrrwwdk.',
      'krrwwrrrrrrrrddk',
      'krrwwrrrrrrrdddk',
      '.kkddddddddddkk.',
      '...kksccccskk...',
      '....kcCcccsk....',
      '....kcCcccsk....',
      '...kccCcccssk...',
      '...kccccccssk...',
      '....kkkkkkkk....',
    ], { k: RD[0], r: RD[2], R: RD[3], d: RD[1], w: W, c: BR[5], C: W, s: BR[4] });
  }

  // ================================================================== TOTEM
  function makeTotem() {
    const b = B(24, 48);
    const half = [
      '............',
      '...#........',
      '..###.......',
      '..####......',
      '..#o###.....',
      '..#oo###....',
      '..#ooo###...',
      '.+++++++++++',
      '.+++++++++++',
      '..##########',
      '..##oo######',
      '..##oooo####',
      '..###oooo###',
      '..#######+++',
      '..######++++',
      '..######++++',
      '..#o####++++',
      '..######++oo',
      '..#o####++oo',
      '..#######+++',
      '..##oooooooo',
      '..##########',
      '...#########',
      '....########',
      '....#o#o#o#o',
      '....########',
      '.+++++++++++',
      '.+++++++++++',
      '..#########o',
      '..###o#####o',
      '..####o#####',
      '..#######ooo',
      '..######o+++',
      '..#####o++++',
      '..oo###o++++',
      '..#####o++++',
      '..######o+++',
      '..#######ooo',
      '..####o#####',
      '..###o#####o',
      '..#########o',
      '..##########',
      '.+++++++++++',
      '.+++++++++++',
      '.###########',
      '.###########',
      '.###########',
      '.###########',
    ];
    const rows = mirrorRows(half).map(r => r.split(''));
    // weathering: broken right ear, chipped corners
    for (let y = 0; y <= 3; y++) for (let x = 12; x < 24; x++) rows[y][x] = '.';
    rows[4][20] = '.'; rows[4][19] = '.'; rows[5][21] = '.';
    rows[26][22] = '.'; rows[7][22] = '.'; rows[47][22] = '.'; rows[42][1] = '.';
    stone(b, rows.map(r => r.join('')), 0, 0, { shadeFrom: 17, lightTo: 3 });
    // cracks
    line(b, 16, 9, 18, 12, ST[1]); line(b, 5, 37, 7, 40, ST[1]);
    // moss
    moss(b, 9, 6, [1, 2, 2, 3, 2, 1]);
    moss(b, 1, 26, [2, 3, 2, 1, 2, 1]);
    moss(b, 15, 42, [1, 2, 2, 3, 2, 2, 1]);
    moss(b, 1, 44, [3, 2, 2, 1]);
    outline(b);
    return out(b);
  }

  // ================================================================= PILLAR
  function makePillar() {
    const b = B(16, 48);
    const top = [12, 10, 9, 10, 8, 7, 8, 11, 13, 14];
    const tone = [3, 3, 2, 3, 2, 2, 1, 2, 1, 1];
    for (let i = 0; i < 10; i++) for (let y = top[i]; y <= 40; y++) {
      let t = tone[i];
      if (y === top[i]) t = Math.min(4, t + 1);
      S(b, 3 + i, y, ST[t]);
    }
    // band
    for (let x = 2; x <= 13; x++) { S(b, x, 17, ST[x < 6 ? 4 : x < 10 ? 3 : 2]); S(b, x, 18, ST[x < 6 ? 3 : x < 10 ? 2 : 1]); if (x > 2 && x < 13) S(b, x, 19, ST[1]); }
    // base
    const base = ['..############..', '.++++++++++++++.', '.##############.', '.##############.', '++++++++++++++++', '################', '################'];
    stone(b, base, 0, 41, { shadeFrom: 11 });
    line(b, 6, 24, 8, 29, ST[1]); line(b, 8, 29, 7, 33, ST[1]);
    moss(b, 4, 7, [2, 3, 2]);
    moss(b, 0, 45, [1, 2, 3, 2, 1]);
    moss(b, 10, 41, [1, 2, 2, 1]);
    outline(b);
    return out(b);
  }

  // ============================================================== RUIN BLOCK
  function makeRuinBlock() {
    const b = B(32, 32);
    const rows = [];
    for (let y = 0; y < 30; y++) {
      let r = '';
      for (let x = 0; x < 30; x++) {
        const e = Math.min(x, y, 29 - x, 29 - y);
        r += e < 3 ? '+' : e < 4 ? 'o' : '#';
      }
      rows.push(r.split(''));
    }
    // carved square spiral
    const sp = [[8, 8, 21, 8], [21, 8, 21, 21], [21, 21, 8, 21], [8, 21, 8, 12], [8, 12, 17, 12], [17, 12, 17, 17], [17, 17, 12, 17], [12, 17, 12, 15]];
    sp.forEach(s => {
      const dx = Math.sign(s[2] - s[0]), dy = Math.sign(s[3] - s[1]);
      for (let x = s[0], y = s[1]; ; x += dx, y += dy) { rows[y][x] = 'o'; if (x === s[2] && y === s[3]) break; }
    });
    // chips
    rows[0][29] = rows[0][28] = rows[1][29] = '.'; rows[29][0] = rows[28][0] = rows[29][1] = rows[29][2] = '.';
    rows[0][0] = '.';
    stone(b, rows.map(r => r.join('')), 1, 1, { shadeFrom: 27 });
    line(b, 24, 4, 26, 8, ST[1]); line(b, 26, 8, 25, 11, ST[1]);
    moss(b, 2, 1, [2, 3, 2, 2, 4, 3, 2, 1, 1, 2, 2, 3, 5, 3, 2, 1]);
    moss(b, 22, 1, [1, 2, 2, 1]);
    // vine draped over the left
    const vx = [5, 5, 6, 6, 6, 5, 5, 4, 4, 5, 5, 6, 6, 6, 5, 5, 5, 6];
    for (let i = 0; i < vx.length; i++) S(b, vx[i], 5 + i, GR[1]);
    const lf = ['.dd', 'dcb', 'cb.'];
    stamp(b, lf, LEAFP, 2, 8); stamp(b, lf, LEAFP, 6, 11, true); stamp(b, lf, LEAFP, 2, 15); stamp(b, lf, LEAFP, 6, 18, true); stamp(b, lf, LEAFP, 4, 22);
    outline(b);
    return out(b);
  }

  // =================================================================== VINE
  function makeVine() {
    const b = B(16, 32);
    const lfL = ['.dd', 'dcc', 'cb.'], lfR = ['dd.', 'ccd', '.bc'];
    function strand(x0, len, ph) {
      for (let y = 0; y < len; y++) {
        const x = x0 + Math.round(Math.sin((y + ph) / 3.2) * 1.4);
        S(b, x, y, y % 5 === 2 ? GR[2] : GR[1]);
        if (y > 1 && y % 6 === 3) stamp(b, lfL, LEAFP, x - 3, y - 1);
        if (y > 1 && y % 6 === 0) stamp(b, lfR, LEAFP, x + 1, y - 1);
      }
      return x0 + Math.round(Math.sin((len - 1 + ph) / 3.2) * 1.4);
    }
    strand(11, 19, 2);
    const ex = strand(5, 28, 0);
    stamp(b, ['.p.', 'pyp', '.p.'], { p: PK[1], y: GO[3] }, ex - 1, 27);
    rect(b, 2, 0, 12, 1, GR[1]);
    outline(b);
    return out(b);
  }

  // ============================================================== WATERFALL
  const STR = [
    // x, w, period, colour, [y0,len]...
    [1, 2, 32, BL[4], [0, 14], [18, 10]], [1, 1, 32, W, [2, 8], [20, 5]],
    [4, 3, 32, BL[3], [6, 18], [28, 8]], [5, 1, 32, W, [10, 8]],
    [3, 1, 16, BL[1], [4, 7]],
    [8, 2, 32, BL[1], [0, 9], [16, 6]],
    [10, 3, 16, BL[3], [0, 10]], [11, 1, 16, BL[4], [2, 6]],
    [14, 2, 32, BL[3], [14, 16]], [13, 1, 32, W, [20, 10], [4, 4]],
    [17, 2, 16, BL[1], [8, 5]],
    [19, 3, 32, BL[3], [0, 12], [18, 8]], [20, 1, 32, W, [2, 7], [20, 4]],
    [23, 1, 16, BL[4], [10, 5]],
    [24, 2, 32, BL[1], [6, 10], [24, 5]],
    [26, 3, 16, BL[3], [5, 9]], [27, 1, 16, W, [7, 5]],
    [29, 2, 32, BL[4], [8, 14], [28, 8]], [30, 1, 32, W, [10, 8], [30, 4]],
  ];
  function wfBuf(f, h, yOff) {
    const b = B(32, h);
    rect(b, 1, 0, 30, h, BL[2]);
    STR.forEach(s => {
      const [x, w, per, col] = s, sp = per / 4;
      for (let k = 4; k < s.length; k++) {
        const [y0, len] = s[k];
        for (let i = 0; i < len; i++) for (let j = 0; j < w; j++) {
          if (w > 1 && (i === 0 && j !== 0 || i === len - 1 && j !== w - 1)) continue; // tapered ends
          for (let y = ((y0 + i + sp * f + yOff) % per + per) % per; y < h; y += per) S(b, x + j, y, col);
        }
      }
    });
    // ragged foam edges
    for (let y = 0; y < h; y++) {
      const a = ((y - f * 4 - yOff) % 16 + 16) % 16;
      if (a < 6) S(b, 0, y, a === 0 || a === 5 ? BL[4] : W);
      const c = ((y - f * 4 - yOff + 7) % 16 + 16) % 16;
      if (c < 5) S(b, 31, y, c === 0 || c === 4 ? BL[4] : W);
    }
    return b;
  }
  function makeWaterfall(f) { return out(wfBuf(f, 32, 0)); }
  function makeWaterfallTop(f) {
    const b = wfBuf(f, 16, 16);
    const hgt = x => (x === 0 || x === 31 ? 3 : x === 1 || x === 30 ? 2 : x === 2 || x === 29 ? 1 : 0);
    for (let x = 0; x < 32; x++) {
      const h0 = hgt(x);
      for (let y = 0; y < h0; y++) S(b, x, y, null);
      const g = ((x + f * 8) % 32 + 32) % 32;
      const gl = (g % 11) < 7;
      S(b, x, h0, gl ? W : BL[4]);
      S(b, x, h0 + 1, gl && (g % 11) > 1 && (g % 11) < 5 ? W : BL[4]);
      S(b, x, h0 + 2, BL[4]);
      S(b, x, h0 + 3, BL[3]);
      if ((x * 7 + 3) % 5 < 3) S(b, x, h0 + 4, BL[3]);
      if ((x * 7 + 3) % 5 < 1) S(b, x, h0 + 5, BL[3]);
    }
    return out(b);
  }
  function makeSplash(f) {
    const b = B(48, 16);
    const FO = [BL[3], BL[4], W, W];
    const puffs = [
      [6, 3, 0.5], [42, 3, 0], [11, 4, 0.25], [37, 4.5, 0.75], [17, 5.5, 0], [31, 5.5, 0.5], [24, 6.5, 0.25],
      [14, 3.5, 0.6], [34, 3.5, 0.1], [21, 4, 0.8], [27, 4, 0.4],
    ];
    puffs.forEach(p => {
      const r = p[1] + 1.1 * Math.sin(2 * Math.PI * (f / 4 + p[2]));
      puff(b, p[0], 16 - r * 0.55, r, r, FO);
    });
    // droplets
    [[3, 0], [45, 2], [9, 1], [39, 3], [20, 2], [29, 0]].forEach(d => {
      const ph = (f + d[1]) % 4, dir = d[0] < 24 ? -1 : 1;
      const y = [9, 5, 3, 6][ph] - (Math.abs(d[0] - 24) < 8 ? 2 : -1), x = d[0] + dir * ph;
      S(b, x, y, W); if (ph === 1) S(b, x, y + 1, BL[4]);
    });
    return out(b);
  }

  // ================================================================== WATER
  function makeSurface(f) {
    const b = B(32, 8);
    for (let x = 0; x < 32; x++) {
      const h = Math.round(2.5 + 1.4 * Math.sin(2 * Math.PI * (x / 16 - f / 4)));
      S(b, x, h, W); S(b, x, h + 1, BL[4]); S(b, x, h + 2, BL[3]);
      for (let y = h + 3; y < 8; y++) S(b, x, y, BL[2]);
    }
    return out(b);
  }
  function makeBody() {
    const b = B(32, 32);
    rect(b, 0, 0, 32, 32, BL[2]);
    const D = '#2668c8';
    [[2, 3, 7], [18, 6, 9], [9, 11, 6], [24, 14, 7], [3, 19, 8], [15, 22, 6], [26, 26, 5], [8, 28, 7]].forEach(w => {
      for (let i = 0; i < w[2]; i++) S(b, (w[0] + i) % 32, w[1], D);
      for (let i = 1; i < w[2] - 2; i++) S(b, (w[0] + i + 2) % 32, w[1] + 1, D);
    });
    [[12, 4, 3], [28, 10, 3], [5, 15, 2], [20, 18, 3], [11, 25, 2]].forEach(w => { for (let i = 0; i < w[2]; i++) S(b, (w[0] + i) % 32, w[1], BL[3]); });
    return out(b);
  }

  const F4 = fn => [0, 1, 2, 3].map(fn);
  return {
    palm: makePalm(),
    tree: makeTree(),
    bush1: makeBush1(),
    bush2: makeBush2(),
    fern: makeFern(),
    flowerA: [makeFlowerA(0), makeFlowerA(1)],
    flowerB: [makeFlowerB(0), makeFlowerB(1)],
    tuft: makeTuft(),
    rock1: makeRock1(),
    rock2: makeRock2(),
    mushroom: makeMushroom(),
    totem: makeTotem(),
    pillar: makePillar(),
    ruinBlock: makeRuinBlock(),
    vine: makeVine(),
    waterfall: F4(makeWaterfall),
    waterfallTop: F4(makeWaterfallTop),
    splash: F4(makeSplash),
    water: { surface: F4(makeSurface), body: makeBody() },
  };
});
