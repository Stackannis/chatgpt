#!/usr/bin/env node
// Checks every art module against the asset contract in docs/ART_GUIDE.md (names, frame counts, sizes)
// and that the audio module exposes its API without throwing.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?manual');
  await page.waitForFunction('window.G && G.debug');
  const out = await page.evaluate(() => {
    const A = G.art, bad = [], ok = [];
    const get = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), A);
    // [path, frames (0 = single canvas, -n = at least n), width, height]  (w/h: number, [min,max] or null)
    const SPEC = [
      ['terrain.dirt', 0, 64, 64], ['terrain.dirtDeep', 0, 64, 64], ['terrain.grass', 0, 64, 24], ['terrain.grassEndL', 0, 8, 24],
      ['terrain.grassEndR', 0, 8, 24], ['terrain.wallL', 0, 8, 64], ['terrain.wallR', 0, 8, 64], ['terrain.under', 0, 64, 8],
      ['terrain.platform.l', 0, 16, 16], ['terrain.platform.m', 0, 16, 16], ['terrain.platform.r', 0, 16, 16], ['terrain.moving', 0, 48, 16],
      ['terrain.block', 4, 16, 16], ['terrain.blockUsed', 0, 16, 16], ['terrain.spring', 3, 16, 24], ['terrain.spikes', 0, 16, 16],
      ['terrain.checkpoint.off', 1, 16, 32], ['terrain.checkpoint.on', 4, 16, 32], ['terrain.goal', 4, 32, 48], ['terrain.sign', 0, 16, 16],
      ['decor.palm', 0, [48, 80], [80, 112]], ['decor.tree', 0, [40, 72], [56, 88]], ['decor.bush1', 0, 32, 16], ['decor.bush2', 0, 48, 24],
      ['decor.fern', 0, 24, 16], ['decor.flowerA', 2, 16, 16], ['decor.flowerB', 2, 16, 24], ['decor.tuft', 0, 16, 8], ['decor.rock1', 0, 16, 12],
      ['decor.rock2', 0, 32, 24], ['decor.mushroom', 0, 16, 16], ['decor.totem', 0, 24, 48], ['decor.pillar', 0, 16, 48], ['decor.ruinBlock', 0, 32, 32],
      ['decor.vine', 0, 16, 32], ['decor.waterfall', 4, 32, 32], ['decor.waterfallTop', 4, 32, 16], ['decor.splash', 4, 48, 16],
      ['decor.water.surface', 4, 32, 8], ['decor.water.body', 0, 32, 32],
      ['bg.sky', 0, 384, 216],
      ['player.idle', 4, 32, 32], ['player.run', 8, 32, 32], ['player.jump', 2, 32, 32], ['player.fall', 2, 32, 32], ['player.skid', 1, 32, 32],
      ['player.hurt', 1, 32, 32], ['player.duck', 1, 32, 32], ['player.win', 2, 32, 32], ['player.icon', 0, 16, 16],
      ['enemies.walker.walk', 4, 24, 24], ['enemies.walker.squash', 1, 24, 24], ['enemies.spiker.walk', 4, 24, 24], ['enemies.flyer.fly', 4, 24, 24],
      ['items.gem', 6, 16, 16], ['items.bigCoin', 6, 24, 24], ['items.heart', 2, 16, 16], ['items.sparkle', 4, 16, 16], ['items.dust', 4, 16, 16],
      ['items.poof', 5, 24, 24], ['items.splash', 5, 32, 24], ['items.hud.heart', 0, 16, 16], ['items.hud.heartEmpty', 0, 16, 16],
      ['items.hud.gem', 0, 16, 16], ['items.hud.coinOn', 0, 16, 16], ['items.hud.coinOff', 0, 16, 16], ['items.logo', 0, [160, 260], [48, 96]],
    ];
    const fits = (v, s) => s == null || (Array.isArray(s) ? v >= s[0] && v <= s[1] : v === s);
    for (const [p, n, w, h] of SPEC) {
      let v = get(p);
      if (v == null) { bad.push(p + ': MISSING'); continue; }
      if (n === 0 && Array.isArray(v)) { bad.push(p + ': expected one canvas, got an array of ' + v.length); continue; }
      if (n !== 0 && !Array.isArray(v)) { bad.push(p + ': expected ' + n + ' frames, got a single canvas'); continue; }
      const fr = Array.isArray(v) ? v : [v];
      if (n > 0 && fr.length !== n) bad.push(p + ': expected ' + n + ' frames, got ' + fr.length);
      fr.forEach((c, i) => {
        if (!(c instanceof HTMLCanvasElement)) bad.push(p + '[' + i + ']: not a canvas');
        else if (!fits(c.width, w) || !fits(c.height, h)) bad.push(p + '[' + i + ']: size ' + c.width + 'x' + c.height + ', expected ' + JSON.stringify(w) + 'x' + JSON.stringify(h));
      });
      ok.push(p);
    }
    const B = A.bg;
    if (B && Array.isArray(B.layers)) B.layers.forEach((L, i) => {
      if (!(L.img instanceof HTMLCanvasElement) || typeof L.y !== 'number' || typeof L.speed !== 'number') bad.push('bg.layers[' + i + ']: needs {img, y, speed}');
    }); else bad.push('bg.layers: MISSING');
    const F = A.items && A.items.font;
    if (!F) bad.push('items.font: MISSING');
    else for (const ch of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!?:.,-'x+/") {
      const g = F[ch]; if (!g) bad.push('items.font: missing glyph "' + ch + '"'); else if (g.height !== 8 || g.width > 9) bad.push('items.font["' + ch + '"]: size ' + g.width + 'x' + g.height);
    }
    const au = G.audio, need = ['init', 'music', 'stopMusic', 'sfx', 'setMuted'];
    if (!au) bad.push('audio: G.audio MISSING');
    else {
      need.forEach(k => { if (typeof au[k] !== 'function') bad.push('audio.' + k + ': MISSING'); });
      try { au.sfx('jump'); au.music('level'); au.stopMusic(); } catch (e) { bad.push('audio throws before init(): ' + e.message); }
    }
    return { bad, ok: ok.length, total: SPEC.length };
  });
  await browser.close();
  console.log('contract: ' + out.ok + '/' + out.total + ' assets present');
  [...errs, ...out.bad].forEach(b => console.log('  ✗ ' + b));
  if (!errs.length && !out.bad.length) console.log('  all good');
  process.exitCode = errs.length || out.bad.length ? 1 : 0;
})();
