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

  // Ruin stone (blue-violet shadows, warm highlights) and warmer natural rock ramps.
  const RS = [ST[0], ST[1], ST[2], '#b6b4ba', '#eee6cc'];
  const RK = ['#33263a', '#5e4c5c', '#8e7d80', '#c0b2a0', '#efe3c2'];
  const DEEP = '#0a2a2e', WD = '#2668c8';

  // Outline families: colour -> [dark outline, lit-side outline]
  const FAM = {};
  function fam(ramp, d, l) { ramp.forEach(c => { FAM[c] = [d, l]; }); }
  fam(GR, GR[0], GR[1]); fam(BR, BR[0], BR[1]); fam(ST, ST[0], ST[1]); fam(BL, BL[1], BL[2]);
  fam(OR, OR[0], OR[1]); fam(RD, RD[0], RD[1]); fam(GO, GO[0], OR[1]); fam(PK, RD[0], PK[0]);
  fam(TE, TE[0], TE[1]); fam(PU, PU[0], PU[1]); FAM[W] = [ST[1], ST[2]];
  fam(RS, '#1e1a36', ST[1]); fam(RK, '#241a2e', RK[1]);
  // Expand the silhouette by 1px with a dark local colour (selout: lighter on the lit top/left side).
  // opt.col forces one colour; opt.flat disables the lit variant.
  function outline(b, opt) {
    opt = opt || {};
    const src = b.d.slice(), g = (x, y) => (x >= 0 && y >= 0 && x < b.w && y < b.h ? src[y * b.w + x] : null);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (g(x, y)) continue;
      const dn = g(x, y + 1), rt = g(x + 1, y), up = g(x, y - 1), lf = g(x - 1, y);
      const n = dn || rt || up || lf; if (!n) continue;
      if (opt.col) { b.d[y * b.w + x] = opt.col; continue; }
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
  // Leaf cluster: flat-toned leaf discs laid like roof tiles (light ones on top), which gives
  // clean scalloped tone bands: lit upper-left rim, mid tone, dark under-shadow. No dithering.
  // Each cluster gets its own dark rim so neighbouring clusters stay separated.
  function clump(b, cx, cy, rx, ry, bias, r) {
    layer(b, t => {
      const lobes = [], R = r || 3;
      let row = 0;
      for (let gy = -ry + R - 1; gy <= ry - R + 1.01; gy += 3, row++) for (let gx = -rx + R - 1 + (row & 1 ? 2 : 0); gx <= rx - R + 1.01; gx += 4) {
        const ex = gx / (rx - R + 1), ey = gy / (ry - R + 1);
        if (ex * ex + ey * ey > 1.08) continue;
        const v = -(gx / rx * 0.55 + gy / ry * 0.85) + (bias || 0);
        lobes.push([cx + gx, cy + gy, v > 0.62 ? 4 : v > 0.14 ? 3 : v > -0.42 ? 2 : 1, v]);
      }
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx - 1), dy = (y + 0.5 - cy) / (ry - 1);
        if (dx * dx + dy * dy <= 0.8) S(t, x, y, GR[1]);
      }
      lobes.sort((a, c) => a[3] - c[3]);
      lobes.forEach(l => {
        for (let y = Math.floor(l[1] - R); y <= Math.ceil(l[1] + R); y++) for (let x = Math.floor(l[0] - R - 1); x <= Math.ceil(l[0] + R + 1); x++) {
          const dx = (x + 0.5 - l[0]) / (R + 0.3), dy = (y + 0.5 - l[1]) / (R - 0.1);
          if (dx * dx + dy * dy <= 1) S(t, x, y, GR[l[2]]);
        }
      });
    }, { col: GR[0] });
  }

  // Palm / fern frond: midrib along a quadratic bezier with separate saw-tooth leaflets.
  // Each leaflet is a stroke of a light + dark pixel pair ending in a single pointed pixel;
  // the gap between leaflets is left empty (the layer rim fills it with the darkest tone).
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
    const n = pts.length, step = o.step || 3, c = o.cols, pair = step >= 3;
    const g = o.grav == null ? 0.5 : o.grav, ln = o.lean == null ? 0.5 : o.lean;
    for (let pass = 0; pass < 2; pass++) for (let side = -1; side <= 1; side += 2) {
      for (let i = (o.phase || 0) + 1; i < n - 1; i += step) {
        const x = pts[i][0], y = pts[i][1], tx = pts[i][2], ty = pts[i][3], s = i / (n - 1);
        const nx = -ty * side, ny = tx * side;
        const L0 = o.lenUp + (o.len - o.lenUp) * (ny + 1) / 2;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, (o.e0 == null ? 0.12 : o.e0) + s * (1 - (o.e0 == null ? 0.12 : o.e0)))), 0.6);
        const L = Math.round(L0 * env);
        let dx = nx + tx * ln, dy = ny + ty * ln + g;
        const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
        const ox = Math.abs(dy) >= Math.abs(dx) ? 1 : 0, oy = 1 - ox;
        for (let k = 1; k <= L; k++) {
          const X = Math.round(x + dx * k), Y = Math.round(y + dy * k);
          if (pass === 0) { if (pair && k < L) S(b, X + ox, Y + oy, c.b); }
          else S(b, X, Y, k === L && L > 2 ? c.t || c.a : c.a);
        }
      }
    }
    for (let i = 0; i < n; i++) S(b, pts[i][0], pts[i][1], i > n * 0.85 ? c.a : c.spine);
  }
  const FR_LIT = { spine: GR[4], a: GR[3], b: GR[2], rim: GR[1] };
  const FR_MID = { spine: GR[3], a: GR[2], b: GR[1], rim: GR[0] };
  const FR_BACK = { spine: GR[1], a: GR[1], b: GR[0], rim: DEEP };

  // grass blade / stem: quadratic lean, 2px at the base tapering to 1px
  function blade(b, x0, y0, h, lean, cl, cd, w) {
    for (let i = 0; i < h; i++) {
      const t = i / h, x = Math.round(x0 + lean * t * t), y = y0 - i;
      if ((w || 2) >= 2 && t < 0.6) { S(b, x, y, cl); S(b, x + 1, y, cd); } else S(b, x + (lean > 0 && (w || 2) >= 2 ? 1 : 0), y, t > 0.8 ? cl : cl);
    }
  }

  // ----------------------------------------------------------------- stone
  // Bump-map renderer: rows of height chars (' '/'.' empty, 'o' recess, '#' base, '+' raised, '*' higher).
  // Raised planes are a full tone lighter than the base, recesses a tone darker; edges facing the
  // upper-left catch a highlight, edges facing lower-right and anything under a ledge fall in shadow.
  const HV = { o: 0, '#': 1, '+': 2, '*': 3 };
  function mirrorRows(rows) { return rows.map(r => r + r.split('').reverse().join('')); }
  function stone(b, rows, ox, oy, opt) {
    opt = opt || {};
    const R = opt.ramp || RS;
    const h = (x, y) => { const r = rows[y]; if (!r) return -1; const v = HV[r[x]]; return v == null ? -1 : v; };
    const wd = rows[0].length;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < wd; x++) {
      const v = h(x, y); if (v < 0) continue;
      const l = h(x - 1, y), u = h(x, y - 1), r = h(x + 1, y), d = h(x, y + 1);
      let t = v === 0 ? 1 : v === 1 ? 2 : 3;
      const litE = l < v || u < v, shE = r < v || d < v, inSh = l > v || u > v;
      if (inSh) t -= 1; else if (litE && !shE) t += 1; else if (shE && !litE) t -= 1;
      if (v >= 2 && u < v && l < v) t = 4; // sparkling raised corner
      if (opt.shadeFrom != null && x >= opt.shadeFrom) t -= 1; // falloff on the right
      if (opt.lightTo != null && x <= opt.lightTo && v > 0 && t < 4 && !inSh && !shE) t += 1;
      S(b, ox + x, oy + y, R[Math.max(0, Math.min(4, t))]);
    }
  }
  // moss that follows the top silhouette between two columns, with drips (pattern = thickness per column)
  function mossTop(b, x0, pattern) {
    for (let i = 0; i < pattern.length; i++) {
      const x = x0 + i, th = pattern[i]; let y = 0;
      while (y < b.h && !Gt(b, x, y)) y++;
      for (let k = 0; k < th; k++) S(b, x, y + k, k === 0 ? GR[3] : k === th - 1 && th > 2 ? GR[1] : GR[2]);
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
    const fr = (p1, p2, cols, o) => layer(b, t => frond(t, crown, p1, p2, Object.assign({ len: 8, lenUp: 4, cols }, o)), { col: cols.rim });
    // back fronds (darkest green)
    fr([37, 13], [43, 3], FR_BACK, { len: 5, lenUp: 4, grav: 0.2 });
    fr([31, 14], [25, 5], FR_BACK, { len: 5, lenUp: 4, grav: 0.2, phase: 1 });
    fr([46, 27], [50, 55], FR_BACK, { len: 7, lenUp: 5, phase: 2 });
    // trunk
    layer(b, t => {
      const cxAt = y => 26 + 9 * Math.pow((95 - y) / 66, 1.7);
      for (let y = 95; y >= 29; y--) {
        const tt = (95 - y) / 66, seg = (95 - y) % 6;
        const hw = 3.6 - 1.2 * tt + (y > 90 ? (y - 90) * 0.5 : 0);
        const cx = cxAt(y - seg + 2); // each ring is a straight cup, stepping along the curve
        let xa = Math.round(cx - hw), xb = Math.round(cx + hw);
        if (seg === 5) { xa -= 1; xb += 1; } // lip of each ring
        for (let x = xa; x <= xb; x++) {
          const f = (x - xa) / Math.max(1, xb - xa);
          let c = f < 0.18 ? BR[4] : f < 0.5 ? BR[3] : f < 0.82 ? BR[2] : BR[1];
          if (seg === 0) c = f < 0.5 ? BR[2] : BR[1]; // shadow under the lip
          if (seg === 5 && f < 0.6) c = f < 0.3 ? BR[5] : BR[4];
          if (y < 38 && c !== BR[1]) c = BR[BR.indexOf(c) - 1]; // crown shade
          S(t, x, y, c);
        }
      }
    });
    // right-hand fronds (mid tone), then the frond drooping across the trunk
    fr([53, 21], [59, 49], FR_MID, { phase: 1 });
    fr([49, 5], [62, 23], FR_MID, {});
    fr([27, 29], [24, 55], FR_MID, { len: 7, lenUp: 5, phase: 2 });
    // sunlit fronds, upper-left
    fr([17, 22], [5, 48], FR_LIT, { phase: 1 });
    fr([21, 4], [2, 24], FR_LIT, {});
    // coconut cluster at the crown join
    const nut = ['.kkk.', 'knhmk', 'kmmdk', 'kmddk', '.kkk.'], NP = { k: BR[0], n: BR[3], h: BR[4], m: BR[2], d: BR[1] };
    stamp(b, nut, NP, 35, 30); stamp(b, nut, NP, 29, 31); stamp(b, nut, NP, 32, 34);
    // crown heart
    stamp(b, ['.aaa.', 'adeda', 'adcca', '.aaa.'], LEAFP, 32, 26);
    return out(b);
  }

  // =================================================================== TREE
  function makeTree() {
    const b = B(56, 72);
    layer(b, t => {
      // limbs disappearing into the canopy
      for (let i = 0; i <= 12; i++) {
        rect(t, 25 - Math.round(i * 0.7), 52 - i, 3, 1, BR[1]); S(t, 25 - Math.round(i * 0.7), 52 - i, BR[2]);
        rect(t, 30 + Math.round(i * 0.7), 52 - i, 3, 1, BR[1]);
      }
      // trunk with root flare
      for (let y = 70; y >= 40; y--) {
        const k = y > 62 ? (y - 62) : 0;
        const xa = 24 - Math.round(k * k * 0.1), xb = 32 + Math.round(k * k * 0.085);
        for (let x = xa; x <= xb; x++) {
          const f = (x - xa) / (xb - xa);
          let tn = f < 0.14 ? 4 : f < 0.42 ? 3 : f < 0.8 ? 2 : 1;
          if (y < 51) tn = Math.max(1, tn - 1); // canopy shade
          S(t, x, y, BR[tn]);
        }
      }
      // bark: staggered grooves + root creases
      [[27, 52, 5], [30, 56, 6], [26, 60, 5], [29, 64, 4], [31, 48, 4]].forEach(g => rect(t, g[0], g[1], 1, g[2], BR[1]));
      [[26, 54, 3], [28, 61, 3]].forEach(g => rect(t, g[0], g[1], 1, g[2], BR[4]));
      line(t, 25, 66, 22, 70, BR[2]); line(t, 31, 66, 34, 70, BR[1]); line(t, 28, 67, 28, 70, BR[1]);
    });
    // canopy: six separate clusters, back to front
    clump(b, 29, 13, 13, 10, 0.1);
    clump(b, 42, 25, 12, 10, -0.15);
    clump(b, 14, 24, 12, 10, 0.05);
    clump(b, 41, 38, 10, 7, -0.25);
    clump(b, 15, 38, 10, 7, -0.1);
    clump(b, 28, 32, 12, 9, 0);
    return out(b);
  }

  // ================================================================= BUSHES
  const BERRY = ['.kk.', 'kprk', 'krdk', '.kk.'], BERRYP = { k: RD[0], p: PK[1], r: RD[2], d: RD[1] };
  function makeBush1() {
    const b = B(32, 16);
    clump(b, 17, 9, 9, 7, 0);
    clump(b, 24, 12, 7, 5, -0.2);
    clump(b, 8, 12, 7, 5, 0);
    clump(b, 16, 14, 6, 4, -0.1);
    return out(b);
  }
  function makeBush2() {
    const b = B(48, 24);
    clump(b, 25, 11, 12, 9, 0.05);
    clump(b, 38, 16, 9, 7, -0.2);
    clump(b, 11, 16, 10, 7, 0);
    clump(b, 25, 20, 10, 5, -0.1);
    // berries: 2x2 with a highlight, in pairs
    [[20, 9], [24, 11], [8, 15], [35, 13], [39, 16], [27, 18]].forEach(p => stamp(b, BERRY, BERRYP, p[0], p[1]));
    return out(b);
  }

  // =================================================================== FERN
  function makeFern() {
    const b = B(24, 16);
    const base = [12, 16];
    const fr = (p1, p2, cols, o) => frond(b, base, p1, p2, Object.assign({ len: 3, lenUp: 2, step: 2, grav: 0.25, lean: 0.7, e0: 0.3, cols }, o));
    const BK = { spine: GR[1], a: GR[1], b: GR[1] }, MD = { spine: GR[2], a: GR[2], b: GR[2] }, LT = { spine: GR[4], a: GR[3], b: GR[3] };
    fr([12, 5], [11, 1], BK, {});
    fr([16, 0], [21, 4], MD, { phase: 1 });
    fr([7, 0], [3, 4], LT, {});
    fr([20, 6], [23, 13], MD, {});
    fr([4, 6], [0, 13], LT, { phase: 1 });
    outline(b, { col: GR[0] });
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
  // Faceted, warm grey: lit top plane, left face, front, cast-shadow side, dark contact line.
  function makeRock1() {
    const b = B(16, 12);
    poly(b, [[1, 12], [1, 8], [3, 4], [7, 1], [11, 2], [14, 6], [15, 12]], RK[2]);
    poly(b, [[1, 12], [1, 8], [3, 4], [5, 6], [4, 12]], RK[3]);
    poly(b, [[3, 4], [7, 1], [11, 2], [9, 5], [5, 6]], RK[4]);
    poly(b, [[9, 5], [11, 2], [14, 6], [15, 12], [10, 12]], RK[1]);
    poly(b, [[12, 8], [15, 9], [15, 12], [11, 12]], RK[0]);
    S(b, 9, 3, RK[3]); S(b, 10, 3, RK[3]); S(b, 8, 4, RK[3]); S(b, 9, 4, RK[3]); // top plane turning away
    line(b, 6, 7, 7, 9, RK[1]); S(b, 7, 7, RK[3]); S(b, 8, 9, RK[3]);
    for (let x = 1; x <= 14; x++) if (Gt(b, x, 11)) S(b, x, 11, x < 5 ? RK[1] : RK[0]);
    outline(b);
    return out(b);
  }
  function makeRock2() {
    const b = B(32, 24);
    poly(b, [[2, 24], [1, 18], [3, 12], [7, 6], [13, 2], [20, 2], [26, 6], [29, 12], [31, 18], [30, 24]], RK[2]);
    poly(b, [[2, 24], [1, 18], [3, 12], [7, 6], [10, 9], [8, 15], [6, 24]], RK[3]);
    poly(b, [[7, 6], [13, 2], [20, 2], [23, 6], [17, 9], [10, 9]], RK[4]);
    poly(b, [[23, 6], [26, 6], [29, 12], [31, 18], [30, 24], [21, 24], [22, 15], [17, 9]], RK[1]);
    poly(b, [[25, 16], [31, 18], [30, 24], [23, 24]], RK[0]);
    // top plane rolling off to the right, chiselled cracks with a lit lip
    poly(b, [[18, 4], [23, 6], [17, 9], [15, 8]], RK[3]);
    line(b, 12, 10, 14, 15, RK[1]); line(b, 14, 15, 13, 19, RK[1]);
    line(b, 13, 10, 15, 15, RK[3]); S(b, 14, 17, RK[3]);
    line(b, 7, 16, 4, 19, RK[2]); line(b, 17, 12, 19, 16, RK[1]);
    S(b, 4, 12, RK[4]); S(b, 5, 10, RK[4]); S(b, 4, 13, RK[4]); // sunlit edge
    for (let x = 1; x <= 30; x++) {
      if (Gt(b, x, 23)) S(b, x, 23, x < 6 ? RK[1] : RK[0]);
      if (x > 8 && x < 21 && Gt(b, x, 22)) S(b, x, 22, RK[1]);
    }
    // moss: a cap following the top facets, dripping down the faces
    mossTop(b, 6, [1, 2, 2, 4, 5, 3, 2, 2, 3, 6, 7, 4, 2, 2, 3, 2, 4, 5, 2, 1, 1]);
    S(b, 4, 15, GR[2]); S(b, 5, 15, GR[2]); S(b, 4, 16, GR[1]); S(b, 24, 13, GR[1]); S(b, 25, 13, GR[1]);
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
      '...+........',
      '..++........',
      '..+++.......',
      '.++o++......',
      '.++oo++.....',
      '.++ooo++....',
      '.++oooo+++++',
      '.+++oo++++++',
      '.###########',
      '.###########',
      '.##++++#####',
      '###+++++####',
      '###oooo+####',
      '+###ooo#####',
      '++####o###++',
      '.+########++',
      '..+#######++',
      '...+######++',
      '....+####+++',
      '....o+###+++',
      '....oo+##+oo',
      '....ooo+#+oo',
      '....oooo+###',
      '.+++++++++++',
      '.+++++++++++',
      '...#########',
      '...########+',
      '...#+######+',
      '...##+######',
      '...#####++++',
      '...####+++++',
      '...###++++oo',
      '...###+++o++',
      '...++#+++o+*',
      '...++#+++o+*',
      '...###+++o++',
      '...###++++oo',
      '...####+++++',
      '...#####++++',
      '...##+######',
      '...#+######+',
      '...########+',
      '...#########',
      '++++++++++++',
      '++++++++++++',
      '############',
      '############',
      '############',
    ];
    const rows = mirrorRows(half).map(r => r.split(''));
    // weathering: broken right ear, chipped corners
    for (let y = 0; y <= 2; y++) for (let x = 12; x < 24; x++) rows[y][x] = '.';
    rows[3][21] = rows[3][20] = '.'; rows[4][22] = '.';
    rows[13][23] = '.'; rows[23][1] = '.'; rows[24][22] = '.';
    rows[30][20] = rows[31][20] = rows[32][20] = '.'; rows[31][19] = 'o';
    rows[43][23] = rows[43][22] = rows[44][23] = '.'; rows[47][0] = '.';
    stone(b, rows.map(r => r.join('')), 0, 0, { shadeFrom: 16, lightTo: 2 });
    // eyes: deep sockets
    rect(b, 4, 12, 2, 1, RS[0]); rect(b, 18, 12, 2, 1, RS[0]);
    // cracks
    line(b, 15, 8, 17, 10, RS[1]); line(b, 6, 37, 8, 41, RS[1]); S(b, 7, 37, RS[4]);
    // moss on the top-facing ledges only
    moss(b, 8, 6, [1, 2, 3, 2, 1, 1, 2]);
    moss(b, 2, 23, [2, 3, 2, 1]); moss(b, 18, 23, [1, 2, 2, 1]);
    moss(b, 0, 43, [2, 3, 2]); moss(b, 19, 43, [1, 2, 1]);
    outline(b);
    return out(b);
  }

  // ================================================================= PILLAR
  function makePillar() {
    const b = B(16, 48);
    // fluted shaft (x 3..12), jagged fracture across the top
    const top = [15, 12, 10, 11, 7, 6, 9, 13, 12, 16];
    const tone = [3, 4, 2, 3, 3, 1, 2, 2, 0, 1];
    for (let i = 0; i < 10; i++) for (let y = top[i]; y <= 39; y++) {
      let t = tone[i];
      if (y === top[i]) t = i < 7 ? 4 : 3; else if (y === top[i] + 1) t = Math.min(4, t + 1); // fresh break
      S(b, 3 + i, y, RS[t]);
    }
    // bitten-out notch on the shadow side, crack running down from the fracture
    rect(b, 12, 24, 1, 5, null); rect(b, 11, 25, 1, 3, RS[0]); S(b, 12, 29, RS[2]);
    line(b, 7, 11, 6, 16, RS[1]); line(b, 6, 16, 7, 21, RS[1]); S(b, 7, 14, RS[4]);
    const base = ['..++++++++++++..', '..############..', '.++++++++++++++.', '.##############.', '.##############.', '++++++++++++++++', '################', '################', '################'];
    stone(b, base, 0, 39, { shadeFrom: 11 });
    moss(b, 4, 12, [1, 2, 1]); moss(b, 9, 13, [1, 2]);
    moss(b, 9, 39, [1, 2, 3, 2, 1]);
    outline(b);
    // fallen chunks lying in front of the base
    const CP = { 0: RS[0], 1: RS[1], 2: RS[2], 3: RS[3], 4: RS[4] };
    layer(b, t => {
      stamp(t, ['.344.', '34432', '43321', '33211', '32110'], CP, 0, 43);
      stamp(t, ['.43.', '4321', '3210'], CP, 11, 45);
    });
    moss(b, 1, 43, [1, 2, 1]);
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
    // hand-carved, worn sun-spiral: segments of uneven length, cut corners, weathered gaps
    const seg = [
      [9, 7, 13, 7], [14, 8, 19, 8], [21, 9, 22, 11], [22, 12, 22, 14], [21, 17, 21, 20],
      [19, 22, 15, 22], [13, 21, 10, 21], [8, 19, 8, 17], [7, 16, 7, 13], [9, 11, 11, 11], [12, 12, 16, 12],
      [17, 13, 17, 16], [15, 17, 13, 17], [12, 16, 12, 15], [14, 14, 15, 14],
    ];
    seg.forEach(s => {
      const n = Math.max(Math.abs(s[2] - s[0]), Math.abs(s[3] - s[1]));
      for (let i = 0; i <= n; i++) rows[Math.round(s[1] + (s[3] - s[1]) * i / n)][Math.round(s[0] + (s[2] - s[0]) * i / n)] = 'o';
    });
    // corner studs (one worn away)
    [[6, 23], [23, 23], [23, 6]].forEach(p => { rows[p[1]][p[0]] = rows[p[1]][p[0] + 1] = rows[p[1] + 1][p[0]] = rows[p[1] + 1][p[0] + 1] = '+'; });
    // chipped edges and corners
    const chip = (x, y) => { rows[y][x] = '.'; };
    [[29, 0], [28, 0], [27, 0], [29, 1], [28, 1], [29, 2], [0, 29], [0, 28], [1, 29], [2, 29], [0, 27], [0, 0],
      [29, 13], [29, 14], [29, 15], [28, 14], [12, 29], [13, 29], [14, 29], [13, 28], [29, 29], [0, 9], [0, 10]].forEach(p => chip(p[0], p[1]));
    rows[28][12] = rows[28][14] = rows[13][28] = rows[15][28] = '#'; rows[14][27] = '#';
    stone(b, rows.map(r => r.join('')), 1, 1, { shadeFrom: 26 });
    line(b, 24, 4, 26, 8, RS[1]); line(b, 26, 8, 25, 12, RS[1]); S(b, 25, 6, RS[3]);
    line(b, 16, 25, 18, 29, RS[1]);
    moss(b, 2, 1, [2, 3, 2, 2, 4, 3, 2, 1, 1, 2, 2, 3, 5, 3, 2, 1]);
    moss(b, 21, 1, [1, 2, 3, 2, 1]);
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
  // The column is shaded as a cylinder (dark flanks, light band on the left third) and carries
  // long streaks that all fall 8px per frame over a 32px period, so 4 frames loop seamlessly.
  const EDGE = 'rgba(184,240,255,0.6)';
  const WCOL = x => (x <= 2 || x >= 29 ? BL[1] : x <= 4 || x >= 27 ? WD : x === 6 || x === 9 || x === 10 ? BL[3] : x === 7 || x === 8 ? BL[4] : BL[2]);
  const STR = [
    // x, width, colour, y0, length
    [7, 1, W, 3, 17], [8, 1, W, 23, 9], [8, 1, BL[3], 6, 9], [9, 2, BL[2], 12, 11], [6, 1, BL[2], 26, 9],
    [13, 2, BL[3], 2, 23], [13, 1, BL[4], 6, 12],
    [17, 2, BL[3], 13, 27], [18, 1, BL[4], 20, 13], [18, 1, W, 25, 6],
    [21, 2, BL[3], 5, 19], [21, 1, BL[4], 10, 8],
    [24, 2, BL[3], 19, 22], [25, 1, BL[4], 22, 9],
    [15, 1, BL[3], 27, 12],
    [11, 2, WD, 10, 21], [19, 2, WD, 22, 20], [23, 1, WD, 1, 16], [12, 1, WD, 0, 8], [16, 1, WD, 4, 7],
    [26, 2, BL[1], 8, 19], [4, 1, BL[1], 16, 15], [27, 1, BL[2], 28, 11],
    [2, 1, BL[2], 0, 13], [1, 1, WD, 14, 10], [29, 1, WD, 18, 15], [30, 1, BL[2], 2, 9],
  ];
  // ragged outer edges: how many pixels are bitten out of each side, per row of the 32px period
  const RAGL = '00011222110000111221100011222110', RAGR = '11000112221100001122211000011221';
  function wfBuf(f, h, yOff) {
    const b = B(32, h);
    for (let x = 0; x < 32; x++) rect(b, x, 0, 1, h, WCOL(x));
    STR.forEach(s => {
      const x = s[0], w = s[1], col = s[2], y0 = s[3], len = s[4];
      for (let i = 0; i < len; i++) for (let j = 0; j < w; j++) {
        if (w > 1 && ((i < 2 && j !== 0) || (i >= len - 2 && j !== w - 1))) continue; // tapered ends
        for (let y = ((y0 + i + 8 * f + yOff) % 32 + 32) % 32; y < h; y += 32) S(b, x + j, y, col);
      }
    });
    for (let y = 0; y < h; y++) {
      const q = ((y - 8 * f - yOff) % 32 + 32) % 32;
      const l = +RAGL[q], r = +RAGR[q];
      for (let x = 0; x < l; x++) S(b, x, y, null);
      for (let x = 0; x < r; x++) S(b, 31 - x, y, null);
      S(b, l, y, EDGE); S(b, 31 - r, y, EDGE);
      if (l !== +RAGL[(q + 31) % 32]) S(b, l + 1, y, BL[3]); // foam fleck where the edge steps
      if (r !== +RAGR[(q + 31) % 32]) S(b, 30 - r, y, BL[2]);
    }
    return b;
  }
  function makeWaterfall(f) { return out(wfBuf(f, 32, 0)); }
  // Lip: a bright rounded roll where the water bulges over the edge; its highlight thins into
  // the falling streaks, and foam bumps travel along the crest (4px per frame, 16px apart).
  function makeWaterfallTop(f) {
    const b = wfBuf(f, 16, 16);
    const arc = x => { const e = Math.min(x, 31 - x); return e === 0 ? 5 : e === 1 ? 3 : e === 2 ? 2 : e <= 4 ? 1 : 0; };
    const BUMP = [1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0];
    const TONG = { 7: 6, 8: 4, 13: 4, 14: 2, 17: 3, 21: 5, 22: 2, 25: 3, 3: 2, 28: 2, 11: 1, 19: 1 };
    for (let x = 0; x < 32; x++) {
      const bump = BUMP[((x - 4 * f) % 16 + 16) % 16];
      const a = arc(x), T = 2 + a - (a > 2 ? 0 : bump);
      for (let y = 0; y < T; y++) S(b, x, y, null);
      const edge = a >= 3;
      S(b, x, T, edge ? EDGE : W); S(b, x, T + 1, edge ? BL[4] : W);
      const base = 2 + a + 2; // rows below the white roll
      for (let y = T + 2; y < base; y++) S(b, x, y, W);
      S(b, x, base, x >= 6 && x <= 10 ? W : BL[4]); S(b, x, base + 1, BL[4]);
      S(b, x, base + 2, a >= 2 ? BL[2] : BL[3]);
      const tg = TONG[x] || 0;
      for (let k = 0; k < tg; k++) S(b, x, base + 2 + k, k < tg / 2 ? BL[4] : BL[3]);
      if (!tg && a < 2 && (x % 5 === 0 || x % 5 === 1)) S(b, x, base + 3, WD); // shadow tucked under the roll
    }
    return out(b);
  }
  // Base foam: four distinct poses (gather, rise, burst, collapse outward) + 2x2 droplets on arcs.
  function makeSplash(f) {
    const b = B(48, 16);
    const FO = [BL[3], BL[4], W, W];
    const POSE = [
      [[8, 3], [40, 3], [15, 4], [33, 4], [24, 5]],
      [[5, 2.5], [43, 2.5], [10, 4], [38, 4], [31, 6], [17, 6], [24, 8]],
      [[7, 4.5], [41, 4.5], [36, 6], [13, 6], [24, 6], [29, 8.5], [20, 9.5]],
      [[19, 4], [29, 4], [24, 5], [42, 5], [6, 5], [34, 6.5], [14, 6.5]],
    ][f];
    POSE.forEach(p => puff(b, p[0], 16 - p[1] * 0.45, p[1] * 1.15, p[1], FO));
    // bottom edge melts into the water surface colour
    for (let x = 0; x < 48; x++) {
      if (Gt(b, x, 15)) S(b, x, 15, BL[3]);
      if (Gt(b, x, 14) && (x >> 1) % 3 !== 0) S(b, x, 14, BL[4]);
    }
    for (let x = 1; x < 47; x++) if (!Gt(b, x, 15) && (Gt(b, x - 1, 15) === BL[3] || Gt(b, x + 1, 15) === BL[3])) S(b, x, 15, EDGE);
    // droplets thrown up and out on both sides, falling back
    const AX = [1, 4, 7, 9], AY = [4, 9, 10, 6];
    [[14, -1, 0, 0], [9, -1, 2, 2], [19, -1, 3, -1], [33, 1, 1, 0], [37, 1, 3, 2], [28, 1, 2, -1]].forEach(d => {
      const t = (f + d[2]) % 4, x = d[0] + d[1] * AX[t] - (d[1] < 0 ? 0 : 1), y = 12 - AY[t] + d[3];
      if (Gt(b, x, y) || Gt(b, x + 1, y + 1)) return; // hidden inside the foam
      S(b, x, y, W); S(b, x + 1, y, W); S(b, x, y + 1, W); S(b, x + 1, y + 1, BL[4]);
      if (t === 3) S(b, x + (d[1] < 0 ? 1 : 0), y - 1, BL[4]); // falling tail
    });
    return out(b);
  }

  // ================================================================== WATER
  // One large and one small crest per 32px, travelling 8px per frame; sparkles blink on and off.
  function makeSurface(f) {
    const b = B(32, 8);
    const PROF = [4, 3, 3, 2, 1, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 4, 4, 3, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4];
    for (let x = 0; x < 32; x++) {
      const q = ((x - 8 * f) % 32 + 32) % 32, h = PROF[q], crest = h <= 3;
      S(b, x, h, crest ? W : BL[4]);
      S(b, x, h + 1, h <= 1 ? W : crest ? BL[4] : BL[3]);
      if (h + 2 < 8) S(b, x, h + 2, crest ? BL[3] : BL[2]);
      for (let y = h + 3; y < 8; y++) S(b, x, y, BL[2]);
      if (q === 7 || q === 8) S(b, x, h - 1, W); // curling foam tip of the big crest
    }
    [[[12, 6], [27, 7]], [[3, 7], [21, 6]], [[10, 7], [30, 6]], [[16, 6], [5, 7]]][f].forEach(p => {
      if (Gt(b, p[0], p[1]) === BL[2] && Gt(b, p[0] + 1, p[1]) === BL[2]) { S(b, p[0], p[1], BL[4]); S(b, p[0] + 1, p[1], BL[3]); }
    });
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
