/* End-to-end UI flow on a 360x640 touch viewport and a desktop viewport.
 * menu -> level (touch drags) -> pause -> win -> next -> lose -> shop -> map -> level card -> cards,
 * keyboard + mouse on desktop, save/load round trip, language, settings. Exits non-zero on failure. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'screenshots');
const results = [];
function check(name, ok, info) { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  [' + info + ']' : '')); }
const st = page => page.evaluate(() => window.__game.getState());
async function ready(page) { await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 }); }
async function touchDrag(cdp, x0, y, x1, steps) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y, id: 1 }] });
    await new Promise(r => setTimeout(r, 16));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
function watch(page, errors, tag) {
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(tag + ' ' + m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) errors.push(tag + ' external request: ' + r.url()); });
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  /* ---------- phone, touch, persistent save (no debug params) ---------- */
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'en-US' });
  const page = await ctx.newPage();
  watch(page, errors, 'phone');
  await page.goto(URL);
  await ready(page);
  await page.evaluate(() => window.__game.resetSave());
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  let s = await st(page);
  check('boots to menu', s.screen === 'menu', s.screen);
  const box = await page.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(); return { w: c.width, h: c.height, l: c.left, t: c.top, bw: document.getElementById('game').width }; });
  check('portrait phone fills the screen', Math.abs(box.w - 360) < 1 && Math.abs(box.h - 640) < 1, JSON.stringify(box));
  check('DPR capped at 2', box.bw === 720, box.bw);
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('#ui .screen.on button')).filter(b => b.getBoundingClientRect().height < 47.5).map(b => b.getAttribute('data-testid')));
  check('menu buttons >= 48 px tall', small.length === 0, small.join(','));
  const noTestId = await page.evaluate(() => Array.from(document.querySelectorAll('#ui button')).filter(b => !b.getAttribute('data-testid')).length);
  check('menu buttons have data-testid', noTestId === 0, noTestId);

  await page.tap('[data-testid=btn-play]');
  await page.waitForTimeout(600);
  s = await st(page);
  check('PLAY starts level 1', s.screen === 'play' && s.level === 1, s.screen + ' L' + s.level);
  check('tutorial hint visible', await page.evaluate(() => document.getElementById('hint').classList.contains('on')), '');
  const t0 = s.t;
  await page.waitForTimeout(700);
  check('L1 waits for the first drag (no spawns)', (await st(page)).enemies.alive === 0, '');
  const x0 = (await st(page)).squadX;
  await touchDrag(cdp, 120, 500, 260, 12);
  await page.waitForTimeout(250);
  const x1 = (await st(page)).squadX;
  check('touch drag right moves the squad', x1 > x0 + 60, x0 + ' -> ' + x1);
  await touchDrag(cdp, 300, 300, 60, 14);
  await page.waitForTimeout(250);
  const x2 = (await st(page)).squadX;
  check('touch drag left moves the squad (relative, finger anywhere)', x2 < x1 - 80, x1 + ' -> ' + x2);
  check('drag hint dismissed after moving', !(await page.evaluate(() => document.getElementById('hint').classList.contains('on'))), '');
  await page.waitForTimeout(2500);
  s = await st(page);
  check('auto-fire + enemies spawn', s.projectiles > 0 && s.enemies.alive > 0, 'shots ' + s.projectiles + ' enemies ' + s.enemies.alive);
  await page.screenshot({ path: path.join(OUT, 'e2e_l1_play.png') });

  // pause via the canvas HUD button (touch), resume via button
  await page.touchscreen.tap(30, 70);
  await page.waitForTimeout(250);
  s = await st(page);
  check('HUD pause button pauses', s.paused && s.screen === 'pause', s.screen);
  const tp = s.t; await page.waitForTimeout(500);
  check('simulation stopped while paused', (await st(page)).t === tp, '');
  check('audio suspended while paused', await page.evaluate(() => !window.PP.audio.ctx || window.PP.audio.ctx.state !== 'running'), await page.evaluate(() => window.PP.audio.ctx && window.PP.audio.ctx.state));
  await page.screenshot({ path: path.join(OUT, 'e2e_pause.png') });
  await page.tap('[data-testid=btn-resume]');
  await page.waitForTimeout(300);
  check('resume continues', !(await st(page)).paused && (await st(page)).screen === 'play', '');

  // finish the level with the bot at 8x
  await page.evaluate(() => { window.__game.setAutoplay(true); window.__game.setSpeed(8); });
  await page.waitForFunction(() => window.__game.getState().screen === 'win' || window.__game.getState().screen === 'lose', null, { timeout: 60000 });
  await page.evaluate(() => { window.__game.setSpeed(1); window.__game.setAutoplay(false); });
  await page.waitForTimeout(2200);
  s = await st(page);
  check('level 1 won -> win screen', s.screen === 'win' && s.lastResult.win, JSON.stringify(s.lastResult));
  check('win grants Buttons', s.buttonsTotal > 0, s.buttonsTotal);
  await page.screenshot({ path: path.join(OUT, 'e2e_win.png') });
  let sv = await page.evaluate(() => window.__game.getSave());
  check('level 2 unlocked + stars saved', sv.unlocked === 2 && sv.levels['1'].s >= 1, JSON.stringify(sv.levels));

  await page.tap('[data-testid=btn-next]');
  await page.waitForTimeout(500);
  s = await st(page);
  check('Next starts level 2', s.screen === 'play' && s.level === 2, s.level);
  await page.evaluate(() => window.__game.skip(20));
  await page.evaluate(() => window.__game.forceLose());
  await page.waitForTimeout(1300);
  s = await st(page);
  check('lose screen shows', s.screen === 'lose' && s.lastResult && !s.lastResult.win, s.screen);
  await page.screenshot({ path: path.join(OUT, 'e2e_lose.png') });
  sv = await page.evaluate(() => window.__game.getSave());
  check('fail keeps Buttons + records best %', sv.levels['2'] && sv.levels['2'].pct > 0 && sv.fails['2'] === 1, JSON.stringify(sv.levels['2']) + ' fails ' + JSON.stringify(sv.fails));

  // workshop from the lose screen, buy an upgrade
  await page.evaluate(() => window.__game.give({ buttons: 500 }));
  await page.tap('[data-testid=btn-result-shop]');
  await page.waitForTimeout(400);
  check('workshop opens', (await st(page)).screen === 'shop', '');
  await page.tap('[data-testid=tab-upgrades]');
  await page.waitForTimeout(200);
  await page.tap('[data-testid=buy-upg-power]');
  await page.waitForTimeout(300);
  sv = await page.evaluate(() => window.__game.getSave());
  check('upgrade purchase: power 1, cost 60', sv.upg.power === 1 && sv.buttons === 440, 'power ' + sv.upg.power + ' buttons ' + sv.buttons);
  await page.tap('[data-testid=tab-weapons]');
  await page.waitForTimeout(200);
  await page.tap('[data-testid=buy-weapon-wand]');
  await page.waitForTimeout(300);
  sv = await page.evaluate(() => window.__game.getSave());
  check('weapon upgrade: wand lv 2, cost 150', sv.weapons.wand.lv === 2 && sv.buttons === 290, 'lv ' + sv.weapons.wand.lv + ' buttons ' + sv.buttons);
  await page.screenshot({ path: path.join(OUT, 'e2e_shop.png') });
  await page.tap('[data-testid=btn-back]');
  await page.waitForTimeout(300);
  check('back from workshop returns to the result screen', (await st(page)).screen === 'lose', (await st(page)).screen);

  // map + level card
  await page.tap('[data-testid=btn-result-map]');
  await page.waitForTimeout(500);
  check('map opens', (await st(page)).screen === 'map', '');
  await page.screenshot({ path: path.join(OUT, 'e2e_map.png') });
  check('map shows stars for level 1', await page.evaluate(() => !!document.querySelector('[data-testid=node-1] .stars')), '');
  check('locked node is locked', await page.evaluate(() => document.querySelector('[data-testid=node-5]').classList.contains('locked')), '');
  await page.tap('[data-testid=node-2]', { force: true });   // the current node bounces (CSS animation)
  await page.waitForTimeout(300);
  check('level card opens', await page.evaluate(() => !!document.querySelector('[data-testid=level-card]')), '');
  await page.screenshot({ path: path.join(OUT, 'e2e_levelcard.png') });
  await page.tap('[data-testid=card-play]');
  await page.waitForTimeout(500);
  s = await st(page);
  check('level card PLAY starts level 2', s.screen === 'play' && s.level === 2, s.level);

  // helping hand after 2 fails
  await page.evaluate(() => window.__game.forceLose());
  await page.waitForTimeout(1200);
  await page.tap('[data-testid=btn-retry]');
  await page.waitForTimeout(500);
  s = await st(page);
  sv = await page.evaluate(() => window.__game.getSave());
  check('Helping Hand: +3 pompoms after 2 fails', s.squad === 3 + sv.upg.buddy + 3, 'squad ' + s.squad);

  // save / load round trip (real localStorage under file://)
  await page.evaluate(() => { window.PP.save.data.settings.music = 0; return window.PP.save.flush(); });
  const before = await page.evaluate(() => JSON.stringify(window.__game.getSave()));
  const bytes = before.length;
  await page.reload();
  await ready(page);
  const after = await page.evaluate(() => JSON.stringify(window.__game.getSave()));
  check('save/load round trip identical', before === after, bytes + ' bytes');
  check('save under 4 KB', bytes < 4096, bytes);
  check('corrupt save does not crash', await page.evaluate(() => { const d = window.PP.save.parse('{"v":99,"buttons":"x","levels":[1,2],"weapons":null,'); const e = window.PP.save.parse('{"v":7,"buttons":12,"unlocked":999,"upg":{"power":99}}'); return d.buttons === 0 && e.buttons === 12 && e.unlocked === 31 && e.upg.power === 15; }), '');
  await page.evaluate(() => window.__game.resetSave());
  await ctx.close();

  /* ---------- cards + keyboard, desktop viewport, mouse ---------- */
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'fr-FR' });
  const dp = await dctx.newPage();
  watch(dp, errors, 'desktop');
  await dp.goto(URL + '?unlockall=1&buttons=2000&tutorial=0');
  await ready(dp);
  s = await st(dp);
  check('language auto-detected (fr-FR -> fr)', s.lang === 'fr', s.lang);
  const dbox = await dp.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(); return { w: Math.round(c.width), h: Math.round(c.height), l: Math.round(c.left), bg: getComputedStyle(document.body).backgroundImage.slice(0, 20) }; });
  check('desktop: centred portrait column with themed pillarbox', dbox.h === 800 && dbox.w < 500 && dbox.l > 300 && dbox.bg.indexOf('url(') === 0, JSON.stringify(dbox));
  await dp.screenshot({ path: path.join(OUT, 'e2e_desktop_menu_fr.png') });
  await dp.keyboard.press('Tab');
  await dp.evaluate(() => window.__game.startLevel(5));
  await dp.waitForTimeout(500);
  const k0 = (await st(dp)).squadX;
  await dp.keyboard.down('ArrowRight'); await dp.waitForTimeout(450); await dp.keyboard.up('ArrowRight');
  const k1 = (await st(dp)).squadX;
  await dp.keyboard.down('a'); await dp.waitForTimeout(600); await dp.keyboard.up('a');
  const k2 = (await st(dp)).squadX;
  check('keyboard arrows / A-D steer', k1 > k0 + 60 && k2 < k1 - 80, k0 + ' -> ' + k1 + ' -> ' + k2);
  await dp.mouse.move(640, 500); await dp.mouse.down(); await dp.mouse.move(760, 500, { steps: 8 }); await dp.mouse.up();
  await dp.waitForTimeout(200);
  const m1 = (await st(dp)).squadX;
  check('mouse drag steers', m1 > k2 + 30, k2 + ' -> ' + m1);
  await dp.keyboard.press('Escape');
  await dp.waitForTimeout(200);
  check('Esc pauses', (await st(dp)).paused, '');
  await dp.keyboard.press('Escape');
  await dp.waitForTimeout(200);
  check('Esc resumes', !(await st(dp)).paused, '');
  // live resize keeps state
  const tb = (await st(dp)).t;
  await dp.setViewportSize({ width: 900, height: 600 });
  await dp.waitForTimeout(400);
  s = await st(dp);
  check('live resize keeps the run', s.screen === 'play' && s.level === 5 && s.t > tb, 't ' + s.t);
  await dp.setViewportSize({ width: 1280, height: 800 });
  await dp.waitForTimeout(300);
  // Sparkle Meter cards
  await dp.evaluate(() => { window.__game.setAutoplay(true); });
  let gotCards = false;
  for (let i = 0; i < 60 && !gotCards; i++) {
    await dp.evaluate(() => { const G = window.PP.G; for (let k = 0; k < 120 && !G.cards && !G.over; k++) window.PP.run.step(1 / 60); });
    gotCards = (await st(dp)).cardsPending;
  }
  await dp.evaluate(() => { window.__game.setAutoplay(false); if (window.PP.G.cards && window.PP.game.screen !== 'cards') window.PP.game.onCards(); });
  await dp.waitForTimeout(400);
  s = await st(dp);
  check('Sparkle Meter offers 2 cards and pauses the sim', s.cardsPending && s.screen === 'cards' && await dp.evaluate(() => document.querySelectorAll('.card').length === 2), s.screen);
  await dp.screenshot({ path: path.join(OUT, 'e2e_cards_fr.png') });
  const tc = s.t; await dp.waitForTimeout(400);
  check('no timer while choosing', (await st(dp)).t === tc, '');
  await dp.keyboard.press('ArrowRight'); await dp.keyboard.press('Enter');
  await dp.waitForTimeout(300);
  s = await st(dp);
  check('card chosen with keyboard, play resumes', !s.cardsPending && s.screen === 'play', s.screen);
  // settings: toggles, language switch, no master mute
  await dp.evaluate(() => window.__game.goto('settings'));
  await dp.waitForTimeout(300);
  check('settings: separate music + sfx toggles, no master mute', await dp.evaluate(() => !!document.querySelector('[data-testid=set-music]') && !!document.querySelector('[data-testid=set-sfx]') && !document.querySelector('[data-testid=set-mute]')), '');
  await dp.click('[data-testid=set-lang-en]');
  await dp.waitForTimeout(300);
  check('language switch to English', (await st(dp)).lang === 'en' && await dp.evaluate(() => document.querySelector('.head .title').textContent === 'Settings'), '');
  await dp.click('[data-testid=set-reset]'); await dp.waitForTimeout(150);
  check('reset needs a second confirmation', await dp.evaluate(() => !!document.querySelector('[data-testid=set-reset-confirm]')), '');
  await dp.click('[data-testid=set-reset-cancel]');
  // FR overflow check on all DOM screens
  await dp.evaluate(() => { window.PP.i18n.setLang('fr'); });
  let overflow = [];
  for (const scr of ['menu', 'map', 'shop', 'settings', 'win', 'lose']) {
    await dp.evaluate(sc => window.__game.goto(sc), scr);
    await dp.waitForTimeout(250);
    const o = await dp.evaluate(() => Array.from(document.querySelectorAll('#ui .screen.on *')).filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.slice(0, 30)));
    const out = await dp.evaluate(() => { const r = document.getElementById('ui').getBoundingClientRect(); return Array.from(document.querySelectorAll('#ui .screen.on button, #ui .screen.on .title, #ui .screen.on .pill')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.left < r.left - 1 || b.right > r.right + 1); }).map(e => e.textContent.slice(0, 30)); });
    if (o.length || out.length) overflow.push(scr + ': ' + o.concat(out).join(' | '));
  }
  check('no text overflow in FR', overflow.length === 0, overflow.join(' ; '));
  await dctx.close();

  /* ---------- landscape phone ---------- */
  const lctx = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const lp = await lctx.newPage();
  watch(lp, errors, 'landscape');
  await lp.goto(URL + '?level=3&tutorial=0&mute=1');
  await ready(lp);
  await lp.waitForTimeout(800);
  const lbox = await lp.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(); return { w: Math.round(c.width), h: Math.round(c.height), l: Math.round(c.left) }; });
  check('landscape: letterboxed portrait column', lbox.h === 360 && lbox.w === 216 && lbox.l > 200, JSON.stringify(lbox));
  await lp.screenshot({ path: path.join(OUT, 'e2e_landscape.png') });
  await lctx.close();

  check('zero console errors / page errors / external requests', errors.length === 0, errors.slice(0, 8).join(' || '));
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
