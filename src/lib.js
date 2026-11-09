// SUNFOX — core namespace + pixel-art helpers shared by every art module.
(function () {
  const G = (window.G = window.G || {});
  G.W = 384; // native screen width  (16:9, x5 = 1920x1080)
  G.H = 216; // native screen height
  G.T = 16; // tile size

  // Shared master palette. Ramps go dark -> light and are hue-shifted
  // (shadows drift toward purple/blue, highlights toward yellow).
  G.PAL = {
    ink: '#1a1226', // universal dark outline (never pure black)
    white: '#fff8e8',
    green: ['#0f3b2e', '#1a6b3a', '#2fa043', '#6cd13c', '#c4f25c'],
    teal: ['#0c4a4a', '#17857a', '#3cc8a8', '#a0f0d0'],
    brown: ['#2b1622', '#5a2a2a', '#8f4a2e', '#c47a3c', '#eab368', '#ffe0a0'],
    stone: ['#2a2640', '#4a4a6a', '#7a7f9c', '#b0b8cc', '#e6ecf4'],
    orange: ['#7a2414', '#c2421a', '#f07a1c', '#ffb23c', '#ffe27a'],
    red: ['#5e0f2a', '#a81c30', '#e03434', '#ff7a5a'],
    blue: ['#14204e', '#1f47a0', '#2f86e0', '#5cc8f8', '#b8f0ff'],
    purple: ['#2e1250', '#5a2a8c', '#9450c8', '#d090f0'],
    gold: ['#8a5a10', '#d49a18', '#ffd630', '#fff6a8'],
    pink: ['#b04860', '#f08a90', '#ffc8c0'],
  };

  // New canvas. `c.ctx` is its 2D context.
  G.cv = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.ctx = c.getContext('2d');
    c.ctx.imageSmoothingEnabled = false;
    return c;
  };

  // Build a sprite from rows of characters. `pal` maps char -> '#rrggbb'.
  // '.' and ' ' are always transparent. All rows must have equal length.
  G.px = function (rows, pal) {
    const h = rows.length;
    const w = rows[0].length;
    const c = G.cv(w, h);
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      if (r.length !== w) throw new Error('G.px: row ' + y + ' has length ' + r.length + ', expected ' + w + ' :: "' + r + '"');
      for (let x = 0; x < w; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) throw new Error('G.px: unknown palette char "' + ch + '" at ' + x + ',' + y);
        c.ctx.fillStyle = col;
        c.ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  };

  G.flipH = function (src) {
    const c = G.cv(src.width, src.height);
    c.ctx.translate(src.width, 0);
    c.ctx.scale(-1, 1);
    c.ctx.drawImage(src, 0, 0);
    return c;
  };

  // Copy a canvas (optionally onto a bigger canvas at an offset).
  G.copy = function (src, w, h, ox, oy) {
    const c = G.cv(w || src.width, h || src.height);
    c.ctx.drawImage(src, ox || 0, oy || 0);
    return c;
  };

  // Art registry. Each art module calls G.defineArt('name', G => ({...canvases})).
  G.art = G.art || {};
  G.defineArt = function (name, fn) {
    G.art[name] = fn(G);
  };

  // ---- Tile collision shapes (shared by engine + terrain renderer) ----
  // '#' full solid. Slopes: '/' 45deg rising to the right, '\\' 45deg falling
  // to the right, '1','2' gentle rise (two tiles), '3','4' gentle fall.
  // Returns solid height (0..16) measured from the tile's bottom at local column lx.
  G.tileH = function (ch, lx) {
    switch (ch) {
      case '#': return 16;
      case '/': return lx + 1;
      case '\\': return 16 - lx;
      case '1': return (lx >> 1) + 1;
      case '2': return (lx >> 1) + 9;
      case '3': return 16 - (lx >> 1);
      case '4': return 8 - (lx >> 1);
      default: return 0;
    }
  };
})();
