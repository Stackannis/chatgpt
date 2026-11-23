// node bridge/tests/smoke.js : UI smoke test + screenshots
const { chromium } = require('playwright'); const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const shot = (p, n) => p.screenshot({ path: path.join(__dirname, 'screenshots', n + '.png') });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const mk = async (vp, q, touch) => { const c = await b.newContext({ viewport: vp, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: 2 }); const p = await c.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e))); await p.goto(URL + q); return p; };
  const st = p => p.evaluate(() => window.__bridge.state);
  // phone: menu, play, drag
  let p = await mk({ width: 360, height: 640 }, '?lang=fr&mute=1&seed=5', true);
  await shot(p, '01_menu'); ok((await st(p)).screen === 'menu', 'menu shown');
  await p.tap('#btn-play'); await p.waitForTimeout(600); ok((await st(p)).screen === 'play', 'play after tap');
  await shot(p, '02_start');
  const cdp = await p.context().newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', 180, 500); for (let i = 1; i <= 10; i++) { await touch('touchMove', 180 - i * 16, 500); await p.waitForTimeout(16); } await touch('touchEnd', 20, 500);
  await p.waitForTimeout(500); let s = await st(p); ok(s.x < 0.2, 'touch drag moves squad to the +1 belt (x=' + s.x.toFixed(2) + ')');
  await p.waitForTimeout(2500); s = await st(p); ok(s.squad > 5, 'belt gives pompoms (squad=' + s.squad + ')'); await shot(p, '03_belt');
  await p.close();
  // autoplay smart at speed: mid shots and win
  p = await mk({ width: 390, height: 844 }, '?autoplay=smart&speed=4&mute=1&seed=7', true);
  let maxSprites = 0; const poll = setInterval(async () => { try { maxSprites = Math.max(maxSprites, await p.evaluate(() => window.__bridge.stats.sprites)); } catch (e) {} }, 200);
  await p.waitForFunction(() => { const s = window.__bridge.state; return s.boss && s.boss.y < 0.5; }); await shot(p, '04_boss1');
  await p.waitForFunction(() => window.__bridge.state.gifts >= 1); await p.waitForTimeout(120); await shot(p, '05_gift_broken');
  await p.waitForFunction(() => window.__bridge.state.sprinters > 0, null, { timeout: 60000 }); await p.waitForTimeout(250); await shot(p, '06_sprinter');
  await p.waitForFunction(() => window.__bridge.state.rushing, null, { timeout: 60000 }); await shot(p, '06b_rush');
  await p.waitForFunction(() => { const s = window.__bridge.state; return s.boss && s.boss.final && s.boss.y < 0.45; }, null, { timeout: 90000 }); await shot(p, '07_final_boss');
  await p.waitForFunction(() => window.__bridge.state.screen === 'result', null, { timeout: 60000 }); s = await st(p);
  clearInterval(poll); ok(s.result === 'win', 'smart autoplay wins (squad ' + s.squad + ', shown ' + s.shownSquad + ', ' + s.stars + ' stars)'); await shot(p, '08_win');
  console.log('max sprites drawn in a frame: ' + maxSprites); ok(maxSprites > 0 && maxSprites < 320, 'sprite budget respected');
  await p.tap('#btn-retry'); await p.waitForTimeout(300); s = await st(p); ok(s.screen === 'play' && s.squad < 15 && s.time < 3, 'retry restarts');
  await p.close();
  // lose
  p = await mk({ width: 360, height: 640 }, '?autoplay=farm&speed=2&mute=1&seed=3', true);
  await p.waitForFunction(() => window.__bridge.state.hordeFront < 0.19); await p.waitForTimeout(120); await shot(p, '09_bonk');
  await p.waitForFunction(() => window.__bridge.state.screen === 'end', null, { timeout: 60000 }); await p.waitForTimeout(450); await shot(p, '09b_boss_slam');
  await p.waitForFunction(() => window.__bridge.state.screen === 'result', null, { timeout: 60000 }); s = await st(p);
  ok(s.result === 'lose', 'camping on the belt loses (' + s.reason + ')'); await shot(p, '10_lose'); await p.close();
  // desktop + keyboard + landscape
  p = await mk({ width: 1280, height: 800 }, '?mute=1&seed=5&lang=en');
  await p.keyboard.press('Enter'); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.keyboard.up('ArrowRight');
  s = await st(p); ok(s.screen === 'play' && s.x > 0.75, 'keyboard starts and steers (x=' + s.x.toFixed(2) + ')'); await shot(p, '11_desktop');
  const dm = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, sh: document.documentElement.scrollHeight, h: innerHeight })); ok(dm.sw <= dm.w && dm.sh <= dm.h, 'no page scroll');
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300); await shot(p, '12_landscape'); ok((await st(p)).screen === 'play', 'resize keeps the run');
  await p.close();
  // perf under 4x CPU throttle
  p = await mk({ width: 412, height: 915 }, '?autoplay=smart&mute=1&seed=7&speed=4', true);
  const c2 = await p.context().newCDPSession(p);   await p.waitForFunction(() => window.__bridge.state.time > 60, null, { timeout: 90000 });
  await p.evaluate(() => { history.replaceState(null, '', location.href); }); await c2.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ft = await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(), mx = 0, l = t0; (function f(t) { mx = Math.max(mx, t - l); l = t; if (++n < 180) requestAnimationFrame(f); else res({ avg: (t - t0) / n, max: mx }); })(t0); }));
  console.log('frame time at 4x CPU throttle: avg ' + ft.avg.toFixed(1) + ' ms, max ' + ft.max.toFixed(1) + ' ms'); ok(ft.avg < 25, 'perf ok under throttle');
  await p.close();
  ok(errs.length === 0, 'no console errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
