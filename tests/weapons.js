/* Headless check of the 7 weapons at Lv1/3/5 (same level, same squad): no exceptions, distinct behaviour,
 * projectile / enemy caps respected. Also verifies determinism (same seed => same result) and the validator. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const out = await page.evaluate(() => {
    const PP = window.PP, G = PP.G, rows = [];
    const ids = PP.data.weapons.map(w => w.id);
    for (const id of ids) for (const lv of [1, 3, 5]) {
      const prof = PP.econ.expectedProfile(20);
      ids.forEach(w => { prof.weapons[w].own = 1; });
      prof.toy = lv; prof.equipped = id;      // one shared Toy Level
      PP.headless = true;
      PP.run.start({ level: 20, prof, autoplay: true, tutorial: false, H: 640 });
      let maxShots = 0, maxEn = 0, maxPk = 0;
      for (let i = 0; i < 60 * 300 && !G.over; i++) {
        if (G.cards) PP.bot.chooseCard();
        PP.run.step(1 / 60);
        if (PP.shots.pool.n > maxShots) maxShots = PP.shots.pool.n;
        if (PP.enemies.pool.n > maxEn) maxEn = PP.enemies.pool.n;
        if (PP.pickups.pool.n > maxPk) maxPk = PP.pickups.pool.n;
      }
      const r = G.result || {};
      PP.run.stop(); PP.headless = false;
      rows.push(id.padEnd(9) + ' lv' + lv + '  ' + (r.win ? 'WIN ' + r.stars + '*' : 'fail ' + Math.round((r.progress || 0) * 100) + '%') + '  squad ' + String(r.endSquad).padStart(3) + '  popped ' + String(r.popped).padStart(3) + '  maxShots ' + String(maxShots).padStart(3) + '  maxEnemies ' + maxEn + '  maxPickups ' + maxPk);
    }
    // determinism: same seed -> identical result, different seed -> (usually) different
    const prof = PP.econ.expectedProfile(17);
    const a = JSON.stringify(PP.balance.simLevel(17, { prof, seed: 4242 })), b = JSON.stringify(PP.balance.simLevel(17, { prof, seed: 4242 })), c = JSON.stringify(PP.balance.simLevel(17, { prof, seed: 4243 }));
    rows.push('determinism: same seed identical = ' + (a === b) + ', other seed differs = ' + (a !== c));
    const v = PP.validator.run();
    rows.push('validator: ' + (v.ok ? 'OK' : 'FAILED') + ' errors ' + v.errors.length + ' warnings ' + v.warnings.length + ' ' + v.errors.slice(0, 5).join(' | '));
    // endless headless: 12 game minutes with god mode, caps + no exceptions
    PP.headless = true;
    PP.run.start({ endless: true, prof: PP.econ.expectedProfile(30), autoplay: true, god: true, tutorial: false, H: 640, seed: 777 });
    let mS = 0, mE = 0, mES = 0, bosses = 0, lastBoss = false, cards = 0;
    for (let i = 0; i < 60 * 720; i++) {
      if (G.cards) { PP.bot.chooseCard(); cards++; }
      PP.run.step(1 / 60);
      if (PP.shots.pool.n > mS) mS = PP.shots.pool.n; if (PP.enemies.pool.n > mE) mE = PP.enemies.pool.n; if (PP.eshots.pool.n > mES) mES = PP.eshots.pool.n;
      if (PP.boss.on && !lastBoss) bosses++; lastBoss = PP.boss.on;
    }
    rows.push('endless headless 12 min: t=' + G.t.toFixed(0) + ' s, metres ' + Math.floor(G.dist / 10) + ', Le ' + G.L.toFixed(1) + ', squad ' + PP.squad.n + ', popped ' + G.popped + ', mini-bosses ' + bosses + ', cards ' + cards + ', maxShots ' + mS + ', maxEnemies ' + mE + ', maxEnemyShots ' + mES);
    PP.run.stop(); PP.headless = false;
    return rows;
  });
  console.log(out.join('\n'));
  console.log('errors: ' + errors.length); errors.slice(0, 8).forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
