// SUNFOX — parallax backdrop for Emerald Coast: sky + 6 layers (far -> near).
// Everything is plotted as indexed pixels (no blending): banded sky with ordered
// dither, puff-sculpted cumulus, faceted islands, line-scroll sea strips with glitter,
// mid headlands with cliffs + waterfalls over a lagoon, near palm/jungle treeline.
G.defineArt('bg', G => {
  const W = G.W, H = G.H;

  // ===================== toolkit =====================
  const HEX = [null], IDX = {};
  const C = hex => IDX[hex] || (HEX.push(hex), (IDX[hex] = HEX.length - 1));
  const CS = list => list.map(C);

  // Indexed pixel layer; x wraps, so anything drawn across an edge tiles seamlessly.
  function layer(w, h) {
    const d = new Uint8Array(w * h);
    const wrap = x => ((x % w) + w) % w;
    return {
      w, h, d,
      get: (x, y) => (y < 0 || y >= h ? 0 : d[y * w + wrap(x)]),
      set: (x, y, c) => { if (y >= 0 && y < h) d[y * w + wrap(x)] = c; },
      row: (x0, x1, y, c) => { if (y >= 0 && y < h) for (let x = x0; x <= x1; x++) d[y * w + wrap(x)] = c; },
      col: (x, y0, y1, c) => { const X = wrap(x); for (let y = Math.max(0, y0); y <= y1 && y < h; y++) d[y * w + X] = c; },
    };
  }
  function bake(L) {
    const c = G.cv(L.w, L.h), im = c.ctx.createImageData(L.w, L.h), o = im.data;
    const rgb = HEX.map(h => (h ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : null));
    for (let i = 0, j = 0; i < L.d.length; i++, j += 4) {
      const p = rgb[L.d[i]];
      if (!p) continue;
      o[j] = p[0]; o[j + 1] = p[1]; o[j + 2] = p[2]; o[j + 3] = 255;
    }
    c.ctx.putImageData(im, 0, 0);
    return c;
  }
  const rng = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // 2x2 ordered-dither thresholds: 25% = sparse dots, 50% = checker, 75% = inverse dots.
  const M2 = [0.125, 0.625, 0.875, 0.375];
  const d2 = (x, y) => M2[(x & 1) | ((y & 1) << 1)];

  // Vertical colour ramp: flat bands joined by 6-row ordered transitions (25/50/75%).
  const TR = [0.25, 0.25, 0.5, 0.5, 0.75, 0.75];
  function vramp(L, y, cols, flats) {
    for (let i = 0; i < cols.length; i++) {
      for (let k = 0; k < flats[i] && y < L.h; k++, y++) L.row(0, L.w - 1, y, cols[i]);
      if (i < cols.length - 1) for (let k = 0; k < 6 && y < L.h; k++, y++) for (let x = 0; x < L.w; x++) L.set(x, y, TR[k] > d2(x, y) ? cols[i + 1] : cols[i]);
    }
    return y;
  }

  // Light comes from the upper-left, a little toward the viewer.
  const LX = -0.5, LY = -0.62, LZ = 0.6;

  // Rasterise a pile of ellipsoid "puffs" (painter's order: later = nearer) with toon
  // shading. list: [cx, cy, rx, ry?]. o.tones: palette indices light -> dark, o.thr:
  // descending thresholds between them. o.grad: [from, to] ambient added across the pile
  // (down it, and with o.gx also from left to right, so the whole mass turns from light
  // into shade), o.flat: >1 flattens each puff (thinner shade crescents), o.clip: base row
  // (number or x => row), o.dith: per-threshold half-width of an ordered-dither fringe.
  function puffs(L, list, o) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of list) {
      const rx = p[2], ry = p[3] || rx;
      x0 = Math.min(x0, Math.floor(p[0] - rx)); x1 = Math.max(x1, Math.ceil(p[0] + rx));
      y0 = Math.min(y0, Math.floor(p[1] - ry)); y1 = Math.max(y1, Math.ceil(p[1] + ry));
    }
    x0--; x1++; y0--; y1++; // 1px margin so the hole-fill can walk around the pile
    const clip = o.clip == null ? null : typeof o.clip === 'function' ? o.clip : () => o.clip;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const v = new Float32Array(bw * bh).fill(NaN);
    const fl = o.flat || 1;
    for (const p of list) {
      const cx = p[0], cy = p[1], rx = p[2], ry = p[3] || rx;
      const ya = Math.floor(cy - ry), yb = Math.ceil(cy + ry), xa = Math.floor(cx - rx), xb = Math.ceil(cx + rx);
      for (let x = xa; x <= xb; x++) {
        const dx = (x + 0.5 - cx) / rx, yc = clip ? clip(x) : 1e9;
        for (let y = ya; y <= yb && y < yc; y++) {
          const dy = (y + 0.5 - cy) / ry, q = dx * dx + dy * dy;
          if (q > 1) continue;
          const nz = Math.sqrt(1 - q) * fl;
          v[(y - y0) * bw + (x - x0)] = (dx * LX + dy * LY + nz * LZ) / Math.sqrt(q + nz * nz);
        }
      }
    }
    const top = o.top != null ? o.top : y0, base = o.base != null ? o.base : y1;
    const g0 = o.grad ? o.grad[0] : 0, g1 = o.grad ? o.grad[1] : 0, gx = o.gx || 0, thr = o.thr, dith = o.dith;
    const out = new Uint8Array(bw * bh);
    for (let y = y0; y <= y1; y++) {
      const ty = Math.min(1, Math.max(0, (y - top) / Math.max(1, base - top)));
      for (let x = x0; x <= x1; x++) {
        const i = (y - y0) * bw + (x - x0);
        if (v[i] !== v[i]) continue;
        const t = ty * (1 - gx) + ((x - x0) / bw) * gx, val = v[i] + g0 + (g1 - g0) * t, dd = (d2(x, y) - 0.5) * 2;
        let k = 0;
        while (k < thr.length && val + (dith ? dd * (dith[k] || 0) : 0) < thr[k]) k++;
        out[i] = k + 1;
      }
    }
    // fill enclosed holes with the darkest tone (flood the outside, whatever is left is a hole)
    const seen = new Uint8Array(bw * bh), st = [0];
    seen[0] = 1;
    while (st.length) {
      const i = st.pop(), x = i % bw, y = (i / bw) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < bw - 1 ? i + 1 : -1, y > 0 ? i - bw : -1, y < bh - 1 ? i + bw : -1])
        if (j >= 0 && !seen[j] && !out[j]) { seen[j] = 1; st.push(j); }
    }
    for (let i = 0; i < out.length; i++) if (!out[i] && !seen[i]) out[i] = o.hole || thr.length + 1;
    // tidy: no 1px nubs on the silhouette, no orphan tone pixels inside
    const at = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : out[y * bw + x]);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const c = out[y * bw + x];
        if (!c) continue;
        const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        if (n.filter(Boolean).length <= 1) { out[y * bw + x] = 0; continue; }
        if (dith) continue;
        if (n.filter(q => q === c).length < 2) {
          const cnt = {};
          let best = c, bn = 0;
          for (const q of n) if (q && q !== c) { cnt[q] = (cnt[q] || 0) + 1; if (cnt[q] > bn) { bn = cnt[q]; best = q; } }
          out[y * bw + x] = best;
        }
      }
    }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const c = out[y * bw + x];
      if (c) L.set(x + x0, y + y0, o.tones[Math.min(o.tones.length, c) - 1]);
    }
  }

  // ===================== sky =====================
  function makeSky() {
    const L = layer(W, H);
    const cols = CS(['#2260cc', '#2a72d8', '#3384e2', '#3e97ea', '#4eaaf0', '#62bcf5', '#7accf8', '#96dbfa', '#b2e8fb', '#ccf1f8', '#e2f7ee', '#f6f6da']);
    vramp(L, 0, cols, [6, 8, 6, 6, 4, 2, 2, 2, 0, 0, 0, 300]);
    return L;
  }

  // ===================== clouds =====================
  // A cumulus is authored as lobes [dx, up, r, bumps?] relative to its base line
  // (up = centre height). bumps: [[angleDeg, r], ...] small puffs tucked BEHIND the lobe's
  // rim, so they only break up its silhouette and never clutter its lit face.
  function cumulus(L, ox, oy, lobes, o) {
    const list = [];
    let top = 1e9;
    for (const b of lobes) {
      const cx = ox + b[0], cy = oy - b[1], r = b[2];
      if (typeof b[3] === 'number') { list.push([cx, cy, r, b[3]]); continue; }
      for (const bp of b[3] || []) {
        const a = (bp[0] * Math.PI) / 180, d = r - bp[1] * 0.35;
        list.push([cx + Math.cos(a) * d, cy - Math.sin(a) * d, bp[1]]);
      }
      list.push([cx, cy, r]);
      top = Math.min(top, cy - r);
    }
    puffs(L, list, Object.assign({ top, base: oy, clip: oy }, o));
  }
  // dissolve the lower rows of a layer into haze colour c (ordered 25/50/75%)
  function fade(L, ya, yb, c) {
    for (let y = ya; y < L.h; y++) {
      const f = Math.min(1, (Math.floor(((y - ya) / (yb - ya)) * 4) + 1) / 4);
      for (let x = 0; x < L.w; x++) if (L.d[y * L.w + x] && f > d2(x, y)) L.d[y * L.w + x] = c;
    }
  }

  const HERO = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0', '#869fe6']), thr: [0.82, 0.3, -0.15, -0.6], grad: [0.3, -0.55], gx: 0.3, flat: 1.25 };
  const SMALL = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0']), thr: [0.6, 0.0, -0.5], grad: [0.35, -0.5], gx: 0.2, flat: 1.7 };

  function makeFloaters() {
    const L = layer(768, 112);
    // A — the big hero cumulus
    cumulus(L, 52, 72, [
      [78, 0, 74, 12], [150, 0, 26, 6],
      [4, 3, 5], [14, 10, 10, [[130, 4]]], [140, 8, 12, [[60, 4], [20, 3]]],
      [58, 42, 22, [[165, 5], [130, 6], [95, 5], [55, 6]]],
      [30, 26, 15, [[150, 5], [105, 5]]],
      [88, 38, 15, [[80, 5], [35, 5]]],
      [108, 27, 13, [[60, 4], [15, 4]]],
      [124, 16, 11, [[50, 4]]],
      [44, 14, 15], [70, 12, 14], [94, 8, 11], [24, 6, 9], [114, 5, 8], [160, 3, 6],
    ], HERO);
    // B — medium
    cumulus(L, 372, 50, [
      [46, 0, 44, 8],
      [3, 3, 4], [92, 4, 5], [12, 8, 8], [80, 10, 9, [[40, 3]]],
      [44, 28, 15, [[150, 4], [100, 5], [50, 4]]],
      [64, 22, 11, [[70, 4], [20, 3]]],
      [26, 18, 11, [[140, 4]]],
      [38, 8, 11], [58, 6, 9], [22, 4, 6], [74, 3, 5],
    ], HERO);
    // C — long and low
    cumulus(L, 566, 38, [
      [62, 0, 58, 6],
      [6, 3, 5], [120, 2, 3], [110, 4, 5], [20, 9, 9, [[130, 3]]], [96, 8, 8, [[40, 3]]],
      [38, 15, 11, [[110, 4], [60, 4]]], [58, 18, 12, [[95, 4], [45, 4]]], [78, 14, 10, [[60, 4]]],
      [30, 4, 7], [48, 5, 9], [68, 4, 8], [86, 3, 6],
    ], HERO);
    // D — small
    cumulus(L, 262, 28, [
      [28, 0, 26, 5],
      [3, 2, 3], [52, 4, 5], [12, 6, 7], [24, 13, 10, [[140, 3], [80, 4]]], [40, 10, 8, [[50, 3]]],
      [22, 3, 6], [36, 3, 5],
    ], SMALL);
    // wisps
    cumulus(L, 500, 84, [[20, 0, 18, 3], [8, 3, 4], [34, 2, 3], [16, 5, 5], [26, 3, 4]], SMALL);
    cumulus(L, 706, 64, [[14, 0, 12, 3], [6, 3, 3], [22, 3, 3], [14, 4, 5]], SMALL);
    return L;
  }

  function makeBank() {
    const L = layer(768, 96);
    const BANK = { tones: CS(['#fffdf0', '#e6f0f6', '#cfe2f6', '#b6d1f0']), thr: [0.72, 0.22, -0.3], grad: [0.3, -0.5], gx: 0.3, flat: 1.25, clip: null };
    const tower = lobes => cumulus(L, 0, 96, lobes, BANK);
    tower([
      [34, 6, 8], [186, 6, 8], [50, 12, 11], [170, 14, 11], [68, 22, 13, [[135, 4]]], [152, 24, 13, [[50, 4]]],
      [110, 44, 18, [[150, 5], [100, 6], [45, 5]]], [88, 34, 14, [[140, 5], [95, 4]]], [132, 34, 15, [[60, 5], [15, 4]]],
      [100, 22, 15], [124, 20, 14], [80, 12, 12], [144, 12, 12], [112, 8, 12], [60, 4, 9], [164, 4, 9],
    ]);
    tower([[262, 8, 8], [340, 8, 8], [300, 24, 13, [[120, 4], [60, 4]]], [280, 16, 11], [322, 16, 11], [292, 10, 10], [312, 9, 9]]);
    tower([
      [434, 5, 7], [608, 5, 7], [450, 12, 10], [592, 12, 10], [470, 24, 13], [572, 24, 13, [[40, 4]]],
      [520, 48, 20, [[160, 5], [115, 6], [70, 6], [30, 5]]], [494, 36, 15, [[140, 5]]], [548, 38, 14, [[50, 5]]],
      [506, 24, 15], [534, 22, 14], [484, 12, 12], [556, 12, 12], [520, 8, 12], [462, 4, 8], [580, 4, 8],
    ]);
    tower([[668, 9, 9], [746, 9, 9], [706, 30, 15, [[130, 5], [70, 5]]], [686, 20, 12, [[150, 4]]], [728, 20, 12, [[40, 4]]], [698, 12, 11], [718, 11, 10]]);
    tower([[220, 6, 8], [244, 6, 7], [232, 9, 8]]);
    tower([[380, 7, 8], [408, 6, 7], [394, 10, 9]]);
    tower([[640, 6, 7], [652, 8, 7], [8, 7, 8], [-6, 9, 8]]);
    return L;
  }

  // ===================== sea =====================
  const SEA = CS(['#2456c2', '#2864cc', '#2c74d6', '#3086de', '#3498e2', '#38aae2', '#3ebade', '#4ac8d8', '#5cd4d0', '#74e0cc', '#92ead0']);
  const GL = C('#f6ffff'), GL2 = C('#b4e6fc');
  // rows of water, given as a string of ramp digits (line-interleaved gradient = no shimmer when scrolling)
  function water(L, y, seq) {
    for (const ch of seq) { L.row(0, L.w - 1, y++, SEA[parseInt(ch, 36)]); if (y >= L.h) break; }
    return y;
  }
  function dashRow(L, rnd, y, cell, lmin, lmax, skip, core, tip) {
    const n = Math.round(L.w / cell), cw = L.w / n;
    for (let i = 0; i < n; i++) {
      const len = lmin + Math.floor(rnd() * (lmax - lmin + 1)), x = Math.floor(i * cw + rnd() * Math.max(1, cw - len - 1));
      if (rnd() < skip) continue;
      for (let k = 0; k < len; k++) L.set(x + k, y, tip && len > 2 && (k === 0 || k === len - 1) ? tip : core);
    }
  }

  // Faceted mountain: ridge polyline [x, y, 'p'|'v'?]; 'p' peaks grow a zig-zag spine,
  // 'v' valleys a gully. Left of a spine = lit face, right of it (up to the gully) = shade.
  function zig(x, y0, y1, pat) {
    const out = new Float32Array(Math.max(1, y1 - y0 + 1));
    let k = 0, left = pat[0][0];
    for (let y = y0; y <= y1; y++) {
      out[y - y0] = x;
      x += pat[k][1];
      if (--left <= 0) { k = (k + 1) % pat.length; left = pat[k][0]; }
    }
    return out;
  }
  function mountain(L, pts, base, pal, o) {
    o = o || {};
    const xa = pts[0][0], xb = pts[pts.length - 1][0];
    const top = new Int16Array(xb - xa + 1).fill(base);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (let x = a[0]; x <= b[0]; x++) top[x - xa] = Math.round(a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0])));
    }
    const div = [];
    for (const p of pts) {
      if (p[2] === 'p') div.push({ k: 'S', y0: p[1], x: zig(p[0] + 0.5, p[1], base, o.spine || [[6, 0.5], [3, -0.34]]) });
      if (p[2] === 'v') div.push({ k: 'G', y0: p[1], x: zig(p[0] + 0.5, p[1], base, o.gully || [[5, -0.6], [2, 0.3]]) });
    }
    for (let i = 0; i < div.length - 1; i++) {
      const s = div[i], g = div[i + 1];
      if (s.k !== 'S' || g.k !== 'G') continue;
      for (let y = g.y0; y < base; y++) if (s.x[y - s.y0] >= g.x[y - g.y0]) { s.y1 = g.y1 = y; break; }
    }
    for (let x = xa; x <= xb; x++) for (let y = top[x - xa]; y < base; y++) {
      let best = -1e9, kind = 'G';
      for (const dv of div) {
        if (y < dv.y0 || (dv.y1 != null && y >= dv.y1)) continue;
        const px = dv.x[y - dv.y0];
        if (px <= x + 0.5 && px > best) { best = px; kind = dv.k; }
      }
      let c = kind === 'S' ? pal.shade : pal.lit;
      if (pal.haze) { const f = (y - (base - 7)) / 8; if (f > d2(x, y)) c = pal.haze; }
      L.set(x, y, c);
    }
  }

  const HZ = 40; // horizon row inside the far-sea layer
  function makeSeaFar() {
    const L = layer(640, 150);
    const rnd = rng(11);
    // islands (drawn first; the sea covers their feet)
    const far = { lit: C('#c2d9f4'), shade: C('#aecaf0'), haze: C('#d6e8f6') };
    const mid = { lit: C('#a9c6ee'), shade: C('#8aa9e2'), haze: C('#c4daf4') };
    mountain(L, [[250, HZ], [262, HZ - 5, 'p'], [280, HZ - 3, 'v'], [296, HZ - 8, 'p'], [318, HZ - 4], [340, HZ]], HZ, far);
    mountain(L, [[540, HZ], [556, HZ - 10, 'p'], [566, HZ - 7, 'v'], [578, HZ - 12, 'p'], [600, HZ - 5], [622, HZ]], HZ, far);
    mountain(L, [[70, HZ], [88, HZ - 6], [104, HZ - 16], [118, HZ - 22, 'v'], [130, HZ - 32, 'p'], [146, HZ - 18, 'v'], [158, HZ - 21, 'p'], [176, HZ - 9], [190, HZ - 6], [214, HZ]], HZ, mid);
    mountain(L, [[384, HZ], [398, HZ - 9], [410, HZ - 20, 'p'], [420, HZ - 13, 'v'], [432, HZ - 17, 'p'], [446, HZ - 8], [470, HZ]], HZ, mid);
    // water
    let y = HZ;
    L.row(0, L.w - 1, y, C('#5a92e0'));
    dashRow(L, rnd, y, 16, 5, 13, 0.25, C('#c4e6f8'));
    y = water(L, y + 1, '1100000001001011011121121222232232333');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[3]);
    for (let r = 2; r <= 18; r++) dashRow(L, rnd, HZ + r, r < 8 ? 20 : 34, 1, r < 8 ? 3 : 5, r < 8 ? 0.35 : 0.5, r % 3 ? GL : GL2, GL2);
    return L;
  }

  function makeSeaNear() {
    const L = layer(384, 100);
    const rnd = rng(23);
    let y = 0;
    dashRow(L, rnd, 0, 12, 4, 9, 0.2, SEA[3]);
    L.row(0, L.w - 1, 2, SEA[3]);
    dashRow(L, rnd, 1, 12, 5, 10, 0.1, SEA[3]);
    y = water(L, 3, '3334334344344454454555655656667667777');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[7]);
    for (let r = 2; r <= 30; r += 2) dashRow(L, rnd, r + (r % 4 ? 1 : 0), 40, 2, 7, 0.45, r % 3 ? GL : GL2, GL2);
    return L;
  }

  // ===================== mid headlands + lagoon =====================
  const WL = 56; // waterline row inside the headland layer
  const GRASS = { tones: CS(['#b4eca0', '#7ed69a', '#50bc92', '#36a28a', '#2c8886']), thr: [0.82, 0.45, 0.05, -0.4], grad: [0.1, -0.3], dith: 0.1 };
  const ROCK = CS(['#f2ead8', '#d6ccd0', '#aea8c4', '#8a86b0', '#6c6a9a']);

  function rock(L, cols, base) {
    const x0 = cols[0][0], x1 = cols[cols.length - 1][0] + cols[cols.length - 1][1];
    cols.forEach((cl, i) => {
      const [cx, cw, top] = cl, u = (cx + cw / 2 - x0) / (x1 - x0);
      const t = Math.min(4, (u < 0.3 ? 1 : u < 0.68 ? 2 : 3) + (i & 1));
      for (let y = top; y < base; y++) for (let x = cx; x < cx + cw; x++) {
        let k = t;
        if (base - y <= 6 && (base - y <= 3 || d2(x, y) < 0.5)) k = Math.min(4, k + 1);
        L.set(x, y, ROCK[k]);
      }
      L.col(cx, top, base - 1, ROCK[Math.max(0, t - 1)]);
      L.row(cx, cx + cw - 1, top, ROCK[Math.max(0, t - 1)]);
      L.set(cx, top, ROCK[0]);
    });
  }

  function makeHills() {
    const L = layer(1024, 144);
    const rnd = rng(31);
    const hill = (list) => puffs(L, list.map(m => [m[0], WL + m[1], m[2], m[3]]), Object.assign({ clip: WL, top: WL - 44, base: WL }, GRASS));
    // headland A: mesa with waterfall
    hill([[150, 4, 84, 34]]);
    rock(L, [[96, 7, WL - 30], [103, 9, WL - 38], [112, 8, WL - 43], [120, 10, WL - 40], [130, 6, WL - 34], [136, 9, WL - 42], [145, 8, WL - 44], [153, 10, WL - 39], [163, 7, WL - 33], [170, 6, WL - 26]], WL);
    hill([[70, 3, 40, 18]]);
    hill([[208, 2, 44, 16]]);
    // island B: long and green
    hill([[440, 3, 60, 24]]); hill([[520, 3, 70, 30]]); hill([[590, 2, 36, 14]]);
    // sea stacks
    rock(L, [[664, 8, WL - 18], [672, 10, WL - 30], [682, 7, WL - 21], [689, 6, WL - 10]], WL);
    // headland D
    hill([[860, 4, 90, 44]]); hill([[800, 3, 40, 16]]); hill([[930, 2, 50, 20]]);
    // lagoon
    let y = WL;
    dashRow(L, rnd, y, 10, 4, 8, 0.1, SEA[7]);
    y = water(L, y + 1, '7778778788788898898999a99a9aaa');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[10]);
    for (let r = 3; r <= 40; r += 3) dashRow(L, rnd, WL + r, 56, 3, 9, 0.4, GL, GL2);
    return L;
  }

  // ===================== near jungle =====================
  function makeJungle() {
    const L = layer(768, 112);
    const rnd = rng(47);
    const J = { tones: CS(['#63c078', '#3a9e68', '#237e62', '#1a6258']), thr: [0.85, 0.4, -0.15], grad: [0.1, -0.5] };
    const prof = x => 36 + 7 * Math.sin((x / 768) * Math.PI * 4 + 1) + 5 * Math.sin((x / 768) * Math.PI * 10 + 2.3) + 3 * Math.sin((x / 768) * Math.PI * 22);
    const list = [];
    for (let x = 0; x < 768;) { const r = 6 + Math.floor(rnd() * 6); list.push([x + r * 0.6, prof(x) + r + rnd() * 3, r]); x += r * 1.2; }
    // fill
    for (let x = 0; x < 768; x++) L.col(x, Math.round(prof(x)) + 6, L.h - 1, J.tones[3]);
    for (const p of list) puffs(L, [p], Object.assign({ top: p[1] - p[2], base: p[1] + p[2] }, J));
    for (const p of list) puffs(L, [[p[0] - 384, p[1], p[2]]], Object.assign({ top: p[1] - p[2], base: p[1] + p[2] }, J));
    return L;
  }

  // ===================== assemble =====================
  return {
    sky: bake(makeSky()),
    layers: [
      { img: bake(makeBank()), y: 20, speed: 0.02, auto: 1 },
      { img: bake(makeFloaters()), y: 4, speed: 0.04, auto: 2.5 },
      { img: bake(makeSeaFar()), y: 108 - HZ, speed: 0.06 },
      { img: bake(makeSeaNear()), y: 120, speed: 0.11 },
      { img: bake(makeHills()), y: 130 - WL, speed: 0.22 },
      { img: bake(makeJungle()), y: 106, speed: 0.45 },
    ],
  };
});
