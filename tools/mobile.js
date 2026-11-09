#!/usr/bin/env node
// Mobile check: emulates phones (upright + landscape) with real multi-touch events,
// verifies the touch controls drive the hero, and writes screenshots to shots/mobile-*.png
const path = require('path');
const { chromium } = require('playwright');
const CASES = [
  { name: 'phone-upright', w: 390, h: 844, dpr: 3 },
  { name: 'phone-landscape', w: 844, h: 390, dpr: 3 },
  { name: 'small-android', w: 360, h: 740, dpr: 2 },
  { name: 'tablet-upright', w: 820, h: 1180, dpr: 2 },
];
(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  for (const c of CASES) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('[pageerror]', e.message); fail++; });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForFunction('window.G && G.debug');
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
    const centre = async id => page.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
    const mid = { x: c.w / 2, y: c.h / 2 };
    const tap = async p => { await touch('touchStart', [p]); await page.waitForTimeout(60); await touch('touchEnd', []); };
    await tap(mid);                                   // boot -> title
    await page.waitForTimeout(1300);
    await tap(mid);                                   // title -> game
    await page.waitForTimeout(1500);
    const info0 = await page.evaluate('G.debug.info');
    const R = await centre('bRight'), J = await centre('bJump'), Lf = await centre('bLeft');
    await touch('touchStart', [R]);
    await page.waitForTimeout(700);
    const info1 = await page.evaluate('G.debug.info');
    await touch('touchStart', [R, J]);                // second finger: jump while running
    await page.waitForTimeout(250);
    const info2 = await page.evaluate('G.debug.info');
    await touch('touchMove', [Lf, J]);                // slide the first finger over to "left"
    await page.waitForTimeout(500);
    const info3 = await page.evaluate('G.debug.info');
    await touch('touchEnd', []);
    const lay = await page.evaluate(() => {
      const s = document.getElementById('screen').getBoundingClientRect(), a = document.getElementById('app');
      return { rot: a.classList.contains('rot'), canvas: [Math.round(s.width), Math.round(s.height)], cssW: document.getElementById('screen').style.width,
               scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
    });
    const ok = info0.state === 'play' && info1.x > info0.x + 30 && !info2.onGround && info3.vx < info2.vx && lay.scrollW <= lay.innerW;
    if (!ok) fail++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.name}: rotated=${lay.rot} canvas=${lay.canvas.join('x')} state=${info0.state} ` +
      `x ${info0.x.toFixed(0)} -> ${info1.x.toFixed(0)} (right) jump:onGround=${info2.onGround} vx ${info2.vx.toFixed(2)} -> ${info3.vx.toFixed(2)} (slide to left)`);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'shots', 'mobile-' + c.name + '.png') });
    await ctx.close();
  }
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
