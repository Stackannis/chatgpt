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

  // ASCII stamp ('.' = transparent), optionally mirrored.
  function stamp(L, x, y, rows, map, flip) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][flip ? rows[j].length - 1 - i : i];
      if (ch !== '.') L.set(x + i, y + j, map[ch]);
    }
  }
  // Scanline polygon -> rows [y, xa, xb] of pixels whose centres are inside.
  function polyRows(pts) {
    let ya = 1e9, yb = -1e9;
    for (const p of pts) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
    const rows = [];
    for (let y = Math.floor(ya); y < Math.ceil(yb); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.ceil(xs[i] - 0.5), xb = Math.ceil(xs[i + 1] - 0.5) - 1;
        if (xb >= xa) rows.push([y, xa, xb]);
      }
    }
    return rows;
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
        const t = ty * (1 - gx) + ((x - x0) / bw) * gx, val = v[i] + g0 + (g1 - g0) * t - (o.foot || 0) * Math.max(0, ty * 5 - 4), dd = (d2(x, y) - 0.5) * 2;
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
    // tidy (three rounds, each can expose work for the next): no 1px nubs on the
    // silhouette; tone slivers and blobs smaller than o.blob px melt into their surroundings
    const at = (x, y) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : out[y * bw + x]);
    const minB = o.blob || 6;
    for (let pass = 0; pass < 3; pass++) {
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
      if (dith) continue;
      const lab = new Uint8Array(bw * bh);
      for (let s0 = 0; s0 < out.length; s0++) {
        if (!out[s0] || lab[s0]) continue;
        const c = out[s0], comp = [s0], cnt = {};
        lab[s0] = 1;
        for (let h = 0; h < comp.length; h++) {
          const i = comp[h], x = i % bw;
          for (const j of [x > 0 ? i - 1 : -1, x < bw - 1 ? i + 1 : -1, i - bw, i + bw]) {
            if (j < 0 || j >= out.length || !out[j]) continue;
            if (out[j] === c) { if (!lab[j]) { lab[j] = 1; comp.push(j); } } else cnt[out[j]] = (cnt[out[j]] || 0) + 1;
          }
        }
        if (comp.length >= minB) continue;
        let best = 0, bn = 0;
        for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
        if (best) for (const i of comp) out[i] = best;
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
  function cumulus(L, ox, oy, lobes, o, sag) {
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
    const clip = x => { let d = 0; for (const g of sag || []) if (x >= ox + g[0] && x < ox + g[1]) d = Math.max(d, g[2]); return oy + d; };
    puffs(L, list, Object.assign({ top, base: oy, clip }, o));
  }
  // dissolve the lower rows of a layer into haze colour c (ordered 25/50/75%)
  function fade(L, ya, yb, c) {
    for (let y = ya; y < L.h; y++) {
      const f = Math.min(1, (Math.floor(((y - ya) / (yb - ya)) * 4) + 1) / 4);
      for (let x = 0; x < L.w; x++) if (L.d[y * L.w + x] && f > d2(x, y)) L.d[y * L.w + x] = c;
    }
  }

  const HERO = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0', '#869fe6']), thr: [0.84, 0.3, -0.12, -0.62], grad: [0.3, -0.6], gx: 0.3, flat: 1.9, foot: 0.5, blob: 12 };
  const SMALL = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0']), thr: [0.6, 0.0, -0.5], grad: [0.35, -0.5], gx: 0.2, flat: 1.7 };

  function makeFloaters() {
    const L = layer(768, 112);
    // A — the big hero cumulus
    cumulus(L, 52, 72, [
      [86, 4, 62, 12], [146, 2, 26, 6],
      [5, 3, 5], [15, 9, 9, [[130, 4]]], [24, 15, 9, [[140, 3]]], [140, 8, 12, [[60, 4], [20, 3]]],
      [72, 55, 11, [[105, 4], [50, 4]]],
      [58, 42, 22, [[165, 5], [130, 6], [95, 5]]],
      [33, 25, 14, [[150, 5], [105, 5]]],
      [88, 38, 15, [[80, 5], [35, 5]]],
      [108, 27, 13, [[60, 4], [15, 4]]],
      [124, 16, 11, [[50, 4]]],
      [44, 14, 15], [70, 12, 14], [94, 8, 11], [25, 6, 9], [114, 5, 8], [160, 3, 6],
    ], HERO, [[24, 62, 1], [34, 52, 2], [82, 128, 1], [94, 116, 2]]);
    // B — medium
    cumulus(L, 372, 50, [
      [48, 3, 40, 8],
      [3, 3, 4], [92, 4, 5], [12, 8, 8], [80, 10, 9, [[40, 3]]],
      [44, 28, 15, [[150, 4], [100, 5], [50, 4]]],
      [64, 22, 11, [[70, 4], [20, 3]]],
      [26, 18, 11, [[140, 4]]],
      [38, 8, 11], [58, 6, 9], [22, 4, 6], [74, 3, 5],
    ], HERO, [[26, 66, 1], [34, 54, 2]]);
    // C — long and low
    cumulus(L, 566, 38, [
      [62, 2, 54, 6],
      [6, 3, 5], [120, 2, 3], [110, 4, 5], [20, 9, 9, [[130, 3]]], [96, 8, 8, [[40, 3]]],
      [38, 15, 11, [[110, 4], [60, 4]]], [58, 18, 12, [[95, 4], [45, 4]]], [78, 14, 10, [[60, 4]]],
      [30, 4, 7], [48, 5, 9], [68, 4, 8], [86, 3, 6],
    ], HERO, [[30, 90, 1]]);
    // D — small
    cumulus(L, 262, 28, [
      [28, 2, 22, 5],
      [3, 2, 3], [52, 4, 5], [12, 6, 7], [24, 13, 10, [[140, 3], [80, 4]]], [40, 10, 8, [[50, 3]]],
      [22, 3, 6], [36, 3, 5],
    ], SMALL);
    // wisps
    cumulus(L, 500, 84, [[20, 1, 16, 3], [8, 3, 4], [34, 2, 3], [16, 5, 5], [26, 3, 4]], SMALL);
    cumulus(L, 706, 64, [[14, 1, 10, 3], [6, 3, 3], [22, 3, 3], [14, 4, 5]], SMALL);
    return L;
  }

  // Far cloud bank: cumulus towers rising from behind the horizon, plus ranks of tiny
  // flat-based clouds that shrink toward it (the classic depth cue).
  function makeBank() {
    const L = layer(768, 96);
    const BANK = { tones: CS(['#fffdf0', '#e6f0f6', '#cfe2f6', '#b6d1f0']), thr: [0.84, 0.3, -0.12], grad: [0.3, -0.6], gx: 0.3, flat: 1.9, blob: 12 };
    const TINY = { tones: CS(['#fffdf0', '#e6f0f6', '#cfe2f6']), thr: [0.5, -0.15], grad: [0.3, -0.5], flat: 1.8, blob: 4 };
    const tower = lobes => cumulus(L, 0, 96, lobes, Object.assign({ clip: null }, BANK));
    const tiny = (x, up, k) => cumulus(L, x, 96 - up, [
      [[13, 1, 11, 3], [5, 2, 3], [21, 2, 3], [11, 4, 5], [17, 3, 4]],
      [[9, 1, 8, 2], [4, 2, 3], [14, 2, 2], [9, 3, 4]],
      [[5, 1, 5, 2], [3, 1, 2], [6, 2, 3]],
    ][k], TINY);
    tower([
      [112, 4, 70, 14],
      [170, 10, 9], [40, 9, 8], [56, 16, 11, [[135, 4]]], [150, 18, 12, [[50, 4]]],
      [100, 34, 18, [[150, 5], [105, 6], [60, 5]]], [76, 26, 13, [[140, 4], [95, 4]]], [128, 28, 14, [[70, 5], [25, 4]]],
      [90, 14, 14], [114, 12, 13], [136, 8, 11], [68, 8, 10], [156, 5, 8], [50, 4, 7],
    ]);
    tower([[300, 3, 40, 9], [268, 7, 7], [336, 7, 7], [302, 20, 12, [[125, 4], [65, 4]]], [284, 13, 10, [[140, 3]]], [320, 13, 10, [[45, 3]]], [294, 8, 9], [312, 7, 8]]);
    tower([
      [516, 4, 86, 16],
      [596, 10, 10], [452, 10, 9], [436, 5, 6], [610, 4, 6], [474, 20, 12, [[140, 4]]], [576, 20, 13, [[55, 4], [15, 4]]],
      [524, 40, 20, [[160, 5], [120, 6], [80, 6], [40, 5]]], [498, 30, 15, [[145, 5], [100, 4]]], [552, 32, 15, [[70, 5], [30, 5]]],
      [510, 16, 15], [538, 15, 14], [486, 9, 11], [562, 9, 11], [524, 6, 10], [466, 4, 7], [584, 4, 8],
    ]);
    tower([[706, 3, 40, 10], [670, 8, 8], [742, 8, 8], [704, 24, 14, [[135, 5], [75, 5]]], [686, 16, 11, [[150, 4]]], [724, 17, 11, [[45, 4]]], [698, 9, 10], [716, 8, 9]]);
    for (const [x, up, k] of [[210, 22, 0], [366, 24, 0], [626, 22, 0], [196, 15, 1], [238, 14, 1], [392, 16, 1], [644, 14, 1], [752, 15, 1], [6, 14, 1],
      [226, 10, 2], [352, 11, 2], [410, 10, 2], [660, 10, 2], [22, 10, 2], [380, 11, 2]]) tiny(x, up, k);
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
  function mountain(L, base, ptsUp, pal, o) {
    o = o || {};
    const pts = ptsUp.map(p => [p[0], base - p[1], p[2]]);
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
      let best = -1e9, kind = 'G', d = 1e9;
      for (const dv of div) {
        if (y < dv.y0 || (dv.y1 != null && y >= dv.y1)) continue;
        const px = dv.x[y - dv.y0];
        if (px <= x + 0.5 && px > best) { best = px; kind = dv.k; }
        if (dv.k === 'S' && px > x + 0.5) d = Math.min(d, px - x);
      }
      // lit faces: brightest right beside their spine, mid tone further down the slope
      let c = kind === 'S' ? pal.shade : d < 3 + (y - top[x - xa]) * 0.35 || !pal.mid ? pal.lit : pal.mid;
      if (pal.haze && (base - y <= 2 || (base - y <= 4 && d2(x, y) < 0.5))) c = pal.haze;
      L.set(x, y, c);
    }
  }

  const HZ = 40; // horizon row inside the far-sea layer
  function makeSeaFar() {
    const L = layer(640, 150);
    const rnd = rng(11);
    // islands (drawn first; the sea covers their feet)
    const far = { lit: C('#c6dcf4'), shade: C('#b2cdf0'), haze: C('#d8e9f6') };
    const mid = { lit: C('#b4cff2'), mid: C('#a2c0ec'), shade: C('#88a8e2'), haze: C('#c6dbf4') };
    mountain(L, HZ, [[262, 0], [276, 3], [290, 7, 'p'], [300, 5, 'v'], [312, 9, 'p'], [330, 4], [348, 0]], far);
    mountain(L, HZ, [[536, 0], [548, 5], [556, 11, 'p'], [574, 10], [584, 8, 'v'], [592, 12, 'p'], [606, 5], [626, 0]], far);
    mountain(L, HZ, [[60, 0], [74, 3], [92, 8], [104, 16], [112, 26], [118, 30], [124, 36, 'p'], [128, 31], [134, 27, 'v'], [142, 30, 'p'], [150, 22], [158, 18, 'v'], [166, 20, 'p'], [178, 12], [196, 7], [214, 3], [230, 0]], mid);
    mountain(L, HZ, [[392, 0], [404, 6], [412, 14], [420, 22, 'p'], [426, 16, 'v'], [434, 19, 'p'], [444, 10], [458, 5], [478, 0]], mid);
    mountain(L, HZ, [[504, 0], [508, 4, 'p'], [514, 0]], mid);
    // a ring of mist round the big peak
    puffs(L, [[104, HZ - 15, 13, 3], [124, HZ - 18, 15, 3], [146, HZ - 16, 12, 2.5], [164, HZ - 13, 9, 2]], { tones: CS(['#fbfcf2', '#dfeaf6']), thr: [0.2], blob: 3 });
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
  const WL = 64; // waterline row inside the headland layer
  const GRASS = { tones: CS(['#bfeba4', '#8cd79e', '#60bf98', '#44a792', '#358e8e']), thr: [0.9, 0.52, 0.12, -0.3], grad: [0.22, -0.5], gx: 0.15, dith: [0.08, 0.1, 0.1, 0.1] };
  const WOOD = { tones: CS(['#98dc94', '#60c08c', '#3ea486', '#308882', '#28707c']), thr: [0.9, 0.5, 0.0, -0.5], grad: [0.15, -0.35], flat: 1.6, blob: 4 };
  const ROCK = CS(['#f8f0dc', '#e2d6d0', '#bcb2c8', '#978fb6', '#7872a2']);
  const FOAM = C('#f8ffff'), FOAM2 = C('#c6ecf8'), FOAM3 = C('#94d6f2');
  const SAND = C('#f6eebc'), SAND2 = C('#dccf9e');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // Rock face. pts: silhouette [x, up] (up = height above the waterline row `base`).
  // o.folds: fold lines [[x, up], ...] running top -> bottom; they split the face into
  // planes toned by o.tones (lit / shade alternating). A ridge (lit plane meeting a darker
  // one) catches a highlight, a crease gets a dark crack. o.strata: [[up, xa, xb]] bedding
  // lines, o.cracks: [[x, upTop, upBottom]], o.cap: rows of shade under overhanging growth.
  function cliff(L, base, pts, o) {
    const rows = polyRows(pts.map(p => [p[0], base - p[1]])), topY = {};
    for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) if (topY[x] == null) topY[x] = y;
    const fx = (fl, y) => {
      const up = base - y;
      if (up >= fl[0][1]) return fl[0][0];
      for (let i = 0; i < fl.length - 1; i++) {
        const p = fl[i], q = fl[i + 1];
        if (up <= p[1] && up >= q[1]) return p[0] + ((p[1] - up) / Math.max(1e-6, p[1] - q[1])) * (q[0] - p[0]);
      }
      return fl[fl.length - 1][0];
    };
    const plane = (x, y) => { let p = 0; for (const fl of o.folds) if (fx(fl, y) <= x) p++; return p; };
    const darker = (x, y, n) => { const i = ROCK.indexOf(L.get(x, y)); if (i >= 0) L.set(x, y, ROCK[Math.min(4, i + n)]); };
    for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) {
      const p = plane(x, y), pn = x < x1 ? plane(x + 1, y) : p;
      let t = o.tones[p];
      const capped = y - topY[x] < (o.cap || 0);
      if (pn !== p) t += o.tones[pn] > t ? -1 : 1;
      else if (x === x0 && t <= 2 && !capped) t--;
      if (capped) t++;
      if (base - y <= 2) t++;
      L.set(x, y, ROCK[clamp(t, 0, 4)]);
    }
    for (const [up, xa, xb] of o.strata || []) for (let x = xa; x <= xb; x++) darker(x, base - up, 1);
    for (const h of o.holes || []) {
      // see-through arch [x, w, height]: rounded opening, its left + top inner wall in shade
      const [hx, hw, hh] = h, r = hw / 2;
      const inside = (x, up, k) => { const dx = x + 0.5 - (hx + r + k), top = hh - r - k; return up >= 0 && Math.abs(dx) <= r && (up <= top || dx * dx + (up - top) * (up - top) <= r * r); };
      for (let up = 0; up <= hh + 1; up++) for (let x = hx - 3; x <= hx + hw + 3; x++) {
        if (inside(x, up + 0.5, 0)) L.set(x, base - 1 - up, inside(x, up + 2.5, 2) ? 0 : ROCK[4]);
      }
    }
    for (const [x, ua, ub] of o.cracks || []) for (let up = ub; up <= ua; up++) darker(x, base - up, 2);
  }
  // Waterfall: long white streaks between paler edges, a lip on top, mist at its foot.
  const FPH = [0, 7, 3, 10, 5, 1, 8, 4];
  function falls(L, x, y0, y1, w, mist) {
    for (let i = 0; i < w; i++) for (let y = y0; y < y1; y++) {
      const edge = i === 0 || i === w - 1, ph = (y - y0 + FPH[i % 8]) % 12;
      L.set(x + i, y, edge ? (ph < 7 ? FOAM2 : FOAM3) : ph < 9 ? FOAM : FOAM2);
    }
    L.row(x - 1, x + w, y0, FOAM); L.row(x, x + w - 1, y0 + 1, FOAM);
    L.col(x + w, y0 + 1, y1 - 1, ROCK[4]);
    if (mist) puffs(L, mist.map(m => [x + m[0], y1 - m[1], m[2]]), { tones: [FOAM, FOAM2], thr: [-0.3], grad: [0.3, -0.3], blob: 3 });
  }
  // Tiny far palms (a = lit frond, b = frond, t = trunk, c = lit trunk)
  const PALM_S = [
    ['....aa...aa....', '..aabba.abbaa..', '.abbbbbabbbbba.', 'abb.bbbtbbb.bba', 'bb..bb.t.bb..bb', 'b...b..t..b...b', '.......t.......', '......ct.......', '......t........', '......t........', '.....ct........', '.....t.........', '.....t.........'],
    ['...aaa...aa...', '.aabbba.abbaa.', 'abb.bbbabbbbba', 'bb..bbtbb..bbb', 'b..bb.t.bb..bb', '...b..t..b...b', '.....ct.......', '.....t........', '....ct........', '....t.........', '....t.........'],
  ];

  // Ancient stepped sun temple, far away on a hilltop (base row `by`, centred on cx).
  function ziggurat(L, cx, by) {
    let y = by;
    for (const [w, h] of [[27, 4], [21, 4], [15, 4], [9, 3], [5, 4]]) {
      const x0 = cx - (w >> 1);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let t = i >= w - Math.ceil(w / 4) ? 3 : 2;
        if (j === 0) t = i >= w - Math.ceil(w / 4) ? 2 : 0; else if (i === 0) t = 1;
        if (Math.abs(x0 + i - cx) <= 1 && w > 5) t = j === 0 ? 0 : x0 + i - cx === 1 ? 3 : 1; // the stair
        L.set(x0 + i, y - h + j, ROCK[t]);
      }
      y -= h;
    }
    L.row(cx - 3, cx + 3, y, ROCK[0]); L.row(cx - 2, cx + 2, y - 1, ROCK[1]);
    L.col(cx, y + 2, y + 3, ROCK[4]);
  }

  function makeHills() {
    const L = layer(1024, 152);
    const rnd = rng(31);
    const PM = { a: WOOD.tones[0], b: WOOD.tones[2], c: C('#a09cb0'), t: C('#74709a') };
    let ox = 0;
    // rolling mound: upper cap of an ellipse [x, sink, rx, ry] (centre `sink` px under water)
    const hill = (...ms) => { for (const m of ms) puffs(L, [[ox + m[0], WL + m[1], m[2], m[3]]], Object.assign({ clip: WL, top: WL + m[1] - m[3], base: WL }, GRASS)); };
    const spit = (x, rx, ry) => puffs(L, [[ox + x, WL, rx, ry]], { clip: WL, tones: [C('#fff8d2'), SAND, SAND2], thr: [0.75, 0.2] });
    // grove: a line of n small crowns of radius ~r starting at [x, up], climbing `rise` px each
    const grove = (x, up, n, r, rise, seed) => {
      const q = rng(seed), list = [];
      let top = 1e9, bot = -1e9;
      for (let i = 0; i < n; i++) {
        const cx = ox + x + i * r * 1.35 + (q() - 0.5) * 2, cy = WL - (up + i * rise + (q() - 0.5) * 2), rr = r + (q() < 0.4 ? 1 : 0);
        for (const ang of [135, 55]) if (q() < 0.75) { const g = (ang * Math.PI) / 180; list.push([cx + Math.cos(g) * rr * 0.8, cy - Math.sin(g) * rr * 0.8, rr * 0.55]); }
        list.push([cx, cy, rr, rr * 0.85]);
        top = Math.min(top, cy - rr * 1.3); bot = Math.max(bot, cy + rr);
      }
      puffs(L, list, Object.assign({ clip: WL, top, base: bot }, WOOD));
    };
    const palmS = (x, up, k, flip) => stamp(L, ox + x - (flip ? PALM_S[k][0].length - 1 - 6 : 6), WL - up - PALM_S[k].length + 1, PALM_S[k], PM, flip);
    const boulders = list => puffs(L, list.map(p => [ox + p[0], WL - p[1], p[2], p[3]]), { tones: [ROCK[1], ROCK[2], ROCK[3]], thr: [0.55, -0.1], clip: WL, blob: 3 });
    const vines = list => { for (const [x, up, n] of list) L.col(ox + x, WL - up, WL - up + n - 1, WOOD.tones[3]); };
    const rockface = (pts, o) => cliff(L, WL, pts.map(p => [ox + p[0], p[1]]), Object.assign({}, o, {
      folds: o.folds.map(fl => fl.map(p => [ox + p[0], p[1]])), strata: (o.strata || []).map(q => [q[0], ox + q[1], ox + q[2]]),
      cracks: (o.cracks || []).map(q => [ox + q[0], q[1], q[2]]), holes: (o.holes || []).map(q => [ox + q[0], q[1], q[2]]) }));
    const fall = (x, up, w, mist) => falls(L, ox + x, WL - up, WL, w, mist);

    // ---- headland A: table mountain with the twin falls ----
    ox = 50;
    spit(20, 26, 4);
    hill([150, 30, 76, 68], [56, 12, 40, 28], [88, 16, 40, 40]);
    grove(60, 17, 3, 4, 1.5, 1); grove(78, 23, 3, 5, 1, 21);
    rockface([[100, 0], [101, 9], [104, 11], [105, 24], [107, 26], [108, 38], [110, 41], [113, 44], [124, 45], [136, 44], [150, 46], [158, 44], [160, 41], [161, 30], [164, 28], [178, 28], [181, 26], [182, 14], [185, 11], [186, 0]], {
      folds: [[[120, 46], [120, 30], [121, 28], [121, 12], [122, 10], [122, 0]], [[127, 46], [127, 0]], [[151, 46], [151, 32], [152, 30], [152, 16], [154, 14], [154, 0]],
        [[161, 46], [161, 30], [160, 28], [160, 14], [162, 12], [162, 0]], [[174, 28], [174, 14], [176, 12], [176, 0]]],
      tones: [1, 3, 1, 3, 2, 4], cap: 3,
      strata: [[30, 106, 118], [29, 136, 149], [14, 103, 119], [13, 135, 152], [12, 163, 173], [21, 141, 150], [36, 109, 114]],
      cracks: [[112, 41, 37], [143, 20, 15], [110, 8, 3], [146, 43, 38], [168, 24, 18], [115, 24, 17]],
    });
    fall(128, 45, 6, [[-4, 1, 3], [3, 2, 4], [9, 1, 3], [-1, 4, 2], [6, 5, 3], [2, 6, 2]]);
    fall(166, 28, 3, [[-2, 1, 2], [2, 2, 3], [5, 1, 2]]);
    vines([[106, 37, 4], [116, 43, 6], [139, 43, 5], [147, 44, 3], [156, 42, 6], [171, 27, 4]]);
    grove(124, 52, 4, 5, 0.5, 3); grove(111, 46, 3, 5, 1, 4); grove(137, 47, 4, 5, 0.3, 5); grove(162, 29, 3, 3, 0, 6);
    palmS(118, 53, 1); palmS(150, 53, 0, true);
    boulders([[98, 1, 3], [118, 0, 3], [140, 1, 4, 3], [158, 1, 3], [189, 0, 3]]);
    hill([214, 14, 38, 38], [246, 12, 36, 26]);
    spit(280, 24, 4);
    grove(204, 22, 3, 5, 0.5, 8); grove(236, 15, 3, 4, -1, 22);
    palmS(14, 3, 0); palmS(26, 3, 1, true); palmS(70, 21, 1); palmS(258, 11, 0, true); palmS(284, 3, 1); palmS(294, 2, 0, true);

    // ---- a palm islet ----
    ox = 0;
    spit(420, 16, 3); grove(414, 3, 2, 3, 0, 31); palmS(418, 3, 0); palmS(426, 2, 1, true);

    // ---- island B: rolling hills crowned by the sun temple ----
    ox = 470;
    spit(8, 22, 4);
    hill([112, 22, 56, 62], [40, 12, 40, 26]);
    ziggurat(L, ox + 76, WL - 22);
    hill([78, 16, 34, 38]);
    grove(62, 22, 3, 4, 0.5, 9); grove(84, 22, 3, 4, -0.5, 10);
    hill([150, 16, 44, 36], [186, 10, 34, 20]);
    grove(104, 40, 4, 5, 0, 11); grove(140, 21, 3, 5, -1, 23); grove(28, 14, 3, 4, 1, 24);
    spit(214, 20, 3);
    palmS(4, 3, 0); palmS(14, 3, 1, true); palmS(50, 15, 1); palmS(128, 38, 0, true); palmS(176, 12, 1); palmS(198, 8, 0, true); palmS(220, 2, 1);

    // ---- sea stacks + the arch ----
    ox = 0;
    rockface([[745, 0], [746, 8], [749, 12], [749, 26], [752, 30], [760, 31], [763, 26], [764, 12], [767, 9], [768, 0]], { folds: [[[757, 31], [757, 14], [759, 12], [759, 0]]], tones: [1, 3], strata: [[14, 750, 756], [22, 750, 756]] });
    rockface([[771, 0], [772, 10], [774, 15], [780, 16], [783, 11], [784, 0]], { folds: [[[779, 16], [779, 0]]], tones: [1, 3], strata: [[8, 773, 778]] });
    grove(753, 31, 2, 3, 0, 12);
    boulders([[742, 0, 3], [769, 1, 3], [786, 0, 2]]);
    rockface([[800, 0], [801, 8], [804, 12], [805, 19], [809, 23], [822, 26], [836, 25], [842, 21], [844, 12], [847, 9], [848, 0]], {
      folds: [[[812, 27], [812, 16], [814, 14], [814, 0]], [[817, 27], [817, 0]], [[836, 27], [836, 12], [838, 10], [838, 0]]],
      tones: [1, 3, 1, 3], strata: [[18, 806, 811], [19, 820, 834], [9, 802, 812]], holes: [[819, 14, 15]],
    });
    grove(810, 25, 4, 3, 0.3, 32); palmS(828, 26, 1);
    boulders([[798, 0, 3], [850, 0, 3]]);

    // ---- headland D: the green bluff ----
    ox = 16;
    spit(858, 20, 3);
    hill([940, 28, 74, 76], [886, 12, 36, 28]);
    rockface([[910, 0], [911, 9], [915, 12], [916, 24], [920, 27], [922, 34], [944, 39], [948, 36], [949, 20], [953, 17], [954, 0]], {
      folds: [[[928, 40], [928, 26], [929, 24], [929, 0]], [[933, 40], [933, 0]], [[944, 40], [944, 22], [946, 20], [946, 0]]],
      tones: [1, 3, 1, 3], cap: 3, strata: [[24, 917, 927], [12, 912, 928], [22, 939, 943], [11, 940, 945]], cracks: [[922, 30, 26], [940, 34, 29]],
    });
    fall(934, 37, 4, [[-3, 1, 3], [2, 2, 3], [6, 1, 2], [1, 4, 2]]);
    vines([[918, 28, 4], [925, 35, 5], [941, 38, 4], [947, 36, 3]]);
    grove(916, 37, 3, 5, 1.5, 13); grove(938, 42, 5, 5, 0.5, 14);
    hill([988, 16, 40, 36]);
    grove(970, 30, 3, 5, -2, 15);
    palmS(960, 47, 0); palmS(856, 3, 1); palmS(866, 2, 0, true); palmS(1004, 14, 0, true); palmS(882, 14, 1);
    boulders([[908, 0, 3], [930, 1, 3], [955, 0, 3]]);
    ox = 0;

    // ---- beaches: pale sand where grass meets the water ----
    const grassy = new Set(GRASS.tones.concat(WOOD.tones));
    for (let x = 0; x < L.w; x++) {
      const c = L.get(x, WL - 1);
      if (grassy.has(c)) { L.set(x, WL - 1, SAND); if (grassy.has(L.get(x, WL - 2)) && (x * 7) % 11 < 7) L.set(x, WL - 2, SAND2); }
    }
    // ---- lagoon ----
    const land = new Uint8Array(L.w);
    for (let x = 0; x < L.w; x++) { const c = L.get(x, WL - 1); land[x] = !c ? 0 : c === SAND || c === SAND2 ? 1 : c === FOAM || c === FOAM2 ? 3 : 2; }
    let y = water(L, WL, '7778778788788898898999a99a9aaa');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[10]);
    // reef line where the open sea meets the lagoon, reflections under the land
    const REFL = [0, C('#42b4b0'), C('#7f9cc4'), C('#d6f6f6')];
    for (let r = 0; r < 5; r++) {
      let on = 0, n = 0;
      for (let x = 0; x < L.w; x++) {
        if (n-- <= 0) { on = rnd() < 0.86 - r * 0.2; n = on ? 3 + Math.floor(rnd() * 8) : 1 + Math.floor(rnd() * (2 + r * 2)); }
        if (land[x] && on) L.set(x, WL + r, REFL[land[x]]);
      }
    }
    for (let x = 0; x < L.w; x++) if (!land[x] && (x * 5) % 23 < 15) L.set(x, WL, C('#bfeef0'));
    for (let r = 4; r <= 44; r += 3) dashRow(L, rnd, WL + r + (r & 1), 60, 3, 9, 0.4, GL, C('#c8f6ee'));
    return L;
  }

  // ===================== near jungle =====================
  // Sits right behind the action, so it is a hazy blue-teal silhouette: big rounded crowns with a
  // thin light rim, flat bodies, dark hollows between them, sinking into one quiet tone.
  const J = CS(['#8bccb1', '#6bb29e', '#569c91', '#488c8c', '#3f737d']);
  const JA = CS(['#a6dccb', '#86c4b6', '#74b2ac']);
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const d4 = (x, y) => (B4[(x & 3) | ((y & 3) << 2)] + 0.5) / 16;

  // Leaf masses. clumps: [cx, cy, rx, ry, group, set] in painter's order (later = nearer);
  // sets[set] = tones [rim, rim2, body, shade, deep]. Graphic shading: a 1px light rim (plus a
  // softer second row) on every exposed upper-left edge, a flat body, a shade crescent on the
  // lower right, and a cast shadow under whatever clump is nearer. Wraps seamlessly.
  function foliage(L, clumps, sets) {
    const W = L.w, pad = 96, bw = W + pad * 2, bh = L.h, all = [];
    clumps.forEach((c, i) => { for (const s of [-W, 0, W]) if (c[0] + s + c[2] >= -pad && c[0] + s - c[2] < W + pad) all.push([c[0] + s, c[1], c[2], c[3], c[4], c[5], i]); });
    all.sort((a, b) => a[6] - b[6]);
    const own = new Int16Array(bw * bh).fill(-1);
    const ins = (i, x, y) => { const c = all[i], dx = (x + 0.5 - c[0]) / c[2], dy = (y + 0.5 - c[1]) / c[3]; return dx * dx + dy * dy <= 1; };
    all.forEach((c, i) => {
      for (let y = Math.max(0, Math.floor(c[1] - c[3])); y <= Math.min(bh - 1, Math.ceil(c[1] + c[3])); y++)
        for (let x = Math.max(-pad, Math.floor(c[0] - c[2])); x <= Math.min(W + pad - 1, Math.ceil(c[0] + c[2])); x++) if (ins(i, x, y)) own[y * bw + x + pad] = i;
    });
    const at = (x, y) => (y < 0 || y >= bh || x < -pad || x >= W + pad ? -1 : own[y * bw + x + pad]);
    for (let y = 0; y < bh; y++) for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (i < 0) continue;
      const c = all[i], sh = clamp(Math.round(c[3] * 0.3), 2, 7);
      const shade = !ins(i, x + sh * 0.5, y + sh);
      let cast = false;
      for (let k = 1; k <= 4 && !cast; k++) { const j = at(x - Math.round(k * 0.6), y - k); cast = j > i && k <= clamp(Math.round(all[j][3] * 0.2), 2, 4); }
      const a = at(x - 1, y - 1), b = at(x - 1, y - 2);
      let t = 2;
      if (!ins(i, x - 1, y - 1)) t = a > i ? 3 : a < 0 || all[a][4] !== c[4] ? 0 : 1;
      else if (!ins(i, x - 1, y - 2) && !(b > i)) t = b < 0 || all[b][4] !== c[4] ? 1 : 2;
      else if (cast) t = shade ? 4 : 3;
      else if (shade) t = 3;
      L.set(x, y, sets[c[5]][t]);
    }
  }
  // A tree crown: dome [cx, top, rx, ry] with leafy bumps tucked behind its upper rim (they only
  // break up the silhouette) and a few inner clumps in front of its lower half.
  function crown(list, g, set, cx, top, rx, ry, q) {
    const cy = top + ry, n = Math.max(4, Math.round(rx / 5.5));
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.1 - 1.2 * ((i + 0.5 + (q() - 0.5) * 0.5) / n)), rb = clamp((0.16 + 0.2 * q()) * rx, 3.5, 11);
      list.push([cx + Math.cos(a) * (rx - rb * 0.3), cy - Math.sin(a) * (ry - rb * 0.3), rb * 1.2, rb, g, set]);
    }
    list.push([cx, cy, rx, ry, g, set]);
    const m = rx > 34 ? 3 : 2;
    for (let i = 0; i < m; i++) {
      const u = (i + 0.5) / m - 0.5 + (q() - 0.5) * 0.2, rr = rx * (0.36 + 0.14 * q());
      list.push([cx + u * rx * 1.5, cy + ry * (0.2 + 0.3 * q()), rr, rr * 0.62, g, set]);
    }
  }

  // Palm fronds per crown shape: [start angle, length factor, bend (deg, toward the ground;
  // negative = blown back over the crown), depth 0 back .. 2 front].
  const FROND = {
    arch: [[200, 0.75, 45, 0], [-20, 0.75, 45, 0], [165, 1, 75, 1], [15, 1, 75, 1], [128, 1, 85, 2], [52, 1, 85, 2], [98, 0.6, 45, 2], [76, 0.55, 50, 1]],
    droop: [[195, 0.8, 60, 0], [-15, 0.8, 60, 0], [158, 1, 100, 1], [22, 1, 100, 1], [122, 0.95, 118, 2], [58, 0.95, 118, 2], [92, 0.5, 60, 2]],
    wind: [[168, 0.5, -30, 0], [142, 0.8, -70, 1], [112, 0.9, -80, 2], [84, 1, 70, 2], [52, 1.1, 55, 2], [24, 1.15, 40, 1], [-8, 0.9, 35, 0]],
    fan: [[190, 0.6, 25, 0], [-10, 0.6, 25, 0], [162, 0.9, 30, 1], [18, 0.9, 30, 1], [138, 1, 26, 2], [42, 1, 26, 2], [112, 1, 18, 2], [68, 1, 18, 2], [90, 0.9, 0, 2]],
  };
  function frond(L, x0, y0, a0, len, bend, cs, cl, R) {
    const sign = a0 > 90 && a0 < 270 ? 1 : -1, lmax = Math.max(2, R * 0.2);
    let fx = x0 + 0.5, fy = y0 + 0.5, lx = 1e9, ly = 1e9;
    for (let d = 0; d <= len; d += 0.25) {
      const s = d / len, ang = ((a0 + sign * bend * Math.pow(s, 1.4)) * Math.PI) / 180;
      fx += Math.cos(ang) * 0.25; fy -= Math.sin(ang) * 0.25;
      const px = Math.floor(fx), py = Math.floor(fy);
      if (px === lx && py === ly) continue;
      const prof = Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + s * 0.88)), 0.7);
      if (px !== lx) {
        let ll = Math.round(lmax * prof * Math.sqrt(Math.abs(Math.cos(ang))));
        if ((px & 1) && ll > 1) ll--;
        for (let k = 1; k <= ll; k++) L.set(px, py + k, cl);
      } else if (prof > 0.4) L.set(px + (py & 1 ? 1 : -1), py, cl);
      L.set(px, py, cs);
      lx = px; ly = py;
    }
  }
  // Palm: a 2px trunk (light left, dark right) on a smooth curve, rising h px from (x, y).
  function palm(L, x, y, h, lean, R, kind, c, flip) {
    let tx = x;
    for (let i = 0; i <= h; i++) {
      tx = x + Math.round(lean * (i / h) * (i / h));
      L.set(tx, y - i, c.tl); L.set(tx + 1, y - i, c.td);
    }
    const ty = y - h;
    for (const [a, lf, bend, lay] of FROND[kind]) frond(L, tx + (flip ? 1 : 0), ty, flip ? 180 - a : a, R * lf, bend, c.f[lay][0], c.f[lay][1], R);
    L.row(tx - 1, tx + 2, ty + 1, c.td); L.row(tx, tx + 1, ty + 2, c.td);
  }

  function makeJungle() {
    const L = layer(768, 128), TAU = Math.PI * 2;
    const SETS = { A: [JA[0], JA[1], JA[1], JA[2], JA[2]], H: [J[3], J[3], J[3], J[4], J[4]], B: J, C: [J[1], J[2], J[3], J[4], J[4]] };
    const PN = { tl: C('#a9c1b4'), td: C('#5c838c'), f: [[J[2], J[3]], [J[1], J[2]], [J[0], J[1]]] };
    const PF = { tl: C('#b9d2c6'), td: C('#7ea4a8'), f: [[JA[1], JA[2]], [JA[0], JA[1]], [JA[0], JA[1]]] };
    const back = x => 51 + 4 * Math.sin((x / 768) * TAU * 3 + 1) + 2 * Math.sin((x / 768) * TAU * 7);
    const q = rng(77);
    // far treeline (hazier, flatter)
    for (let x = 0; x < 768; x++) L.col(x, Math.round(back(x)) + 5, L.h - 1, JA[2]);
    const rowA = [];
    for (let i = 0; i < 34; i++) {
      const cx = (i + 0.5 + (q() - 0.5) * 0.5) * (768 / 34), rx = 10 + q() * 10;
      crown(rowA, i, 'A', cx, back(cx) - 2 + q() * 5, rx, rx * 0.62, q);
    }
    foliage(L, rowA, SETS);
    // palms: [x, base y, height, lean, frond radius, shape, flip, far?]
    for (const [x, y, h, lean, R, kind, flip, far] of [
      [116, 70, 56, 7, 19, 'arch', 0, 0], [516, 68, 50, -6, 18, 'wind', 1, 0],
      [252, 70, 34, -4, 13, 'droop', 0, 0], [270, 72, 26, 3, 10, 'fan', 0, 1], [288, 72, 38, 6, 13, 'wind', 0, 0],
      [402, 66, 24, -3, 10, 'arch', 1, 1], [420, 66, 36, 4, 13, 'fan', 0, 0],
      [640, 72, 30, -4, 11, 'arch', 0, 1], [660, 72, 42, 5, 14, 'droop', 0, 0], [684, 72, 28, 5, 10, 'wind', 0, 1],
      [18, 70, 28, -3, 10, 'fan', 0, 1], [36, 70, 38, 5, 13, 'arch', 1, 0],
    ]) palm(L, x, y, h, lean, R, kind, far ? PF : PN, flip);
    // dark hollows behind the main crowns
    const hol = x => back(x) + 13 + 2 * Math.sin((x / 768) * TAU * 11);
    for (let x = 0; x < 768; x++) L.col(x, Math.round(hol(x)) + 4, L.h - 1, J[4]);
    const rowH = [];
    for (let i = 0; i < 26; i++) { const cx = (i + 0.5 + (q() - 0.5) * 0.4) * (768 / 26), rx = 13 + q() * 8; rowH.push([cx, hol(cx) + rx * 0.5, rx, rx * 0.6, i, 'H']); }
    foliage(L, rowH, SETS);
    // main crowns [cx, top, rx, ry], taller ones behind
    const rowB = [];
    [[34, 52, 40, 24], [98, 42, 26, 20], [150, 44, 44, 28], [214, 58, 24, 16], [268, 62, 40, 20], [334, 56, 28, 20],
      [396, 42, 46, 30], [462, 36, 26, 22], [516, 48, 38, 24], [580, 60, 26, 16], [640, 64, 44, 20], [716, 54, 36, 24]]
      .map((c, i) => [c, i]).sort((a, b) => a[0][1] - b[0][1]).forEach(([c, i]) => crown(rowB, 100 + i, 'B', c[0], c[1], c[2], c[3], q));
    foliage(L, rowB, SETS);
    // nearer, darker understory mounds
    const rowC = [];
    [[14, 74, 52, 20], [108, 78, 46, 18], [196, 72, 56, 22], [300, 80, 50, 18], [398, 74, 54, 20], [492, 78, 48, 18], [588, 72, 56, 22], [690, 78, 50, 18]]
      .forEach((c, i) => crown(rowC, 200 + i, 'C', c[0], c[1], c[2], c[3], q));
    foliage(L, rowC, SETS);
    // ...and everything sinks into one quiet dark tone
    const FADE = [1, 2, 4, 6, 8, 10, 12, 14];
    for (let y = 82; y < L.h; y++) {
      const k = (y - 82) >> 1, f = k < FADE.length ? FADE[k] / 16 : 1;
      for (let x = 0; x < L.w; x++) if (L.d[y * L.w + x] && f > d4(x, y)) L.d[y * L.w + x] = J[4];
    }
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
      { img: bake(makeJungle()), y: 90, speed: 0.45 },
    ],
  };
});
