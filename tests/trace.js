/* Trace one headless bot run: node tests/trace.js <level> [expected|noupg] [seedOffset]
 * Prints pompom losses (time, cause, what was near), gates taken, cards, result. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  page.on('pageerror', e => console.log('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await page.goto(URL + '?mute=1&tutorial=0');
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  const L = parseInt(process.argv[2], 10) || 1, mode = process.argv[3] || 'expected', so = parseInt(process.argv[4], 10) || 0;
  const out = await page.evaluate(([L, mode, so]) => {
    const PP = window.PP, G = PP.G, log = [];
    const prof = mode === 'expected' ? PP.econ.expectedProfile(L) : PP.save.defaults();
    PP.headless = true; PP.headlessEvents = true;
    const near = () => {
      const a = [];
      for (let i = 0; i < PP.enemies.pool.n; i++) { const e = PP.enemies.pool.items[i]; if (Math.abs(e.y - G.sy) < 90) a.push(e.def.id + (e.elite ? '*' : '') + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp + e.shell)); }
      for (const o of PP.obst.list) if (o.on && Math.abs(o.y - G.sy) < 120) a.push(o.type + '@' + Math.round(o.type === 'fence' ? o.gap : o.x) + ',' + Math.round(o.y));
      return a.join(' ');
    };
    const onLost = d => log.push('t=' + G.t.toFixed(1) + ' LOST ' + d.n + ' (' + d.cause + ') left ' + d.left + ' x=' + Math.round(PP.squad.x) + ' dps=' + Math.round(PP.squad.dps()) + ' | ' + near());
    const onGate = d => log.push('t=' + G.t.toFixed(1) + ' GATE ' + d.type + ' ' + d.val + ': ' + d.before + ' -> ' + d.after + (d.best ? '' : ' (not best)'));
    const onCard = d => log.push('t=' + G.t.toFixed(1) + ' CARD ' + d.card);
    const onBoss = d => log.push('t=' + G.t.toFixed(1) + ' BOSS start hp ' + d.hp);
    const onPhase = d => log.push('t=' + G.t.toFixed(1) + ' BOSS phase ' + d.phase + ' squad ' + PP.squad.n);
    PP.events.on('pompomLost', onLost); PP.events.on('gatePassed', onGate); PP.events.on('cardChosen', onCard); PP.events.on('bossStart', onBoss); PP.events.on('bossPhase', onPhase);
    const def = PP.data.levels[L];
    PP.run.start({ level: L, prof, autoplay: true, tutorial: false, H: 640, seed: def.seed + so * 1000 });
    log.push('start squad ' + PP.squad.n + ' weapon ' + PP.squad.weapon.id + ' lv' + PP.squad.wlv + ' dps ' + Math.round(PP.squad.dps()) + ' hpMult ' + G.hpMult.toFixed(2) + ' upg ' + JSON.stringify(prof.upg));
    for (let i = 0; i < 60 * 400 && !G.over; i++) { if (G.cards) PP.bot.chooseCard(); PP.run.step(1 / 60); }
    PP.headless = false; PP.headlessEvents = false;
    log.push('RESULT ' + JSON.stringify(G.result) + ' popped ' + G.popped + ' dps ' + Math.round(PP.squad.dps()));
    return log;
  }, [L, mode, so]);
  console.log(out.join('\n'));
  await browser.close();
})();
