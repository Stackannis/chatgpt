/* Real-loop autoplay (rendering on, 8x speed) over all 30 levels with the expected economy profile.
 * Also checks ?level=N&autoplay=1&speed=8 reaches levelWin / levelFail and emits events. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const errors = [], rows = [];
  async function run(L) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push('L' + L + ' ' + m.text()); });
    page.on('pageerror', e => errors.push('L' + L + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
    const t0 = Date.now();
    await page.goto(URL + '?level=' + L + '&autoplay=1&speed=8&mute=1&tutorial=0&profile=expected&nopause=1');
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
    let timedOut = false;
    try { await page.waitForFunction(() => { const s = window.__game.getState(); return s.screen === 'win' || s.screen === 'lose' || s.screen === 'ending'; }, null, { timeout: 120000 }); } catch (e) { timedOut = true; }
    const r = await page.evaluate(() => {
      const s = window.__game.getState(), ev = window.__game.events;
      const end = ev.filter(e => e.type === 'levelWin' || e.type === 'levelFail').pop();
      return { screen: s.screen, res: end ? end.data : null, types: Array.from(new Set(ev.map(e => e.type))).join(','), maxDraws: s.maxDraws, quality: s.quality, t: s.t };
    });
    rows.push({ L, timedOut, wall: Date.now() - t0, ...r });
    await ctx.close();
  }
  const levels = []; for (let L = 1; L <= 30; L++) levels.push(L);
  const CONC = 4;
  for (let i = 0; i < levels.length; i += CONC) await Promise.all(levels.slice(i, i + CONC).map(run));
  rows.sort((a, b) => a.L - b.L);
  let wins = 0, ended = 0;
  for (const r of rows) {
    const d = r.res;
    if (d) ended++;
    if (d && d.win) wins++;
    console.log('L' + String(r.L).padStart(2) + (r.L % 6 === 0 ? '*' : ' ') + ' ' + (r.timedOut ? 'TIMEOUT' : (d ? (d.win ? 'WIN  ' + d.stars + '★' : 'FAIL ' + Math.round(d.progress * 100) + '%') : 'no result')) +
      (d ? '  squad ' + String(d.endSquad).padStart(3) + '  game ' + String(d.time).padStart(5) + ' s  popped ' + String(d.popped).padStart(3) : '') + '  wall ' + (r.wall / 1000).toFixed(1) + ' s  maxDraws ' + r.maxDraws + '  q ' + r.quality + '  screen ' + r.screen);
  }
  console.log('reached levelWin/levelFail: ' + ended + '/30, wins: ' + wins + '/30');
  console.log('event types seen (L30): ' + rows[29].types);
  console.log('errors: ' + errors.length); errors.slice(0, 10).forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(errors.length || ended < 30 ? 1 : 0);
})();
