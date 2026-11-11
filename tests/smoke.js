/* Smoke test: boot via file://, no console/page errors, menu visible, quick level start. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) requests.push(r.url()); });
  const t0 = Date.now();
  await page.goto(URL + (process.argv[2] || ''));
  try { await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 }); } catch (e) { errors.push('not ready: ' + e.message); }
  console.log('ready in ms:', Date.now() - t0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'smoke_menu.png') });
  console.log('state:', JSON.stringify(await page.evaluate(() => window.__game && window.__game.getState())));
  if (!process.argv[2]) {
    await page.evaluate(() => window.__game.startLevel(1, { autoplay: true, tutorial: false }));
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'smoke_l1.png') });
    console.log('state:', JSON.stringify(await page.evaluate(() => window.__game.getState())));
  } else {
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'smoke_param.png') });
    console.log('state:', JSON.stringify(await page.evaluate(() => window.__game.getState())));
  }
  console.log('errors:', errors.length); errors.slice(0, 15).forEach(e => console.log('  ' + e));
  console.log('external requests:', requests.length);
  await browser.close();
})();
