// SUNFOX — parallax backdrop for Emerald Coast: sky + 7 layers (far -> near).
// Everything is plotted as indexed pixels (no blending): banded sky with ordered dither,
// a far field of small flat clouds, big sculpted cumulus, a far sea with the old volcano,
// line-scrolled sea + lagoon strips, headlands with faceted cliffs and waterfalls (their
// reflections ride on the lagoon layer behind them), and a hazy blue-teal jungle treeline.
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
  // Melt same-colour specks smaller than minB px (4-connected, x wraps) into whatever surrounds
  // them most — every cluster that survives is a deliberate one. 0 = empty, never touched.
  function melt(buf, w, h, minB, passes) {
    for (let pass = 0; pass < (passes || 2); pass++) {
      const lab = new Uint8Array(w * h);
      for (let s0 = 0; s0 < buf.length; s0++) {
        if (!buf[s0] || lab[s0]) continue;
        const c = buf[s0], comp = [s0], cnt = {};
        lab[s0] = 1;
        for (let k = 0; k < comp.length && comp.length < 4096; k++) {
          const i = comp[k], x = i % w, y = (i / w) | 0;
          for (const j of [y * w + ((x + w - 1) % w), y * w + ((x + 1) % w), y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
            if (j < 0 || !buf[j]) continue;
            if (buf[j] === c) { if (!lab[j]) { lab[j] = 1; comp.push(j); } } else cnt[buf[j]] = (cnt[buf[j]] || 0) + 1;
          }
        }
        if (comp.length >= minB) continue;
        let best = 0, bn = 0;
        for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
        if (best) for (const i of comp) buf[i] = best;
      }
    }
  }

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
    const fl = o.flat || 1, lg = o.light || [LX, LY, LZ], ln = Math.hypot(lg[0], lg[1], lg[2]), lx = lg[0] / ln, ly = lg[1] / ln, lz = lg[2] / ln;
    for (const p of list) {
      const cx = p[0], cy = p[1], rx = p[2], ry = p[3] || rx;
      const ya = Math.floor(cy - ry), yb = Math.ceil(cy + ry), xa = Math.floor(cx - rx), xb = Math.ceil(cx + rx);
      for (let x = xa; x <= xb; x++) {
        const dx = (x + 0.5 - cx) / rx, yc = clip ? clip(x) : 1e9;
        for (let y = ya; y <= yb && y < yc; y++) {
          const dy = (y + 0.5 - cy) / ry, q = dx * dx + dy * dy;
          if (q > 1) continue;
          const nz = Math.sqrt(1 - q) * (o.round && rx >= o.round[0] ? o.round[1] : fl);
          v[(y - y0) * bw + (x - x0)] = (dx * lx + dy * ly + nz * lz) / Math.sqrt(q + nz * nz);
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
        const t = ty * (1 - gx) + ((x - x0) / bw) * gx, dd = (d2(x, y) - 0.5) * 2;
        let val = (o.local ? lz + (v[i] - lz) * o.local : v[i]) + g0 + (g1 - g0) * t - (o.foot || 0) * Math.max(0, ty * 5 - 4);
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
    if (o.shelf) {
      // flat underside: the rows standing on the base line fall into shade (darkest at the very bottom)
      const nt = o.tones.length;
      for (let x = 0; x < bw; x++) {
        let yb = bh - 1;
        while (yb >= 0 && !out[yb * bw + x]) yb--;
        if (yb < 0 || yb + y0 < base - 3) continue;
        for (let d = 0; d < o.shelf && yb - d >= 0; d++) {
          const i = (yb - d) * bw + x, c = out[i];
          if (!c) break;
          out[i] = Math.min(nt, d < 1 ? Math.max(c + 2, nt - 1) : d < 3 ? Math.max(c + 1, nt - 1) : c >= 3 ? c + 1 : c);
        }
      }
    }
    if (o.band) {
      // Sonic-3 style: a 2px checker only where two neighbouring tones meet
      const src = out.slice();
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const c = src[y * bw + x];
        if (!c) continue;
        const n = [x > 0 ? src[y * bw + x - 1] : 0, x < bw - 1 ? src[y * bw + x + 1] : 0, y > 0 ? src[(y - 1) * bw + x] : 0, y < bh - 1 ? src[(y + 1) * bw + x] : 0];
        if (((x + x0 + y + y0) & 1) === 0) { if (n.includes(c + 1)) out[y * bw + x] = c + 1; } else if (c > 1 && n.includes(c - 1)) out[y * bw + x] = c - 1;
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
      if (typeof b[3] === 'number') { list.push([cx, cy, r, b[3]]); top = Math.min(top, cy - b[3]); continue; }
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
  // Near clouds: a dominant tower with shoulders and small satellite puffs, the light side
  // white, the body turning lavender toward the lower right, a flat darker shelf underneath.
  const HERO = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0', '#869fe6']), thr: [0.76, 0.36, -0.06, -0.5], grad: [0.4, -0.75], gx: 0.5, flat: 2.3, round: [13, 1.45], local: 0.6, shelf: 5, blob: 10 };
  const SMALL = { tones: CS(['#fffff6', '#e8f3fe', '#c6dbf8', '#a2bef0']), thr: [0.7, 0.3, -0.2], grad: [0.35, -0.6], gx: 0.4, flat: 1.6, local: 0.7, shelf: 2, blob: 5 };
  // Far clouds: small, flat, pale and close to the sky's own colour.
  const FAR = { tones: CS(['#f9fcf2', '#e2f1f9', '#c6e3f8']), thr: [0.62, 0.1], grad: [0.3, -0.5], gx: 0.3, flat: 1.7, local: 0.7, shelf: 2, blob: 4 };

  // small flat-based cumulus grown from a seed: w px wide, h px tall, standing on `base`:
  // squashed lobes that all rise from one long flat slab, under a single clear high point
  function flatCloud(L, x, base, w, h, o, q) {
    const n = Math.max(2, Math.round(w / (h * 1.1))), pk = 0.3 + q() * 0.4, slab = Math.max(1.5, h * 0.2), lobes = [[w / 2, 1, w * 0.45, slab]];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (q() - 0.5) * 0.5) / n, prof = Math.pow(Math.max(0, 1 - Math.abs(u - pk) / (u < pk ? pk + 0.1 : 1.1 - pk)), 1.2);
      const top = h * (0.34 + 0.66 * prof) * (0.85 + 0.15 * q()), ry = Math.max(1.5, top / 2), rx = Math.min(w * 0.3, ry * (1.4 + q() * 0.6));
      lobes.push([w * (0.14 + u * 0.72), ry, rx, ry]);
    }
    cumulus(L, x, base, lobes, Object.assign({}, o, { shelf: h < 9 ? 1 : o.shelf }));
  }

  function makeFloaters() {
    const L = layer(768, 112);
    // A — the big hero cumulus
    cumulus(L, 50, 74, [
      [88, 3, 82, 7],
      [106, 30, 20, [[70, 7], [25, 5]]], [28, 22, 15, [[155, 5], [110, 5]]],
      [64, 40, 30, [[168, 6], [138, 8], [104, 6], [66, 9], [30, 6]]],
      [130, 12, 11, [[50, 4]]], [18, 9, 10, [[145, 4]]],
      [40, 16, 15, [[140, 4]]], [84, 17, 16, [[45, 5]]], [112, 12, 12],
      [6, 4, 5], [150, 5, 7], [163, 3, 4], [62, 7, 9], [30, 4, 6], [138, 4, 5],
    ], HERO, [[30, 70, 1], [96, 132, 1], [104, 122, 2]]);
    // B — medium
    cumulus(L, 372, 50, [
      [50, 3, 48, 6],
      [70, 15, 13, [[60, 4], [15, 4]]], [22, 13, 11, [[150, 4]]],
      [46, 26, 19, [[160, 4], [125, 6], [80, 5], [40, 5]]],
      [8, 6, 7], [86, 7, 8, [[30, 3]]], [34, 8, 10], [58, 7, 9], [96, 3, 4], [76, 4, 5],
    ], HERO, [[28, 64, 1]]);
    // C — long and low
    cumulus(L, 566, 38, [
      [62, 2, 60, 5],
      [72, 11, 11, [[60, 4], [20, 3]]], [24, 9, 9, [[140, 3]]],
      [46, 15, 15, [[155, 4], [110, 5], [60, 4]]],
      [94, 7, 8, [[40, 3]]], [10, 4, 5], [36, 4, 6], [84, 4, 6], [110, 4, 5], [120, 2, 3],
    ], HERO, [[30, 90, 1]]);
    // D — small
    cumulus(L, 262, 28, [
      [28, 2, 25, 4],
      [24, 11, 10, [[140, 3], [75, 4]]], [39, 8, 7, [[45, 3]]], [12, 6, 6], [48, 4, 4], [30, 4, 6], [3, 2, 3],
    ], SMALL);
    // wisps
    const q = rng(9);
    flatCloud(L, 486, 86, 40, 9, SMALL, q); flatCloud(L, 700, 66, 30, 8, SMALL, q); flatCloud(L, 232, 96, 22, 6, SMALL, q); flatCloud(L, 6, 30, 26, 7, SMALL, q);
    return L;
  }

  // Far cloud field: ranks of small flat-based clouds that shrink toward the horizon (the
  // classic depth cue), pale enough to sit well behind the big floaters.
  function makeBank() {
    const L = layer(768, 96), q = rng(4);
    for (const [x, w, h] of [[20, 96, 21], [214, 64, 15], [372, 112, 24], [566, 76, 17], [690, 58, 14]]) flatCloud(L, x, 70, w, h, FAR, q);
    for (const [x, w, h] of [[136, 46, 10], [300, 38, 9], [500, 50, 11], [652, 34, 8], [742, 40, 9], [60, 30, 7]]) flatCloud(L, x, 80, w, h, FAR, q);
    for (const [x, w, h] of [[10, 22, 5], [104, 28, 6], [190, 18, 4], [258, 26, 6], [352, 20, 5], [436, 28, 6], [548, 18, 4], [610, 26, 6], [704, 22, 5]]) flatCloud(L, x, 88, w, h, FAR, q);
    return L;
  }

  // ===================== sea =====================
  const SEA = CS(['#2456c2', '#2864cc', '#2c74d6', '#3086de', '#3498e2', '#38aae2', '#3ebade', '#4ac8d8']);
  const GL = C('#f6ffff'), GL2 = C('#b4e6fc');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  // rows of water, given as a string of ramp digits (line-interleaved gradient = no shimmer when scrolling)
  function water(L, y, seq, pal) {
    for (const ch of seq) { L.row(0, L.w - 1, y++, (pal || SEA)[parseInt(ch, 36)]); if (y >= L.h) break; }
    return y;
  }
  // one row of horizontal glints: a dash of lmin..lmax px somewhere in every `cell` px, `skip` = chance of none
  function dashRow(L, rnd, y, cell, lmin, lmax, skip, core, tip) {
    const n = Math.max(1, Math.round(L.w / cell)), cw = L.w / n;
    for (let i = 0; i < n; i++) {
      const len = lmin + Math.floor(rnd() * (lmax - lmin + 1)), x = Math.floor(i * cw + rnd() * Math.max(1, cw - len - 1));
      if (rnd() < skip) continue;
      for (let k = 0; k < len; k++) L.set(x + k, y, tip && len > 2 && (k === 0 || k === len - 1) ? tip : core);
    }
  }

  // Faceted mountain: ridge polyline [x, y, 'p'|'v'?]; 'p' peaks grow a zig-zag spine,
  // 'v' valleys a gully. Left of a spine = lit face, right of it (up to the gully) = shade.
  // o.snow: height above which the summit is capped with the pale pal.snow / pal.snowSh.
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
  const JAG = [0, 2, 4, 1, 3, 6, 2, 0, 3, 5, 1, 4];
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
      const sp = div[i], g = div[i + 1];
      if (sp.k !== 'S' || g.k !== 'G') continue;
      for (let y = g.y0; y < base; y++) if (sp.x[y - sp.y0] >= g.x[y - g.y0]) { sp.y1 = g.y1 = y; break; }
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
      const shade = kind === 'S', up = base - y;
      let c = shade ? pal.shade : d < 3 + (y - top[x - xa]) * 0.35 || !pal.mid ? pal.lit : pal.mid;
      if (o.snow && up > o.snow + JAG[((x * 5) % 12 + 12) % 12] * (shade ? 0.5 : 1) + (shade ? 4 : 0)) c = shade ? pal.snowSh : pal.snow;
      if (pal.haze && (up <= 2 || (up <= 4 && d2(x, y) < 0.5))) c = pal.haze;
      L.set(x, y, c);
    }
  }

  const HZ = 56; // horizon row inside the far-sea layer
  function makeSeaFar() {
    const L = layer(640, 166);
    const rnd = rng(11);
    // islands (drawn first; the sea covers their feet)
    const far = { lit: C('#c9def6'), shade: C('#b3cdf0'), haze: C('#dcebf6') };
    const mid = { lit: C('#aecbf0'), mid: C('#9bbcea'), shade: C('#82a2df'), haze: C('#c6dcf4'), snow: C('#f8f9ee'), snowSh: C('#bfd4f5') };
    // two tiny islets on the horizon, a long twin-humped island...
    mountain(L, HZ, [[4, 0], [14, 3], [22, 6, 'p'], [30, 4, 'v'], [38, 5, 'p'], [50, 2], [60, 0]], far);
    mountain(L, HZ, [[292, 0], [302, 2], [310, 5, 'p'], [322, 2], [330, 0]], far);
    mountain(L, HZ, [[356, 0], [372, 4], [388, 10], [400, 17], [408, 22, 'p'], [416, 19], [424, 16, 'v'], [436, 20], [446, 25], [452, 27, 'p'], [460, 22], [470, 15, 'v'], [480, 16, 'p'], [494, 9], [512, 4], [534, 0]], far, { spine: [[5, 0.5], [3, -0.3]] });
    // ...and the old volcano: long concave slopes, a notched crater, a sunlit snow cap
    mountain(L, HZ, [[70, 0], [92, 3], [112, 7], [128, 12], [140, 18, 'p'], [146, 19], [152, 22, 'v'], [160, 30], [166, 38], [171, 46], [175, 52, 'p'], [179, 49], [182, 50, 'v'], [186, 53, 'p'], [191, 47], [197, 38], [205, 29], [214, 22, 'v'], [222, 21, 'p'], [234, 14], [250, 8], [270, 3], [288, 0]], mid, { snow: 37 });
    // a ring of mist round its shoulders
    puffs(L, [[138, HZ - 23, 14, 3], [160, HZ - 26, 17, 3.5], [186, HZ - 25, 15, 3], [208, HZ - 22, 12, 2.5], [224, HZ - 19, 8, 2]], { tones: CS(['#fbfcf2', '#dfeaf6']), thr: [0.2], blob: 3 });
    // water
    let y = HZ;
    L.row(0, L.w - 1, y, C('#5a92e0'));
    dashRow(L, rnd, y, 16, 5, 13, 0.25, C('#c4e6f8'));
    y = water(L, y + 1, '1100000001001011011121121222232232333');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[3]);
    // horizon glitter: a bright band of short dashes right under the horizon, thinning out below
    for (const [r, cell, lmin, lmax, skip] of [[1, 8, 2, 4, 0.3], [2, 9, 2, 4, 0.3], [3, 10, 2, 4, 0.4], [4, 13, 2, 4, 0.45], [5, 17, 2, 3, 0.5], [6, 24, 2, 3, 0.5], [7, 34, 2, 3, 0.5], [9, 52, 2, 3, 0.5], [11, 80, 2, 3, 0.5], [14, 128, 2, 2, 0.5]])
      dashRow(L, rnd, HZ + r, cell, lmin, lmax, skip, r <= 3 || r === 6 ? GL : GL2, GL2);
    return L;
  }

  function makeSeaNear() {
    const L = layer(384, 96);
    const rnd = rng(23);
    dashRow(L, rnd, 0, 12, 4, 9, 0.2, SEA[3]);
    L.row(0, L.w - 1, 2, SEA[3]);
    dashRow(L, rnd, 1, 12, 5, 10, 0.1, SEA[3]);
    let y = water(L, 3, '3343444545556566676777');
    while (y < L.h) L.row(0, L.w - 1, y++, SEA[7]);
    // sparser, longer glints than out at the horizon
    for (const [r, cell, lmin, lmax, c] of [[3, 64, 3, 5, GL2], [6, 96, 3, 6, GL], [9, 80, 4, 7, GL2], [12, 128, 4, 8, GL], [15, 96, 5, 9, GL2], [19, 128, 6, 10, GL], [23, 128, 6, 12, GL2]])
      dashRow(L, rnd, r, cell, lmin, lmax, 0.35, c, c === GL ? GL2 : null);
    return L;
  }

  // The lagoon: bands that deepen toward the viewer. Water only, so it line-scrolls (raster).
  function makeLagoon() {
    const L = layer(512, 96), rnd = rng(41);
    const LG = CS(['#84e6d0', '#62d6cf', '#46c4cc', '#32b0c5', '#259cbb', '#1f8ab0']);
    const flats = [4, 5, 6, 8, 10, 99], TRN = [1, 0, 0, 1, 1, 0];
    const broken = (y, on, off, c) => { for (let x = Math.floor(rnd() * 16); x < L.w;) { x += off[0] + Math.floor(rnd() * off[1]); const n = on[0] + Math.floor(rnd() * on[1]); L.row(x, Math.min(L.w - 1, x + n - 1), y, c); x += n; } };
    let y = 0;
    for (let i = 0; i < LG.length && y < L.h; i++) {
      for (let k = 0; k < flats[i] && y < L.h; k++) L.row(0, L.w - 1, y++, LG[i]);
      if (i === LG.length - 1) break;
      // transition: full lines of the two tones interleaved; its first and last line broken into long dashes
      TRN.forEach((b, k) => {
        if (y >= L.h) return;
        if (k === 0) { L.row(0, L.w - 1, y, LG[i]); broken(y, [14, 22], [5, 9], LG[i + 1]); }
        else if (k === TRN.length - 1) { L.row(0, L.w - 1, y, LG[i + 1]); broken(y, [14, 22], [5, 9], LG[i]); }
        else L.row(0, L.w - 1, y, LG[i + b]);
        y++;
      });
    }
    // the reef line where the open sea meets the lagoon
    dashRow(L, rnd, 0, 14, 6, 12, 0.2, C('#d6f8f2'));
    // glints: short and close together far out, longer and sparser toward the viewer
    const toneAt = r => LG.indexOf(L.get(0, r));
    for (let r = 2; r < 84; r += r < 12 ? 1 : r < 40 ? 2 : 3) {
      const len = 2 + r * 0.17, i = Math.max(0, toneAt(r));
      const white = rnd() < 0.4;
      dashRow(L, rnd, r, 30 + r * 2.4, Math.round(len), Math.round(len * 1.8), 0.4, white ? GL : LG[Math.max(0, i - 1)] === LG[i] ? GL : LG[Math.max(0, i - 1)], white ? C('#c8f6ee') : null);
    }
    return L;
  }

  // ===================== mid headlands =====================
  const WL = 64; // waterline row inside the island layer (the lagoon layer starts on the same screen row)
  const GRASS = { tones: CS(['#bfeba4', '#8cd79e', '#60bf98', '#44a792', '#358e8e']), thr: [0.93, 0.6, 0.25, -0.1], grad: [0.08, -0.16], light: [-0.6, -0.6, 0.35], band: 1, blob: 10 };
  const WOOD = { tones: CS(['#98dc94', '#60c08c', '#3ea486', '#308882', '#28707c']), thr: [0.9, 0.5, 0.0, -0.5], grad: [0.15, -0.35], flat: 1.6, blob: 4 };
  const ROCK = CS(['#f8f0dc', '#e2d6d0', '#c2b7ca', '#9d94b8', '#7b76a4', '#5f6194']);
  const FALL = CS(['#f8ffff', '#c6ecf8', '#94d6f2', '#6cb6e6']);
  const SAND = C('#f6eebc'), SAND2 = C('#dccf9e');

  // Faceted rock is built from slabs: a lit top plane, a lighter left bevel, the face, a darker
  // right bevel and a crack line underneath. `recess` flips the bevels (an alcove: its left
  // wall in shade, its right wall catching the light).
  function slab(L, x0, x1, y0, y1, t, cap, recess, crack) {
    const w = x1 - x0 + 1, bl = w >= 9 ? 2 : 1, br = w >= 7 ? 2 : 1, ch = !recess && w >= 8 && y1 - y0 >= 7 ? Math.min(4, 2 + ((x0 + y0) % 3)) : 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = x - x0, j = y - y0;
      let c = t;
      if (recess) c = i < bl ? t + 1 : i >= w - br ? t - 1 : t;
      else {
        if (j === 0 && (i === 0 || i === w - 1)) continue; // chipped corners
        if (j < cap) c = i >= w - br ? t - 1 : t - 2;
        else if (i < bl) c = t - 1;
        else if (i >= w - br) c = t + 1;
        if (ch && i + j < ch + 1) c = t - 2;                                  // lit facet, top left
        else if (ch && w - 1 - i + (y1 - y) < ch) c = t + 2;                  // shaded facet, bottom right
        else if (crack && y === y1) c = Math.max(c, t) + 1;
      }
      L.set(x, y, ROCK[clamp(c, 0, 5)]);
    }
  }
  // A column of jittered slabs between x0..x1, rising `up` px above the waterline
  // (o.from = height of its foot, o.recess = alcove).
  function rockCol(L, q, x0, x1, up, t, o) {
    o = o || {};
    const bottom = WL - (o.from || 0);
    let y = WL - up, first = true;
    for (let x = x0; x <= x1; x++) L.col(x, y + 1, bottom - 1, ROCK[4]);
    while (y < bottom) {
      let h = 5 + Math.floor(q() * 11);
      if (bottom - (y + h) < 5) h = bottom - y;
      const jit = first || o.recess ? 0 : 1;
      const a = x0 + jit * Math.round((q() - 0.5) * 3), b = x1 + jit * Math.round((q() - 0.5) * 3);
      const last = y + h >= bottom, tt = t + (jit && q() < 0.3 ? 1 : 0), cap = first ? 2 : 1;
      if (!o.recess && b - a >= 11 && q() < 0.45) {
        const m = a + 4 + Math.floor(q() * (b - a - 8));
        slab(L, a, m, y, y + h - 1, tt, cap, false, !last);
        slab(L, m + 1, b, y + (first && q() < 0.5 ? 1 : 0), y + h - 1, tt + 1, cap, false, !last);
      } else slab(L, a, b, y, y + h - 1, tt, cap, o.recess, !last);
      y += h; first = false;
    }
  }
  // Waterfall: streaked white water between paler edges, w0 px wide at the lip and w1 at its
  // foot, with layered foam and a dithered halo of mist over the rock and the lagoon.
  function falls(L, x, up, w0, w1) {
    const y0 = WL - up, c2 = x * 2 + w0 - 1;
    for (let y = y0; y < WL; y++) {
      const f = (y - y0) / Math.max(1, WL - 1 - y0), w = Math.round(w0 + (w1 - w0) * Math.pow(f, 0.75)), xa = (c2 - w + 1) >> 1;
      for (let i = 0; i < w; i++) {
        const X = xa + i, ph = (y + ((X * 7) % 13) * 3) % 13;
        let c = ph < 8 ? FALL[0] : FALL[1];
        if (w > 2 && i === 0) c = ph < 6 ? FALL[1] : FALL[2];
        else if (w > 2 && i === w - 1) c = ph < 5 ? FALL[2] : FALL[3];
        else if (w > 4 && i === w - 2) c = ph < 8 ? FALL[1] : FALL[2];
        L.set(X, y, c);
      }
    }
    L.row(x - 1, x + w0, y0, FALL[0]);
    L.row(x, x + w0 - 1, y0 - 1, FALL[1]);
    // mist halo
    const cx = c2 / 2, rx = w1 / 2 + 11;
    for (let y = WL - 11; y <= WL + 5; y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
      const dx = (X + 0.5 - cx) / rx, dy = (y + 0.5 - (WL - 1)) / (y < WL ? 10 : 6), e = dx * dx + dy * dy;
      if (e < 1 && (1 - e) * 0.62 > d4(X, y)) L.set(X, y, y < WL ? FALL[1] : FALL[0]);
    }
    // foam piled at its foot, ripples running out over the water
    const hw = w1 / 2;
    puffs(L, [[cx - hw - 3, WL - 1, 3, 2.5], [cx + hw + 3, WL - 1, 3.5, 2.5], [cx - hw * 0.5 - 1, WL - 4, 2.6], [cx + hw * 0.5 + 2, WL - 3.5, 2.4], [cx, WL - 1.5, hw + 2.5, 3.6]],
      { tones: [FALL[0], FALL[1], FALL[2]], thr: [0.3, -0.45], clip: WL + 1, blob: 3 });
    L.row(Math.round(cx - hw - 4), Math.round(cx + hw + 4), WL, FALL[0]);
    L.row(Math.round(cx - hw - 7), Math.round(cx - hw - 6), WL, FALL[0]); L.row(Math.round(cx + hw + 6), Math.round(cx + hw + 8), WL, FALL[0]);
    L.row(Math.round(cx - hw - 2), Math.round(cx - 1), WL + 1, FALL[1]); L.row(Math.round(cx + 2), Math.round(cx + hw + 5), WL + 1, FALL[1]);
    L.row(Math.round(cx - hw - 6), Math.round(cx - hw - 4), WL + 2, FALL[1]); L.row(Math.round(cx + 1), Math.round(cx + 4), WL + 3, FALL[1]);
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

  function makeIsles() {
    const L = layer(1024, WL + 24);
    const rnd = rng(31), rq = rng(5);
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
    const col = (x0, x1, up, t, o) => rockCol(L, rq, ox + x0, ox + x1, up, t, o);
    const fallsAt = [];
    const fall = (x, up, w0, w1) => fallsAt.push([ox + x, up, w0, w1]);

    // ---- headland A: table mountain with the twin falls ----
    ox = 50;
    spit(20, 26, 4);
    hill([150, 30, 76, 68], [56, 12, 40, 28], [88, 16, 40, 40]);
    grove(60, 17, 3, 4, 1.5, 1); grove(78, 23, 3, 5, 1, 21);
    col(108, 121, 42, 1); col(120, 128, 45, 2); col(128, 135, 43, 4, { recess: 1 }); col(135, 150, 46, 2); col(149, 161, 44, 3);
    col(160, 171, 28, 2); col(167, 170, 27, 4, { recess: 1 }); col(171, 181, 29, 3); col(180, 186, 13, 3);
    col(104, 114, 25, 1); col(100, 110, 10, 1); col(138, 147, 8, 1); col(152, 159, 5, 2);
    fall(129, 43, 5, 7); fall(168, 27, 2, 4);
    vines([[111, 40, 5], [117, 42, 6], [139, 45, 5], [146, 46, 3], [156, 43, 6], [174, 28, 4]]);
    grove(124, 52, 4, 5, 0.5, 3); grove(111, 46, 3, 5, 1, 4); grove(137, 49, 4, 5, 0.3, 5); grove(160, 30, 2, 3, 0, 6); grove(172, 31, 2, 3, 0, 7);
    palmS(118, 53, 1); palmS(150, 53, 0, true);
    boulders([[98, 1, 3], [189, 0, 3]]);
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
    col(749, 756, 30, 1); col(756, 763, 27, 3); col(745, 752, 10, 1); col(761, 768, 11, 3);
    col(772, 778, 16, 1); col(778, 784, 12, 3);
    grove(753, 31, 2, 3, 0, 12);
    boulders([[742, 0, 3], [769, 1, 3], [786, 0, 2]]);
    col(804, 818, 23, 1); col(832, 844, 22, 3); col(812, 838, 27, 2, { from: 15 }); col(800, 808, 9, 1); col(842, 848, 10, 3);
    L.row(819, 831, WL - 16, ROCK[5]); L.row(819, 820, WL - 15, ROCK[4]); L.set(819, WL - 14, ROCK[4]); L.row(830, 831, WL - 15, ROCK[4]); L.set(831, WL - 14, ROCK[3]);
    grove(810, 26, 4, 3, 0.3, 32); palmS(828, 27, 1);
    boulders([[798, 0, 3], [850, 0, 3]]);

    // ---- headland D: the green bluff ----
    ox = 16;
    spit(858, 20, 3);
    hill([940, 28, 74, 76], [886, 12, 36, 28]);
    col(916, 928, 34, 1); col(927, 933, 38, 2); col(933, 938, 37, 4, { recess: 1 }); col(938, 949, 39, 2); col(948, 954, 19, 3); col(910, 920, 12, 1); col(941, 947, 7, 1);
    fall(934, 37, 3, 5);
    vines([[919, 32, 4], [925, 33, 5], [941, 38, 4], [946, 38, 3]]);
    grove(916, 37, 3, 5, 1.5, 13); grove(938, 42, 5, 5, 0.5, 14);
    hill([988, 16, 40, 36]);
    grove(970, 30, 3, 5, -2, 15);
    palmS(960, 47, 0); palmS(856, 3, 1); palmS(866, 2, 0, true); palmS(1004, 14, 0, true); palmS(882, 14, 1);
    boulders([[908, 0, 3], [955, 0, 3]]);
    ox = 0;

    // ---- beaches: pale sand where grass meets the water; rock goes dark and wet ----
    const grassy = new Set(GRASS.tones.concat(WOOD.tones));
    for (let x = 0; x < L.w; x++) {
      const c = L.get(x, WL - 1);
      if (grassy.has(c)) { L.set(x, WL - 1, SAND); if (grassy.has(L.get(x, WL - 2)) && (x * 7) % 11 < 7) L.set(x, WL - 2, SAND2); }
      for (let y = WL - 2; y < WL; y++) { const i = ROCK.indexOf(L.get(x, y)); if (i >= 0) L.set(x, y, ROCK[Math.min(5, i + 1)]); }
    }
    // ---- reflections: the land mirrored into the lagoon, breaking up into ripples ----
    const RF = new Map(), RG = CS(['#66d2b6', '#4cbeaa']), RR = CS(['#b6d6de', '#90b4ce']);
    GRASS.tones.concat(WOOD.tones).forEach((c, i) => RF.set(c, RG[i % 5 < 2 ? 0 : 1]));
    ROCK.forEach((c, i) => RF.set(c, RR[i < 3 ? 0 : 1]));
    RF.set(SAND, C('#ccf4de')); RF.set(SAND2, C('#ccf4de')); RF.set(C('#fff8d2'), C('#ccf4de'));
    FALL.forEach(c => RF.set(c, C('#eafdfb')));
    for (let r = 0; r < 15; r++) {
      const wob = r % 4 === 1 ? 1 : r % 4 === 3 ? -1 : 0;
      let on = false, n = 0;
      for (let x = 0; x < L.w; x++) {
        if (n-- <= 0) { on = !on; n = on ? 3 + Math.floor(rnd() * Math.max(2, 9 - r * 0.5)) : Math.floor(rnd() * (1.5 + r * 0.6)); }
        const c = RF.get(L.get(x + wob, WL - 1 - Math.floor(r * 1.5)));
        if (c && (r < 2 || on)) L.set(x, WL + r, c);
      }
    }
    for (const f of fallsAt) falls(L, f[0], f[1], f[2], f[3]);
    return L;
  }

  // ===================== near jungle =====================
  // Sits right behind the action, so it is a hazy blue-teal silhouette: big rounded crowns with a
  // thin light rim, flat bodies, dark hollows between them, sinking into one quiet tone.
  const J = CS(['#8bccb1', '#6bb29e', '#569c91', '#488c8c', '#3f737d']);
  const JA = CS(['#9ed6c2', '#7cbcae', '#68a8a4']);
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const d4 = (x, y) => (B4[(x & 3) | ((y & 3) << 2)] + 0.5) / 16;

  // Leaf masses. clumps: {x, y, rx, ry, g (group), set, sh?} in painter's order (later = nearer);
  // sets[set] = tones [rim, rim2, body, shade, deep]. Graphic shading: a light rim on every exposed
  // edge that faces the light (2px where it faces it squarely, tapering out), a flat body, a
  // shade crescent on the lower right, and a cast shadow under whatever clump is nearer.
  function foliage(L, clumps, sets) {
    const W = L.w, pad = 96, bw = W + pad * 2, bh = L.h, all = [];
    clumps.forEach((c, i) => { for (const s of [-W, 0, W]) if (c.x + s + c.rx >= -pad && c.x + s - c.rx < W + pad) all.push(Object.assign({}, c, { x: c.x + s, o: i })); });
    all.sort((a, b) => a.o - b.o);
    const own = new Int16Array(bw * bh).fill(-1);
    const ins = (i, x, y) => { const c = all[i], dx = (x + 0.5 - c.x) / c.rx, dy = (y + 0.5 - c.y) / c.ry; return dx * dx + dy * dy <= 1; };
    all.forEach((c, i) => {
      for (let y = Math.max(0, Math.floor(c.y - c.ry)); y <= Math.min(bh - 1, Math.ceil(c.y + c.ry)); y++)
        for (let x = Math.max(-pad, Math.floor(c.x - c.rx)); x <= Math.min(W + pad - 1, Math.ceil(c.x + c.rx)); x++) if (ins(i, x, y)) own[y * bw + x + pad] = i;
    });
    const at = (x, y) => (y < 0 || y >= bh || x < -pad || x >= W + pad ? -1 : own[y * bw + x + pad]);
    const out = new Uint8Array(W * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (i < 0) continue;
      const c = all[i], sh = c.sh || clamp(Math.round(c.ry * 0.3), 2, 7);
      const shade = !ins(i, x + sh * 0.5, y + sh);
      let cast = false;
      for (let k = 1; k <= 4 && !cast; k++) { const j = at(x - Math.round(k * 0.6), y - k); cast = j > i && k <= clamp(Math.round(all[j].ry * 0.2), 2, 4); }
      // how squarely the edge here faces the light
      let nx = (x + 0.5 - c.x) / (c.rx * c.rx), ny = (y + 0.5 - c.y) / (c.ry * c.ry);
      const nl = Math.hypot(nx, ny) || 1, lit = (nx * -0.5 + ny * -0.866) / nl;
      const a = at(x - 1, y - 1), b = at(x - 1, y - 2);
      let t = 2;
      if (!ins(i, x - 1, y - 1) && a <= i) {
        const outer = a < 0 || all[a].g !== c.g;
        t = lit > 0.55 ? (outer ? 0 : 1) : lit > 0.2 && outer ? 1 : shade ? 3 : 2;
      } else if (!ins(i, x - 1, y - 1)) t = 2;
      else if (!ins(i, x - 1, y - 2) && b <= i && lit > 0.62 && (b < 0 || all[b].g !== c.g)) t = 1;
      else if (cast || shade) t = 3;
      else if (c.lc && lit > 0.35 && !ins(i, x - c.lc * 0.5, y - c.lc) && !(at(Math.round(x - c.lc * 0.5), y - c.lc) > i)) t = 1;
      out[y * W + x] = sets[c.set][t];
    }
    melt(out, W, bh, 5, 2);
    for (let i = 0; i < out.length; i++) if (out[i]) L.d[i] = out[i];
  }
  // A tree crown [cx, top, rx, ry]: a main dome with a lit left and a shaded right shoulder, each
  // with small leafy bumps tucked behind its upper rim (they only break up the silhouette), and
  // a lit clump riding the terminator.
  function crown(list, g, set, dark, cx, top, rx, ry, q, simple) {
    const cy = top + ry;
    const lobe = (x, y, a, b, s, sh) => {
      const n = Math.max(3, Math.round(a / 5));
      for (let i = 0; i < n; i++) {
        const ang = Math.PI * (1.12 - 1.24 * ((i + 0.5 + (q() - 0.5) * 0.6) / n)), rb = 4 + q() * 5, bs = ang < 0.9 ? dark : s;
        const bx = x + Math.cos(ang) * (a - rb * 0.15), by = y - Math.sin(ang) * (b - rb * 0.15);
        if (q() < 0.5) { const a2 = ang + (q() - 0.5) * 1.2, rt = 2.4 + q() * 1.2; list.push({ x: bx + Math.cos(a2) * rb * 0.9, y: by - Math.sin(a2) * rb * 0.8, rx: rt * 1.2, ry: rt, g, set: bs }); }
        list.push({ x: bx, y: by, rx: rb * 1.15, ry: rb, g, set: bs });
      }
      list.push({ x, y, rx: a, ry: b, g, set: s, sh, lc: simple ? 0 : clamp(Math.round(b * 0.2), 2, 5) });
      // a few leaf clusters on its face
      if (simple) return;
      for (let m = Math.round((a * b) / (s === dark ? 420 : 210)); m > 0; m--) {
        const r = 4.5 + q() * 5, u = -0.62 + q() * 1.1, v = -0.3 + q() * 0.85;
        if (u * u + v * v < 0.72) list.push({ x: x + u * a, y: y + v * b, rx: r * 1.3, ry: r * 0.8, g, set: s });
      }
    };
    if (simple) return lobe(cx, cy, rx, ry, set);
    lobe(cx + (q() - 0.5) * rx * 0.2, cy, rx * 0.74, ry, set, Math.round(ry * 0.55));
    lobe(cx - rx * 0.52, cy + ry * (0.15 + q() * 0.25), rx * 0.48, ry * (0.6 + q() * 0.14), set);
    lobe(cx + rx * 0.5, cy + ry * (0.2 + q() * 0.3), rx * 0.5, ry * (0.58 + q() * 0.14), dark);
    list.push({ x: cx - rx * (0.05 + q() * 0.2), y: cy + ry * 0.4, rx: rx * 0.3, ry: rx * 0.19, g, set });
  }

  // Palm fronds per crown shape: [start angle, length factor, bend (deg, toward the ground;
  // negative = blown back over the crown), depth 0 back .. 2 front].
  const FROND = {
    arch: [[200, 0.75, 45, 0], [-20, 0.75, 45, 0], [165, 1, 75, 1], [15, 1, 75, 1], [128, 1, 85, 2], [52, 1, 85, 2], [98, 0.6, 45, 2], [76, 0.55, 50, 1]],
    droop: [[195, 0.8, 60, 0], [-15, 0.8, 60, 0], [158, 1, 100, 1], [22, 1, 100, 1], [122, 0.95, 118, 2], [58, 0.95, 118, 2], [92, 0.5, 60, 2]],
    wind: [[168, 0.5, -30, 0], [142, 0.8, -70, 1], [112, 0.9, -80, 2], [84, 1, 70, 2], [52, 1.1, 55, 2], [24, 1.15, 40, 1], [-8, 0.9, 35, 0]],
    fan: [[186, 0.7, 35, 0], [-6, 0.7, 35, 0], [156, 0.95, 45, 1], [24, 0.95, 45, 1], [126, 1, 40, 2], [54, 1, 40, 2], [92, 0.85, 12, 2]],
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
    const SETS = { A: [JA[0], JA[1], JA[1], JA[2], JA[2]], H: [J[3], J[3], J[3], J[4], J[4]], B: J, S: [J[2], J[3], J[3], J[4], J[4]] };
    const PN = { tl: C('#8eaca4'), td: C('#527882'), f: [[J[2], J[3]], [J[1], J[3]], [J[0], J[2]]] };
    const PF = { tl: C('#9ab8b0'), td: C('#648e96'), f: [[JA[2], C('#5c9a9c')], [JA[1], JA[2]], [JA[0], JA[2]]] };
    const back = x => 51 + 4 * Math.sin((x / 768) * TAU * 3 + 1) + 2 * Math.sin((x / 768) * TAU * 7);
    const q = rng(77);
    // far treeline (hazier, flatter)
    for (let x = 0; x < 768; x++) L.col(x, Math.round(back(x)) + 5, L.h - 1, JA[2]);
    const rowA = [];
    for (let i = 0; i < 30; i++) {
      const cx = (i + 0.5 + (q() - 0.5) * 0.5) * (768 / 30), rx = 11 + q() * 10;
      crown(rowA, i, 'A', 'A', cx, back(cx) - 2 + q() * 5, rx, rx * 0.62, q, true);
    }
    foliage(L, rowA, SETS);
    // palms: [x, base y, height, lean, frond radius, shape, flip, far?] — two tall heroes, small clusters
    for (const [x, y, h, lean, R, kind, flip, far] of [
      [116, 72, 60, 7, 21, 'arch', 0, 0], [508, 72, 54, -6, 20, 'wind', 1, 0],
      [226, 74, 30, -4, 11, 'droop', 0, 1], [246, 74, 42, 3, 14, 'arch', 1, 0], [262, 74, 24, 4, 9, 'fan', 0, 1],
      [322, 72, 28, -3, 10, 'wind', 1, 1], [344, 72, 40, 5, 13, 'droop', 0, 0],
      [600, 76, 44, 5, 15, 'fan', 0, 0], [668, 76, 34, -5, 12, 'wind', 0, 0], [690, 76, 26, 3, 9, 'droop', 0, 1],
      [748, 72, 36, 4, 12, 'arch', 0, 0], [764, 72, 26, -3, 9, 'fan', 1, 1],
    ]) palm(L, x, y, h, lean, R, kind, far ? PF : PN, flip);
    // dark hollows behind the main crowns
    const hol = x => back(x) + 13 + 2 * Math.sin((x / 768) * TAU * 11);
    for (let x = 0; x < 768; x++) L.col(x, Math.round(hol(x)) + 4, L.h - 1, J[4]);
    const rowH = [];
    for (let i = 0; i < 26; i++) { const cx = (i + 0.5 + (q() - 0.5) * 0.4) * (768 / 26), rx = 13 + q() * 8; rowH.push({ x: cx, y: hol(cx) + rx * 0.5, rx, ry: rx * 0.6, g: i, set: 'H' }); }
    foliage(L, rowH, SETS);
    // main crowns [cx, top, rx, ry], taller ones behind
    const rowB = [];
    [[34, 52, 40, 24], [98, 42, 26, 20], [150, 44, 44, 28], [214, 58, 24, 16], [268, 62, 40, 20], [334, 56, 28, 20],
      [396, 42, 46, 30], [462, 36, 26, 22], [516, 48, 38, 24], [580, 60, 26, 16], [640, 64, 44, 20], [716, 54, 36, 24]]
      .map((c, i) => [c, i]).sort((a, b) => a[0][1] - b[0][1]).forEach(([c, i]) => crown(rowB, 100 + i, 'B', 'S', c[0], c[1], c[2], c[3], q));
    foliage(L, rowB, SETS);
    // nearer, darker understory, then everything sinks into one quiet tone
    const und = x => 80 + 3 * Math.sin((x / 768) * TAU * 5 + 2);
    for (let x = 0; x < 768; x++) L.col(x, Math.round(und(x)) + 6, L.h - 1, J[4]);
    const rowC = [];
    for (let i = 0; i < 20; i++) {
      const cx = (i + 0.5 + (q() - 0.5) * 0.5) * (768 / 20), rx = 20 + q() * 12;
      crown(rowC, 200 + i, 'S', 'S', cx, und(cx) - 5 + q() * 6, rx, rx * 0.5, q);
    }
    foliage(L, rowC, SETS);
    const FADE = [3, 6, 10, 13];
    for (let x = 0; x < L.w; x++) {
      const y0 = Math.round(89 + 2.5 * Math.sin((x / 768) * TAU * 9) + 1.5 * Math.sin((x / 768) * TAU * 23 + 2));
      for (let y = y0; y < L.h; y++) { const k = y - y0, f = k < FADE.length ? FADE[k] / 16 : 1; if (L.d[y * L.w + x] && f > d4(x, y)) L.d[y * L.w + x] = J[4]; }
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
      { img: bake(makeSeaNear()), y: 120, speed: 0.11, raster: 5 },
      { img: bake(makeLagoon()), y: 130, speed: 0.22, raster: 2.6 },
      { img: bake(makeIsles()), y: 130 - WL, speed: 0.22 },
      { img: bake(makeJungle()), y: 90, speed: 0.45 },
    ],
  };
});
