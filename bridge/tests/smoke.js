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
  await p.waitForTimeout(5000); s = await st(p); ok(s.squad > 3, 'belt gives pompoms (squad=' + s.squad + ')'); await shot(p, '03_belt');
  await p.close();
  // autoplay smart at speed: mid shots and win
  p = await mk({ width: 390, height: 844 }, '?autoplay=smart&speed=4&mute=1&seed=7', true);
  await p.waitForFunction(() => window.__bridge.state.time > 20); await shot(p, '04_mid');
  await p.waitForFunction(() => window.__bridge.state.hero); await p.waitForTimeout(150); await shot(p, '05_treasure_broken');
  await p.waitForFunction(() => { const s = window.__bridge.state; return s.boss && s.boss.y < 0.7; }); await shot(p, '06_boss1');
  await p.waitForFunction(() => { const s = window.__bridge.state; return s.boss && s.boss.final && s.boss.y < 0.6; }, null, { timeout: 60000 }); await shot(p, '07_boss2');
  await p.waitForFunction(() => window.__bridge.state.screen === 'result', null, { timeout: 60000 }); s = await st(p);
  ok(s.result === 'win', 'smart autoplay wins (squad ' + s.squad + ', ' + s.stars + ' stars)'); await shot(p, '08_win');
  await p.tap('#btn-retry'); await p.waitForTimeout(300); s = await st(p); ok(s.screen === 'play' && s.squad <= 2 && s.time < 2, 'retry restarts');
  await p.close();
  // lose
  p = await mk({ width: 360, height: 640 }, '?autoplay=horde&speed=6&mute=1&seed=3', true);
  await p.waitForFunction(() => window.__bridge.state.hordeFront < 0.24); await shot(p, '09_danger');
  await p.waitForFunction(() => window.__bridge.state.screen === 'result', null, { timeout: 60000 }); s = await st(p);
  ok(s.result === 'lose', 'horde-only strategy loses (' + s.reason + ')'); await shot(p, '10_lose'); await p.close();
  // desktop + keyboard + landscape
  p = await mk({ width: 1280, height: 800 }, '?mute=1&seed=5&lang=en');
  await p.keyboard.press('Enter'); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.keyboard.up('ArrowRight');
  s = await st(p); ok(s.screen === 'play' && s.x > 0.75, 'keyboard starts and steers (x=' + s.x.toFixed(2) + ')'); await shot(p, '11_desktop');
  const dm = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, sh: document.documentElement.scrollHeight, h: innerHeight })); ok(dm.sw <= dm.w && dm.sh <= dm.h, 'no page scroll');
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300); await shot(p, '12_landscape'); ok((await st(p)).screen === 'play', 'resize keeps the run');
  await p.close();
  // perf under 4x CPU throttle
  p = await mk({ width: 412, height: 915 }, '?autoplay=smart&mute=1&seed=7', true);
  const c2 = await p.context().newCDPSession(p); await c2.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForFunction(() => window.__bridge.state.time > 12);
  const ft = await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(), mx = 0, l = t0; (function f(t) { mx = Math.max(mx, t - l); l = t; if (++n < 180) requestAnimationFrame(f); else res({ avg: (t - t0) / n, max: mx }); })(t0); }));
  console.log('frame time at 4x CPU throttle: avg ' + ft.avg.toFixed(1) + ' ms, max ' + ft.max.toFixed(1) + ' ms'); ok(ft.avg < 25, 'perf ok under throttle');
  await p.close();
  ok(errs.length === 0, 'no console errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
