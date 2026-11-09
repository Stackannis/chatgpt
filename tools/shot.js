#!/usr/bin/env node
// In-game screenshots.
//   node tools/shot.js play 600 [frames] [tag]  -> shots/play-600.png or shots/play-<tag>.png (hero teleported to world x=600, 3x)
//   node tools/shot.js title               -> shots/title.png
//   node tools/shot.js overview            -> shots/overview-N.png (whole level in strips)
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [mode = 'play', a = '100', b = '30', tag = ''] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) console.log('[console.error]', m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?manual');
  await page.waitForFunction('window.G && G.debug');
  const out = n => path.resolve(__dirname, '..', 'shots', n);
  const snap = async (name, expr) => {
    const data = await page.evaluate(expr);
    require('fs').writeFileSync(out(name), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote ' + out(name));
  };
  const up = s => `(()=>{G.debug.draw();const s=document.getElementById('screen');const c=G.cv(s.width*${s},s.height*${s});c.ctx.drawImage(s,0,0,c.width,c.height);return c.toDataURL()})()`;
  if (mode === 'title') {
    await page.evaluate('G.debug.title(); G.debug.step(40)');
    await snap('title.png', up(3));
  } else if (mode === 'overview') {
    await page.evaluate('G.debug.start()');
    const LW = await page.evaluate('G.level.cols*16');
    for (let i = 0, x = 0; x < LW; x += 1152, i++)
      await snap('overview-' + i + '.png', `(()=>{const c=G.debug.overview(${x},1152);return c.toDataURL()})()`);
  } else {
    await page.evaluate(`G.debug.start(); G.debug.teleport(${+a}); G.debug.step(${+b});`);
    await snap('play-' + (tag || a) + '.png', up(3));
  }
  await browser.close();
})();
