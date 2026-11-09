// Pre-renders the level's solid terrain (dirt body, depth shading, walls,
// undersides, grass cap following slopes) into chunk canvases.
(function () {
  const G = window.G;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const CHUNK = 512;

  function texData(cnv, fallback) {
    if (!cnv) {
      cnv = G.cv(64, 64);
      cnv.ctx.fillStyle = fallback;
      cnv.ctx.fillRect(0, 0, 64, 64);
    }
    const d = cnv.getContext('2d').getImageData(0, 0, cnv.width, cnv.height);
    return { w: cnv.width, h: cnv.height, d: new Uint32Array(d.data.buffer) };
  }

  // grid: array of equal-length strings. T: G.art.terrain (pieces may be missing).
  G.buildTerrain = function (grid, T) {
    T = T || {};
    const rows = grid.length, cols = grid[0].length;
    const W = cols * 16, H = rows * 16;
    const mask = new Uint8Array(W * H);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const ch = grid[cy][cx];
        if (ch === ' ') continue;
        for (let lx = 0; lx < 16; lx++) {
          const h = G.tileH(ch, lx);
          for (let k = 0; k < h; k++) mask[(cy * 16 + 15 - k) * W + cx * 16 + lx] = 1;
        }
      }
    }
    const solid = (x, y) => (y < 0 ? 0 : x < 0 || x >= W || y >= H ? 1 : mask[y * W + x]);

    // Chamfer distance to nearest air pixel (3 per orthogonal step, 4 per diagonal).
    const dist = new Uint16Array(W * H);
    const INF = 60000;
    for (let i = 0; i < W * H; i++) dist[i] = mask[i] ? INF : 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!dist[i]) continue;
        let d = dist[i];
        if (y === 0) d = Math.min(d, 3);
        else {
          d = Math.min(d, dist[i - W] + 3);
          if (x > 0) d = Math.min(d, dist[i - W - 1] + 4);
          if (x < W - 1) d = Math.min(d, dist[i - W + 1] + 4);
        }
        if (x > 0) d = Math.min(d, dist[i - 1] + 3);
        dist[i] = d;
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        if (!dist[i]) continue;
        let d = dist[i];
        if (y < H - 1) {
          d = Math.min(d, dist[i + W] + 3);
          if (x > 0) d = Math.min(d, dist[i + W - 1] + 4);
          if (x < W - 1) d = Math.min(d, dist[i + W + 1] + 4);
        }
        if (x < W - 1) d = Math.min(d, dist[i + 1] + 3);
        dist[i] = d;
      }
    }

    const dirt = texData(T.dirt, '#8f4a2e');
    const deep = texData(T.dirtDeep, '#5a2a2a');
    const NEAR = 50 * 3, FAR = 74 * 3; // pixels of depth where the dithered blend to dirtDeep happens

    const chunks = [];
    for (let x0 = 0; x0 < W; x0 += CHUNK) {
      const cw = Math.min(CHUNK, W - x0);
      const c = G.cv(cw, H);
      const img = c.ctx.createImageData(cw, H);
      const out = new Uint32Array(img.data.buffer);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < cw; x++) {
          const wx = x0 + x;
          const i = y * W + wx;
          if (!mask[i]) continue;
          const d = dist[i];
          let useDeep = false;
          if (d >= FAR) useDeep = true;
          else if (d > NEAR) useDeep = ((d - NEAR) / (FAR - NEAR)) * 16 > BAYER[(y & 3) * 4 + (wx & 3)] + 0.5;
          const t = useDeep ? deep : dirt;
          out[y * cw + x] = t.d[(y % t.h) * t.w + (wx % t.w)];
        }
      }
      c.ctx.putImageData(img, 0, 0);
      chunks.push(c);
    }
    // Draw helper that splats onto whichever chunk(s) a world rect touches.
    function blit(src, sx, sy, sw, sh, dx, dy) {
      const a = Math.floor(dx / CHUNK), b = Math.floor((dx + sw - 1) / CHUNK);
      for (let k = a; k <= b; k++) if (chunks[k]) chunks[k].ctx.drawImage(src, sx, sy, sw, sh, dx - k * CHUNK, dy, sw, sh);
    }
    const tileAt = (cx, cy) => (cy < 0 ? ' ' : cx < 0 || cx >= cols || cy >= rows ? '#' : grid[cy][cx]);

    // Exposed vertical faces + undersides (tile level).
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const ch = grid[cy][cx];
        if (ch === ' ' || ch === '=') continue;
        const X = cx * 16, Y = cy * 16;
        if (ch === '#') {
          for (let k = 0; k < 16; k++) {
            const y = Y + k;
            if (T.wallL && !solid(X - 1, y)) blit(T.wallL, 0, y % T.wallL.height, 8, 1, X, y);
            if (T.wallR && !solid(X + 16, y)) blit(T.wallR, 0, y % T.wallR.height, 8, 1, X + 8, y);
          }
        }
        const below = tileAt(cx, cy + 1);
        if (T.under && (below === ' ' || below === '=')) blit(T.under, X % T.under.width, 0, 16, 8, X, Y + 8);
      }
    }
    // Grass cap: one 1px column per surface pixel, so it follows any slope.
    const gr = T.grass;
    const tops = []; // [x, y] of every surface
    for (let x = 0; x < W; x++) {
      for (let y = 1; y < H; y++) {
        if (mask[y * W + x] && !mask[(y - 1) * W + x]) {
          tops.push(x, y);
          if (!gr) continue;
          let len = 0; // clip the mat to the solid body
          while (len < gr.height - 8 && y + len < H && mask[(y + len) * W + x]) len++;
          blit(gr, x % gr.width, 0, 1, 8 + len, x, y - 8);
        }
      }
    }
    for (let i = 0; i < tops.length; i += 2) {
      const x = tops[i], y = tops[i + 1];
      const openL = !solid(x - 1, y) && !solid(x - 1, y + 7) && !solid(x - 1, y + 3);
      const openR = !solid(x + 1, y) && !solid(x + 1, y + 7) && !solid(x + 1, y + 3);
      if (openL && T.grassEndL) blit(T.grassEndL, 0, 0, 8, T.grassEndL.height, x - 4, y - 8);
      if (openR && T.grassEndR) blit(T.grassEndR, 0, 0, 8, T.grassEndR.height, x - 3, y - 8);
    }

    return {
      W, H, chunks,
      draw(ctx, camX, camY) {
        const a = Math.max(0, Math.floor(camX / CHUNK)), b = Math.min(chunks.length - 1, Math.floor((camX + G.W) / CHUNK));
        for (let k = a; k <= b; k++) ctx.drawImage(chunks[k], k * CHUNK - camX, -camY);
      },
    };
  };
})();
