/* Endless "Parade Marathon": bot + god mode for >= 10 game minutes (8x speed), sampling entities / heap,
 * then a normal ending to verify the best score is saved. Usage: node tests/endless.js [realSeconds] */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL + '?endless=1&autoplay=1&god=1&speed=8&mute=1&profile=expected&level=30&nopause=1');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const real = parseInt(process.argv[2], 10) || 90;
  let last = null;
  for (let i = 0; i < real / 10; i++) {
    await page.waitForTimeout(10000);
    last = await page.evaluate(() => { const s = window.__game.getState(); return { t: s.t, dist: s.distance, squad: s.squad, en: s.enemies.alive, popped: s.enemies.popped, shots: s.projectiles, pt: s.particles, fps: s.fps, q: s.quality, boss: s.boss ? s.boss.hp : 0, Le: Math.round(window.PP.G.L * 10) / 10, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : -1, screen: s.screen }; });
    console.log(JSON.stringify(last));
  }
  const bosses = await page.evaluate(() => window.__game.events.filter(e => e.type === 'bossStart').length);
  console.log('game minutes: ' + (last.t / 60).toFixed(1) + ', metres: ' + last.dist + ', mini-boss events in buffer: ' + bosses);
  // end the run normally and check the best score is saved
  await page.evaluate(() => { window.__game.setSpeed(1); window.__game.forceLose(); });
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => ({ screen: window.__game.getState().screen, best: window.__game.getSave().endlessBest, buttons: window.__game.getSave().buttons }));
  console.log('after run: ' + JSON.stringify(end));
  console.log('errors: ' + errors.length); errors.slice(0, 8).forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(errors.length || last.t < 600 || end.best <= 0 ? 1 : 0);
})();
