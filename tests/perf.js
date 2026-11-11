/* Frame-time measurement in the busiest level (L29, crescendo) at 360x640 @2x, normal and 4x CPU throttle.
 * Also records the entity / draw-call caps actually reached. Usage: node tests/perf.js [level] */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const L = parseInt(process.argv[2], 10) || 29, EXTRA = process.argv[3] || '';
async function measure(page, secs) {
  return page.evaluate(secs => new Promise(resolve => {
    const PP = window.PP, d = [], work = [];
    let last = performance.now(), maxE = 0, maxS = 0, maxP = 0, maxD = 0, maxT = 0, t0 = last, g0 = PP.G.t;
    function f(now) {
      d.push(now - last); last = now; work.push(PP.quality.work);
      maxE = Math.max(maxE, PP.enemies.pool.n); maxS = Math.max(maxS, PP.shots.pool.n + PP.eshots.pool.n);
      maxP = Math.max(maxP, PP.particles.pool.n); maxD = Math.max(maxD, PP.R.draws); maxT = Math.max(maxT, PP.particles.texts.n);
      if (now - t0 < secs * 1000 && !PP.G.over) requestAnimationFrame(f);
      else {
        d.shift(); d.sort((a, b) => a - b);
        const sum = d.reduce((a, b) => a + b, 0);
        resolve({ frames: d.length, avg: sum / d.length, p50: d[d.length >> 1], p95: d[Math.floor(d.length * 0.95)], max: d[d.length - 1], fps: 1000 * d.length / sum,
          workAvg: work.reduce((a, b) => a + b, 0) / work.length, maxEnemies: maxE, maxShots: maxS, maxParticles: maxP, maxTexts: maxT, maxDraws: maxD,
          gameSecs: PP.G.t - g0, realSecs: (now - t0) / 1000, quality: PP.quality.name + '/' + PP.quality.level,
          heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 });
      }
    }
    requestAnimationFrame(f);
  }), secs);
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL + '?level=' + L + '&autoplay=1&god=1&mute=1&tutorial=0&profile=expected&nopause=1' + EXTRA);
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__game.skip(62));
  await page.waitForTimeout(1500);
  const a = await measure(page, 14);
  console.log('L' + L + ' no throttle : ' + JSON.stringify(a, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(1000);
  const b = await measure(page, 14);
  console.log('L' + L + ' 4x throttle : ' + JSON.stringify(b, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v));
  console.log('gameplay speed identical under throttle: game/real = ' + (b.gameSecs / b.realSecs).toFixed(3) + ' (no throttle ' + (a.gameSecs / a.realSecs).toFixed(3) + ')');
  console.log('errors: ' + errors.length); errors.slice(0, 5).forEach(e => console.log('  ' + e));
  await browser.close();
})();
