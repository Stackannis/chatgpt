#!/usr/bin/env node
// Headless playthrough bot: checks the level can be completed with simple play.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?manual' + (process.argv[3] ? '&god' : '') + (process.argv[2] ? '#' + process.argv[2] : ''));
  await page.waitForFunction('window.G && G.debug');
  const res = await page.evaluate(() => {
    const D = G.debug, log = [], process_god = /god/.test(location.search);
    const tr = (location.hash || '').slice(1).split(','); if (tr.length === 2) window.TRACE = tr.map(Number);
    D.start();
    let jumpHold = 0, lastDead = 0, stuckT = 0, lastX = 0;
    for (let f = 0; f < 15000; f++) {
      const P = D.P, st = D.state;
      if (st === 'clear') { log.push('CLEAR at frame ' + f + ' ' + JSON.stringify(D.info)); break; }
      if (st === 'gameover') { log.push('GAMEOVER at frame ' + f); break; }
      if (P.dead) { if (!lastDead) log.push('died at x=' + Math.round(P.x) + ' (tile ' + (P.x / 16).toFixed(1) + ') y=' + Math.round(P.y) + ' frame ' + f); lastDead = 1; D.key('jump', false); D.step(1); continue; }
      lastDead = 0;
      if (process_god) { P.hp = 3; }
      let right = true, jump = false;
      if (P.onGround) {
        const gapAhead = D.groundAt(P.x + 12, P.y - 10, P.y + 30, P.y) === null;
        const wall = D.solidPx(P.x + 16, P.y - 12) || D.solidPx(P.x + 16, P.y - 20);
        let hazard = false;
        for (const e of D.ents) {
          if (e.type === 'enemy' && !e.dead) { const dx = e.x - P.x; if (dx > 0 && dx < (e.kind === 'spiker' ? 40 : 34) && Math.abs(e.y - P.y) < 40) hazard = true; }
          if (e.type === 'spikes') { const dx = e.tx * 16 + 8 - P.x; if (dx > 0 && dx < 30 && Math.abs(e.ty * 16 + 16 - P.y) < 24) hazard = true; }
        }
        if (gapAhead) {
          // measure the gap
          const up = P.ride && P.ride.ay ? 5 : 40;
          let w = 0; while (w < 200 && D.groundAt(P.x + 12 + w, P.y - up, P.y + 40, P.y - up) === null) w += 4;
          if (w > (P.ride ? (P.ride.ay ? 62 : 36) : 92)) {
            let ok = false;
            for (const m of D.ents) if (m.type === 'mover') { const dx = m.x - P.x; if (dx > 24 && dx < 66 && Math.abs(m.y - P.y) < 30) ok = true; }
            if (ok && !P.ride) jump = true; else right = P.ride ? (P.x < P.ride.x + 14) : false;
          } else jump = true;
        } else if (wall || hazard) jump = true;
        if (jump) jumpHold = 40;
      } else if (jumpHold > 0) { jumpHold--; jump = true; }
      // release for one frame before a new press
      if (P.onGround && D._wasJump && jump) jump = false;
      D._wasJump = jump;
      D.key('right', right); D.key('jump', jump);
      D.step(1);
      if (window.TRACE && P.x > TRACE[0] && P.x < TRACE[1] && f % 4 === 0) log.push(f + ' x=' + P.x.toFixed(1) + ' y=' + P.y.toFixed(1) + ' vx=' + P.vx.toFixed(2) + ' vy=' + P.vy.toFixed(2) + ' g=' + P.onGround + ' j=' + jump + ' hp=' + P.hp);
      if (Math.abs(P.x - lastX) < 0.01) { stuckT++; if (stuckT === 400) { log.push('STUCK at x=' + Math.round(P.x) + ' tile ' + (P.x / 16).toFixed(1) + ' y=' + Math.round(P.y)); } } else stuckT = 0;
      lastX = P.x;
    }
    log.push('final ' + JSON.stringify(D.info));
    return log;
  });
  console.log(res.join('\n'));
  await browser.close();
})();
