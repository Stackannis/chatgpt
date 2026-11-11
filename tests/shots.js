/* Visual check: screenshots of menu, each world, bosses, shop, map, win/lose, cards, pause, ending, FR.
 * Usage: node tests/shots.js [filter] */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'screenshots');
const filter = process.argv[2] || '';
const AP = '&autoplay=1&mute=1&tutorial=0&profile=expected';
const SHOTS = [
  ['menu', '?mute=1', 900],
  ['menu_fr', '?mute=1&lang=fr&unlockall=1&buttons=500', 900],
  ['w1_l3', '?level=3' + AP, 0, 22],
  ['w2_l9', '?level=9' + AP, 0, 30],
  ['w3_l15', '?level=15' + AP, 0, 40],
  ['w4_l21', '?level=21' + AP, 0, 45],
  ['w5_l27', '?level=27' + AP, 0, 50],
  ['l29_heavy', '?level=29' + AP, 0, 92],
  ['boss1', '?level=6' + AP, 0, 50],
  ['boss2', '?level=12' + AP, 0, 56],
  ['boss3', '?level=18' + AP, 0, 60],
  ['boss4', '?level=24' + AP, 0, 62],
  ['boss5', '?level=30&god=1' + AP, 0, 86],
  ['l1_tutorial', '?level=1&mute=1', 1500],
  ['map', '?screen=map&mute=1&unlockall=1', 900],
  ['shop_weapons', '?screen=shop&mute=1&unlockall=1&buttons=1234', 900],
  ['win', '?screen=win&mute=1&level=6', 2600],
  ['lose', '?screen=lose&mute=1&level=7&buttons=300', 1500],
  ['lose_fr', '?screen=lose&mute=1&level=7&lang=fr', 1500],
  ['settings_fr', '?screen=settings&mute=1&lang=fr', 900],
  ['ending', '?screen=ending&mute=1', 6200],
  ['endless', '?endless=1&god=1&level=30' + AP, 0, 70],
  // round 1 additions: new toy card, lose hints by cause, Helping Hand, Go to boss, Toy Level, replay ending, tall / short screens
  ['r1_win_newtoy', '?screen=win&mute=1&level=3', 2600],
  ['r1_lose_boss', '?screen=lose&mute=1&level=12&cause=boss&progress=0.85&upg=power:15,rate:12,buddy:6,shield:3,luck:5,magnet:4&wlv=5', 1500],
  ['r1_lose_hazard', '?screen=lose&mute=1&level=8&cause=hazard&progress=0.3&upg=power:15,rate:12,buddy:6,shield:3,luck:5,magnet:4&wlv=5', 1500],
  ['r1_lose_enemy_fr', '?screen=lose&mute=1&level=8&cause=enemy&progress=0.55&lang=fr&upg=power:15,rate:12,buddy:6,shield:3,luck:5,magnet:4&wlv=5', 1500],
  ['r1_lose_gates', '?screen=lose&mute=1&level=8&cause=gate&progress=0.55&upg=power:15,rate:12,buddy:6,shield:3,luck:5,magnet:4&wlv=5', 1500],
  ['r1_lose_glove_toboss', '?screen=lose&mute=1&level=12&fails=3&cause=boss', 1500],
  ['r1_levelcard_toboss', '?screen=map&mute=1&unlockall=1&level=18&fails=6', 700, 0, { run: 'PP.game.goto(\'map\', { open: 18 })', wait: 600 }],
  ['r1_shop_toy', '?screen=shop&mute=1&unlockall=1&buttons=1234&wlv=3', 900],
  ['r1_settings_replay', '?screen=settings&mute=1&unlockall=1', 900],
  ['r1_hud_helping', '?level=9&mute=1&tutorial=0&fails=4', 1200],
  ['r1_tall_780', '?level=9' + AP, 0, 30, { vp: [360, 780] }],
  ['r1_tall_780_boss', '?level=18' + AP, 0, 52, { vp: [360, 780] }],
  ['r1_short_600', '?level=9' + AP, 0, 30, { vp: [360, 600] }],
  ['r1_short_600_boss', '?level=6' + AP, 0, 50, { vp: [360, 600] }],
  ['r1_hitbox', '?level=17&hitbox=1' + AP, 0, 33]
];
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const s of SHOTS) {
    if (filter && s[0].indexOf(filter) < 0) continue;
    const o = s[4] || {}, vp = o.vp || [360, 640];
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(s[0] + ': ' + m.text()); });
    page.on('pageerror', e => errors.push(s[0] + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
    await page.goto(URL + s[1]);
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
    if (s[3]) { await page.waitForTimeout(300); await page.evaluate(sec => window.__game.skip(sec), s[3]); await page.waitForTimeout(700); }
    else await page.waitForTimeout(s[2]);
    if (o.run) { await page.evaluate(o.run); await page.waitForTimeout(o.wait || 400); }
    await page.screenshot({ path: path.join(OUT, s[0] + '.png') });
    const st = await page.evaluate(() => window.__game.getState());
    console.log(s[0] + ': screen=' + st.screen + ' level=' + st.level + ' t=' + st.t + ' squad=' + st.squad + ' boss=' + JSON.stringify(st.boss) + ' draws=' + st.draws);
    await ctx.close();
  }
  console.log('errors: ' + errors.length); errors.slice(0, 20).forEach(e => console.log('  ' + e));
  await browser.close();
})();
