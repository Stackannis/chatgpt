/* Regression checks for the round-1 findings (docs/FIX_PLAN_R1.md): code-1..7, gameplay-3/4/5/7/8/9.
 * Each block reproduces the critic's scenario (review/code/t*.js) and asserts the fixed behaviour.
 * Usage: node tests/regress.js   (exit code 1 on any failure) */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium, open, makeChecker, sleep } = require('./lib');
const check = makeChecker();
const MOCK = `
window.__yt = { calls: [], saved: [], scores: [], cb: {} };
window.ytgame = {
  IN_PLAYABLES_ENV: true,
  game: { firstFrameReady() { __yt.calls.push('firstFrameReady'); }, gameReady() { __yt.calls.push('gameReady'); },
    async loadData() { __yt.calls.push('loadData'); return window.__ytData || ''; }, async saveData(s) { __yt.calls.push('saveData'); __yt.saved.push(s); } },
  system: { getLanguage: async () => 'en-US', isAudioEnabled: () => true, onAudioEnabledChange(cb) { __yt.cb.audio = cb; }, onPause(cb) { __yt.cb.pause = cb; }, onResume(cb) { __yt.cb.resume = cb; } },
  engagement: { sendScore(o) { __yt.scores.push(o); } },
  health: { logError() { __yt.calls.push('logError'); }, logWarning() { __yt.calls.push('logWarning'); } }
};`;

(async () => {
  const browser = await chromium.launch();
  const allErrors = [];

  /* ---------------- code-1 / mobile-5: debug hooks, cheat flag, scores ---------------- */
  {
    // (a) clean standalone session: debug API is there, nothing is flagged
    const { ctx, page, errors } = await open(browser, { q: '' });
    let r = await page.evaluate(() => ({ game: typeof window.__game, cheated: PP.cheated, noPersist: PP.noPersist, build: PP.BUILD, debugTags: Array.from(document.querySelectorAll('script[src]')).filter(s => s.getAttribute('src').indexOf('js/debug/') === 0 && !s.parentNode.matches('head')).length }));
    check('code-1 web build: __game present, session clean', r.game === 'object' && r.cheated === false && r.noPersist === false && r.build === 'web', JSON.stringify(r));
    check('code-1 debug scripts are injected by the loader, not static tags in <body>', r.debugTags === 0 && !/js\/debug\//.test(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')), r.debugTags);
    // (b) a mutating __game call flips the session to cheated + no-persist on the spot
    await page.evaluate(() => { PP.save.data.buttons = 7; return PP.save.flush(); });
    r = await page.evaluate(async () => {
      const before = localStorage.getItem('pompomParade.v1');
      window.__game.give({ buttons: 99999 });
      await PP.save.flush();
      return { cheated: PP.cheated, noPersist: PP.noPersist, mem: PP.save.data.buttons, stored: JSON.parse(localStorage.getItem('pompomParade.v1')).buttons, same: before === localStorage.getItem('pompomParade.v1') };
    });
    check('code-1 give() marks the session cheated and stops persisting', r.cheated && r.noPersist && r.mem === 99999 && r.stored === 7 && r.same, JSON.stringify(r));
    allErrors.push(...errors); await ctx.close();
    // (c) every mutating method flags; read-only ones do not
    for (const m of ['setGod(true)', 'setSquad(9)', 'setSpeed(4)', 'setAutoplay(true)', 'forceWin()', 'resetSave()', 'skip(1)']) {
      const o = await open(browser, { q: '' });
      const f = await o.page.evaluate(async (m) => { PP.game.startLevel(1); const a = PP.cheated; window.__game.getState(); window.__game.getSave(); const b = PP.cheated; await eval('window.__game.' + m); return [a, b, PP.cheated, PP.noPersist]; }, m);
      check('code-1 __game.' + m + ' flags the session', f[0] === false && f[1] === false && f[2] === true && f[3] === true, f.join(','));
      await o.ctx.close();
    }
    // (d) any debug URL parameter flags the session from the start
    const d = await open(browser, { q: '?god=1' });
    check('code-1 debug URL parameter => cheated', await d.page.evaluate(() => PP.cheated && PP.noPersist && PP.debugSession), '');
    await d.ctx.close();
  }
  {
    // (e) Playables environment (mock SDK): URL params ignored, no __game, no debug code, cheated runs never score
    const { ctx, page, errors } = await open(browser, { q: '?endless=1&god=1&autoplay=1&speed=8&level=5&unlockall=1', init: MOCK });
    await sleep(400);
    let r = await page.evaluate(() => ({ game: typeof window.__game, debug: typeof PP.debug, bot: typeof PP.bot, params: Object.keys(PP.params).length, screen: PP.game.screen, cheated: PP.cheated, speed: PP.loop.speed,
      unlocked: PP.save.data.unlocked, scripts: Array.from(document.scripts).filter(s => /js\/debug\//.test(s.src)).length, isPlay: PP.platform.isPlayables, calls: __yt.calls.join(',') }));
    check('code-1 Playables: no window.__game, no debug scripts, URL params ignored', r.game === 'undefined' && r.debug === 'undefined' && r.bot === 'undefined' && r.params === 0 && r.screen === 'menu' && r.unlocked === 1 && r.scripts === 0 && r.speed === 1 && r.isPlay, JSON.stringify(r));
    check('code-1 Playables boot still calls firstFrameReady + gameReady', /firstFrameReady/.test(r.calls) && /gameReady/.test(r.calls), r.calls);
    // a legit Endless run (ending seen, no cheats) submits its score and stores the record
    r = await page.evaluate(async () => {
      PP.save.data.ended = 1;                        // Endless unlocked (set directly: no debug API in Playables)
      PP.game.startEndless();
      for (let i = 0; i < 600; i++) PP.run.step(1 / 60);
      const dist = Math.floor(PP.G.dist / 10);
      PP.squad.shields = 0; PP.squad.hurt(9999, 'enemy');
      for (let i = 0; i < 200 && !PP.G.over; i++) PP.run.step(1 / 60);
      return { cheated: PP.cheated, dist, scores: __yt.scores.map(s => s.value), best: PP.save.data.endlessBest };
    });
    check('code-1 clean Endless run: score sent once, record saved', !r.cheated && r.scores.length === 1 && r.scores[0] === r.best && r.best > 0, JSON.stringify(r));
    // the same run flagged as cheated: no score, no record
    r = await page.evaluate(async () => {
      const best0 = PP.save.data.endlessBest, n0 = __yt.scores.length;
      PP.game.startEndless();
      PP.G.god = true; PP.G.cheat = true;            // what a debug override would do
      for (let i = 0; i < 2400; i++) { if (PP.G.cards) PP.cards.choose(0); PP.run.step(1 / 60); }
      PP.G.god = false; PP.squad.shields = 0; PP.squad.hurt(9999, 'enemy');
      for (let i = 0; i < 200 && !PP.G.over; i++) { if (PP.G.cards) PP.cards.choose(0); PP.run.step(1 / 60); }
      const a = { score: PP.G.result.score, best: PP.save.data.endlessBest, best0, sent: __yt.scores.length - n0 };
      PP.cheated = true;                              // and the platform adapter refuses on its own as well
      a.direct = PP.platform.sendScore(999999); a.sent2 = __yt.scores.length - n0;
      return a;
    });
    check('code-1 cheated Endless run: no score sent, record untouched', r.score > r.best0 && r.best === r.best0 && r.sent === 0 && r.direct === false && r.sent2 === 0, JSON.stringify(r));
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-2: multi-touch ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?level=3&god=1&tutorial=0' });
    const r = await page.evaluate(async () => {
      const c = PP.R.canvas, out = {}, sleep = ms => new Promise(r => setTimeout(r, ms));
      const pe = (type, id, x, tgt) => (tgt || window).dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 400, bubbles: true, cancelable: true, isPrimary: id === 1 }));
      const snap = () => ({ x: Math.round(PP.squad.x), down: PP.input.down, id: PP.input.id });
      pe('pointerdown', 1, 180, c); await sleep(30);
      pe('pointerdown', 2, 300, c); await sleep(30);
      for (let i = 1; i <= 10; i++) { pe('pointermove', 1, 180 - i * 10); await sleep(16); }
      await sleep(120); out.a = snap();
      pe('pointerup', 2, 300); await sleep(30); out.b = snap();
      for (let i = 1; i <= 10; i++) { pe('pointermove', 1, 80 + i * 10); await sleep(16); }
      await sleep(120); out.c = snap();
      // the owner lifts while a second finger rests: the oldest remaining finger takes over without a jump
      pe('pointerdown', 3, 60, c); await sleep(30);
      pe('pointerup', 1, 180); await sleep(60); out.d = snap();
      for (let i = 1; i <= 5; i++) { pe('pointermove', 3, 60 + i * 10); await sleep(16); }
      await sleep(120); out.e = snap();
      pe('pointerup', 3, 110); await sleep(30); out.f = snap();
      return out;
    });
    check('code-2 first finger keeps steering while a second one lands', Math.abs(r.a.x - 80) <= 3 && r.a.id === 1, JSON.stringify(r.a));
    check('code-2 first finger still steers after the second lifts', r.b.down && Math.abs(r.c.x - 180) <= 3, JSON.stringify([r.b, r.c]));
    check('code-2 hand-over to the remaining finger, no jump', r.d.down && r.d.id === 3 && Math.abs(r.d.x - 180) <= 3 && Math.abs(r.e.x - 230) <= 3 && !r.f.down, JSON.stringify([r.d, r.e, r.f]));
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-3: the ending cannot be lost ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '' });
    await page.evaluate(() => { PP.save.data.unlocked = 30; PP.game.startLevel(30); });
    await sleep(300);
    let r = await page.evaluate(() => { PP.run.finish(true); const paused = PP.game.pause(); PP.game.autoPause('blur'); return { paused, screen: PP.game.screen, pending: PP.game.pending && PP.game.pending.name, ended: PP.save.data.ended }; });
    check('code-3 pause refused once the run is over', r.paused === false && r.screen === 'play' && r.pending === 'ending' && r.ended === 0, JSON.stringify(r));
    await sleep(1700);
    r = await page.evaluate(() => ({ screen: PP.game.screen, ended: PP.save.data.ended, s30: PP.save.data.levels[30].s }));
    check('code-3 ending plays, not yet marked as seen', r.screen === 'ending' && r.ended === 0 && r.s30 > 0, JSON.stringify(r));
    await page.click('[data-testid=btn-skip]');
    await sleep(300);
    r = await page.evaluate(() => ({ screen: PP.game.screen, ended: PP.save.data.ended }));
    check('code-3 ended is set when the ending is skipped / finished', r.screen === 'win' && r.ended === 1, JSON.stringify(r));
    await page.evaluate(() => PP.game.goto('settings', { from: 'menu' }));
    await sleep(200);
    check('code-3 Settings offers "Replay ending"', await page.evaluate(() => !!document.querySelector('[data-testid=set-replay-ending]')), '');
    await page.click('[data-testid=set-replay-ending]');
    await sleep(300);
    const s1 = await page.evaluate(() => PP.game.screen);
    await page.click('[data-testid=btn-skip]');
    await sleep(300);
    check('code-3 replay runs and returns to Settings', s1 === 'ending' && await page.evaluate(() => PP.game.screen === 'settings'), s1);
    // an interrupted ending (tab closed before the end) is shown again on the next clear
    r = await page.evaluate(() => { PP.save.data.ended = 0; PP.game.startLevel(30); PP.run.finish(true); return PP.game.pending && PP.game.pending.name; });
    check('code-3 ending not seen yet => shown again on the next L30 clear', r === 'ending', r);
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-4: beam vs off-screen boss ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?level=18&weapon=beam&wlv=3&god=1&tutorial=0&seed=5' });
    const r = await page.evaluate(() => {
      const g = window.__game, G = PP.G, BS = PP.boss, SQ = PP.squad;
      let guard = 0; while (G.state !== 'boss' && guard++ < 6000) g.skip(0.5);
      g.skip(4);
      const out = { st: BS.st };
      BS.inv = 0; let hp0 = BS.hp;
      for (let i = 0; i < 30; i++) { BS.st = 'away'; BS.tC = 5; BS.y = G.H + 100; BS.x = SQ.x; PP.run.step(1 / 60); }
      out.away = hp0 - BS.hp; hp0 = BS.hp;
      for (let i = 0; i < 30; i++) { BS.st = 'roll'; BS.y = G.sy + 60; BS.x = SQ.x; BS.hitCd = 9; PP.run.step(1 / 60); }   // below the squad line
      out.below = hp0 - BS.hp; hp0 = BS.hp;
      for (let i = 0; i < 30; i++) { BS.st = 'return'; BS.y = 100 + G.oy; BS.x = SQ.x; PP.run.step(1 / 60); }
      out.returning = hp0 - BS.hp; hp0 = BS.hp;
      // a real target in front of the squad is still hit, but an enemy standing between them is hit first
      PP.enemies.clear();
      const e = PP.enemies.spawn('jelly', SQ.x, G.sy - 80, false, 1); e.hp = e.maxHp = 1e7; const ehp = e.hp;
      for (let i = 0; i < 30; i++) { BS.st = 'roam'; BS.tA = 0; BS.tB = 0; BS.y = BS.HOME + G.oy; BS.x = SQ.x; e.y = G.sy - 80; PP.run.step(1 / 60); }
      out.front = hp0 - BS.hp; out.enemy = ehp - e.hp;
      return out;
    });
    check('code-4 beam ignores a boss that is away / below the squad / returning', r.away === 0 && r.below === 0 && r.returning === 0, JSON.stringify(r));
    check('code-4 beam hits the enemy in front first and still reaches a targetable boss', r.enemy > 0 && r.front > 0, JSON.stringify(r));
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-5: drag behind the card overlay ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?level=7&tutorial=0&god=1' });
    const r = await page.evaluate(async () => {
      const c = PP.R.canvas, out = {}, sleep = ms => new Promise(r => setTimeout(r, ms));
      const pe = (type, x, tgt) => (tgt || window).dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: 400, bubbles: true, cancelable: true, isPrimary: true }));
      await sleep(200);
      pe('pointerdown', 180, c); await sleep(50);
      PP.cards.offer(); await sleep(100);
      out.screen = PP.game.screen;
      for (let i = 1; i <= 12; i++) { pe('pointermove', 180 + i * 10); await sleep(16); }
      out.dx = Math.round(PP.input.dx); out.xBefore = Math.round(PP.squad.x);
      PP.game.chooseCard(0);
      await sleep(300); out.xAfter = Math.round(PP.squad.x);
      for (let i = 1; i <= 4; i++) { pe('pointermove', 300 + i * 10); await sleep(16); }     // the same finger keeps steering afterwards
      await sleep(150); out.xMoved = Math.round(PP.squad.x);
      pe('pointerup', 340);
      return out;
    });
    check('code-5 no drag is accumulated behind the cards and none is replayed', r.screen === 'cards' && r.dx === 0 && r.xAfter === r.xBefore, JSON.stringify(r));
    check('code-5 steering continues from the finger position after the choice', Math.abs(r.xMoved - (r.xBefore + 40)) <= 3, JSON.stringify(r));
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-6: key repeat ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?level=3&tutorial=0' });
    await sleep(300);
    const seq = [];
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true })));
    seq.push(await page.evaluate(() => PP.game.screen));
    for (let i = 0; i < 6; i++) { await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', repeat: true, bubbles: true }))); seq.push(await page.evaluate(() => PP.game.screen)); }
    for (const k of ['Escape', 'Enter']) for (let i = 0; i < 3; i++) await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, repeat: true, bubbles: true })), k);
    seq.push(await page.evaluate(() => PP.game.screen));
    check('code-6 a held P / Esc / Enter does not toggle pause', seq.every(s => s === 'pause'), seq.join('>'));
    await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'p', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true })); });
    check('code-6 a fresh press still resumes', await page.evaluate(() => PP.game.screen === 'play'), '');
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-7: a loss is final ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?level=6&tutorial=0&autoplay=1&seed=5&squad=40' });
    const r = await page.evaluate(() => {
      const g = window.__game, G = PP.G, BS = PP.boss, SQ = PP.squad, out = {};
      let guard = 0; while (G.state !== 'boss' && guard++ < 400) g.skip(1);
      g.skip(5);
      BS.inv = 0; BS.hp = Math.min(BS.hp, 5);
      out.shots = PP.shots.pool.n;
      SQ.shields = 0; SQ.hurt(9999, 'enemy');
      out.state = G.state;
      const e = PP.enemies.spawn('jelly', 180, 300 + G.oy, false, 1), ehp = e.hp; PP.enemies.damage(e, 1e6, 1); out.enemyDamaged = e.hp !== ehp || e.dead;
      for (let i = 0; i < 180 && !G.over; i++) PP.run.step(1 / 60);
      out.final = { state: G.state, win: G.result && G.result.win, endSquad: G.result && G.result.endSquad, stars: G.result && G.result.stars, bossHp: BS.hp };
      return out;
    });
    check('code-7 boss "killed" after the squad is gone stays a loss', r.shots > 0 && r.state === 'lost' && r.final.win === false && r.final.stars === 0 && r.final.bossHp > 0 && !r.enemyDamaged, JSON.stringify(r));
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- gameplay-8: identical on every screen height ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '?mute=1&tutorial=0', touch: false });
    const r = await page.evaluate(() => {
      const out = { diff: [], n: 0 };
      for (const L of [1, 6, 9, 12, 15, 18, 21, 24, 27, 30]) for (const m of ['bot', 'good', 'avg', 'lazy']) for (const seed of [4242, 77]) {
        const a = [600, 640, 700, 780].map(H => { const x = PP.humans.run(L, PP.econ.expectedProfile(L), m, seed, { H }); return JSON.stringify([x.win, x.stars, x.endSquad, x.time, x.popped, x.buttons, x.lost, x.progress]); });
        out.n++; if (!(a[0] === a[1] && a[1] === a[2] && a[2] === a[3])) out.diff.push('L' + L + ' ' + m + ' ' + seed);
      }
      const e = [600, 780].map(H => { const x = PP.humans.run('endless', PP.econ.expectedProfile(30), 'good', 1007, { H, maxTime: 240 }); return JSON.stringify([x.time, x.score, x.popped, x.lost]); });
      out.endless = e[0] === e[1];
      const f = H => { PP.run.start({ level: 5, H: H, seed: 1, tutorial: false, prof: PP.save.defaults() }); const v = [PP.G.screenSy, PP.G.viewY, PP.G.sy, PP.G.bot]; PP.run.stop(); return v; };
      out.frames = [f(600), f(640), f(780)];
      return out;
    });
    check('gameplay-8 design frame: on-screen squad y = min(H-110, 530), offset oy = sy-530, simulation always in the 640 design frame', JSON.stringify(r.frames) === '[[490,-40,530,640],[530,0,530,640],[530,0,530,640]]', JSON.stringify(r.frames));
    check('gameplay-8 same seed => identical run at H = 600 / 640 / 700 / 780 (' + r.n + ' runs x 4 heights)', r.diff.length === 0 && r.endless, r.diff.join(', '));
    // live resize keeps the world attached to the squad line
    const z = await page.evaluate(() => {
      PP.headless = true; PP.run.start({ level: 9, H: 640, seed: 3, tutorial: false, prof: PP.save.defaults(), autoplay: true });
      for (let i = 0; i < 900; i++) PP.run.step(1 / 60);
      const rel = () => PP.enemies.pool.items.slice(0, PP.enemies.pool.n).map(e => Math.round((e.y - PP.G.sy) * 100)).join(',') + '|' + PP.gates.rows.filter(r => r.on).map(r => Math.round((r.y - PP.G.sy) * 100)).join(',');
      const a = rel(); PP.run.reframe(600); const b = rel(), sy = PP.G.screenSy; PP.run.reframe(780); const c = rel();
      PP.run.stop(); PP.headless = false; return { same: a === b && b === c && a.length > 3, sy };
    });
    check('gameplay-8 live resize shifts the running world with the squad', z.same && z.sy === 490, JSON.stringify(z));
    /* ---------------- gameplay-2 / 6: curve + no free ride ---------------- */
    const cv = await page.evaluate(() => { const c = PP.balance.curve(), v = PP.validator.run(), B = PP.bal; return { bad: c.bad, ok: v.ok, err: v.errors.slice(0, 4), knots: B.G_KNOTS.length, adj: Object.keys(B.ADJ).every(k => B.ADJ[k] >= 0.92 && B.ADJ[k] <= 1.08), tune: Array.isArray(B.TUNE) && B.TUNE.every((x, i) => i === 0 || Math.abs(x - B.g(i) * (B.ADJ[i] || 1)) < 0.002),
      tele: [B.telegraph(6), B.telegraph(12), B.telegraph(13)], haz: [B.hazardCost(3, 6), B.hazardCost(3, 30), B.hazardCost(1, 30)], boss: [B.bossCost(0.25, 6), B.bossCost(0.25, 12), B.bossCost(0.25, 18)], rh: (() => { PP.squad.n = 9; PP.squad.recalc(); const a = PP.squad.Rh; PP.squad.n = 100; PP.squad.recalc(); return [a, PP.squad.Rh]; })() }; });
    check('gameplay-2 curve monotonic, validator OK (incl. centre hazards / 40 % trap rows / side waves)', cv.bad.length === 0 && cv.ok, cv.bad.concat(cv.err).join(' | '));
    check('gameplay-2 smooth g(L): <= 4 knots, corrections within +-8 %, no fitted per-level table', cv.knots <= 4 && cv.adj && cv.tune, JSON.stringify(cv.knots));
    check('gameplay-1 forgiveness numbers: telegraph 1.0/1.0/0.8 s, hazard cost max(listed, 5 % mid), boss cost x0.6/x0.75/x1, Rh = min(24, 8+2*sqrt(n))',
      JSON.stringify(cv.tele) === '[1,1,0.8]' && JSON.stringify(cv.haz) === '[3,3,3]' && JSON.stringify(cv.boss) === '[2,4,8]' && cv.rh[0] === 14 && Math.abs(cv.rh[1] - (8 + 2 * Math.sqrt(30))) < 1e-9, JSON.stringify([cv.tele, cv.haz, cv.boss, cv.rh]));
    /* ---------------- gameplay-7: Endless start ---------------- */
    const en = await page.evaluate(() => {
      PP.headless = true; const prof = PP.save.defaults(); prof.upg.buddy = 2;
      PP.run.start({ endless: true, prof, seed: 5, tutorial: false, autoplay: true });
      const o = { Le: PP.G.L, squad: PP.squad.n, mid: Math.round(PP.bal.mid(10)) };
      let tGate = -1; for (let i = 0; i < 600 && tGate < 0; i++) { PP.run.step(1 / 60); if (PP.G.rowsSpawned > 0) tGate = PP.G.tl; }
      o.tGate = Math.round(tGate * 10) / 10;
      const E = PP.endless; o.esc = [E.stingyShare(20), E.stingyShare(40), E.eliteShare(20), E.eliteShare(40), E.hazardGap(20), E.hazardGap(40), E.Le(150), E.BOSS_EVERY];
      o.boss = [E.bossHp(20, 1) / E.bossHp(20, 1), Math.round(100 * (0.5 + 0.5 * E.esc(30)))];
      PP.run.stop(); PP.headless = false; return o;
    });
    check('gameplay-7 Endless starts at Le 10 with mid(10) + buddies, first gate row at 4 s', en.Le === 10 && en.squad === en.mid + 2 && en.tGate === 4, JSON.stringify(en));
    check('gameplay-7 escalation: stingy 0->60 %, elites 0->35 %, hazards 15->7 s, Le = 10 + t/15, mini-boss every 90 s', JSON.stringify(en.esc) === JSON.stringify([0, 0.6, 0, 0.35, 15, 7, 20, 90]), JSON.stringify(en.esc));
    /* ---------------- gameplay-3: shared Toy Level + toy data ---------------- */
    const w = await page.evaluate(() => {
      const D = PP.data, o = {};
      o.eff = D.weapons.map(x => x.eff).join(','); o.cost = [2, 3, 4, 5].map(D.toyCost).join(',');
      const old = PP.save.parse(JSON.stringify({ v: 1, unlocked: 12, buttons: 50, weapons: { wand: { own: 1, lv: 2 }, shaker: { own: 1, lv: 4 }, gumball: { own: 0, lv: 5 } }, equipped: 'shaker' }));
      o.migrated = [old.toy, old.v, old.equipped, old.weapons.shaker.lv];
      o.upg = ['power', 'rate', 'buddy', 'shield', 'luck'].map(id => D.upgradeCost(id, 0) + '/' + D.upgradeCost(id, 3)).join(' ');
      // star: never homes on a boss, half damage to shells and crates; gumball x1.5 on bosses
      PP.headless = true; PP.run.start({ level: 18, prof: PP.save.defaults(), seed: 1, tutorial: false, weapon: 'star', squad: 10 });
      PP.G.state = 'boss'; PP.boss.start(3, 1e6, false); PP.boss.st = 'roam'; PP.boss.y = PP.boss.HOME + PP.G.oy; PP.boss.x = 250; PP.grid.build();
      const s = PP.shots.fire(3, 180, 400, 0, -420, 10, 5); s.turn = 4.5; s.tt = 0;
      for (let i = 0; i < 20; i++) { PP.boss.x = 250; PP.boss.tA = 0; PP.boss.tB = 0; PP.shots.update(1 / 60); }
      o.starStraight = Math.abs(s.vx) < 1e-6;
      PP.enemies.clear(); const c1 = PP.enemies.spawn('crate', 100, 300, false, 1), c2 = PP.enemies.spawn('crate', 250, 300, false, 1); c1.hp = c2.hp = 1e5; PP.grid.build();
      PP.boss.clear(); PP.shots.clear();
      PP.shots.fire(3, 100, 302, 0, -1, 10, 5); PP.shots.fire(0, 250, 302, 0, -1, 10, 5); PP.shots.update(1 / 60);
      o.starCrate = [1e5 - c1.hp, 1e5 - c2.hp];
      PP.enemies.clear(); PP.shots.clear(); PP.boss.start(1, 1e6, false); PP.boss.st = 'roam'; PP.boss.y = 200; PP.boss.x = 180; PP.grid.build();
      PP.shots.fire(2, 180, 205, 0, -1, 10, 5); PP.shots.update(1 / 60); o.gumBoss = 1e6 - PP.boss.hp;
      PP.run.stop(); PP.headless = false;
      return o;
    });
    check('gameplay-3 eff values + shared Toy Level costs', w.eff === '1,1.06,1.12,0.92,1.24,1.32,1.4' && w.cost === '150,270,486,875', w.eff + ' | ' + w.cost);
    check('gameplay-3 v1 save migrates: Toy Level = highest owned weapon level', JSON.stringify(w.migrated) === '[4,2,"shaker",null]' || (w.migrated[0] === 4 && w.migrated[1] === 2 && w.migrated[3] === undefined), JSON.stringify(w.migrated));
    check('gameplay-3 Star: no homing on bosses, x0.5 on crates; Gumball x1.5 on bosses', w.starStraight && w.starCrate[0] === 5 && w.starCrate[1] === 10 && w.gumBoss === 15, JSON.stringify(w));
    check('gameplay-5 cheaper first steps: Power 40x1.30^k, Quick Paws 50x1.35^k, Buddy 80x1.6^k, Shield / Lucky unchanged', w.upg === '40/88 50/123 80/328 300/4688 150/614', w.upg);
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- gameplay-4 / 5 / 9: economy, Helping Hand, result screens ---------------- */
  {
    const { ctx, page, errors } = await open(browser, { q: '' });
    // auto-equip on unlock + "Keep <old toy>"
    await page.evaluate(() => { PP.save.data.unlocked = 3; PP.game.startLevel(3); });
    await sleep(200);
    await page.evaluate(() => PP.run.finish(true));
    await sleep(1300);
    let r = await page.evaluate(() => ({ screen: PP.game.screen, eq: PP.save.data.equipped, own: PP.save.data.weapons.shaker.own, card: !!document.querySelector('[data-testid=new-weapon]'), state: (document.querySelector('[data-testid=new-weapon-state]') || {}).textContent, keep: (document.querySelector('[data-testid=btn-keep-weapon]') || {}).textContent }));
    check('gameplay-4 new toy is equipped on unlock, card says "Equipped!" and offers "Keep Bubble Wand"', r.screen === 'win' && r.eq === 'shaker' && r.own === 1 && /Equipped!/.test(r.state || '') && /Keep Bubble Wand/.test(r.keep || ''), JSON.stringify(r));
    await page.click('[data-testid=btn-keep-weapon]');
    r = await page.evaluate(() => ({ eq: PP.save.data.equipped, keep: document.querySelector('[data-testid=btn-keep-weapon]').textContent }));
    check('gameplay-4 "Keep" puts the old toy back (and can be undone)', r.eq === 'wand' && /Sprinkle Shaker/.test(r.keep), JSON.stringify(r));
    // fail reward + lose title + hint by cause
    r = await page.evaluate(() => {
      const out = {}, sv = PP.save.data, B = PP.bal;
      function fail(L, progress, lostBy, buttons) { const b0 = sv.buttons; const o = PP.econ.settle({ mode: 'level', level: L, win: false, stars: 0, progress, endSquad: 0, buttons: buttons || 0, popped: 0, lucky: 1, lostBy }); return { got: sv.buttons - b0, hint: o.hint, helpUp: o.helpUp, total: o.total }; }
      sv.buttons = 0; sv.fails = {}; sv.unlocked = 20;
      // nothing affordable (everything maxed), so the hint has to come from the cause of the losses
      const upg0 = JSON.stringify(sv.upg); PP.data.upgrades.forEach(u => { sv.upg[u.id] = u.max; }); sv.toy = 5;
      const f1 = fail(12, 0.5, { enemy: 1, hazard: 9, shot: 0, boss: 2, gate: 1 }, 10);
      const luck = PP.econ.luckMult();      // Lucky Buttons is maxed here: x1.5
      out.reward = [f1.got, Math.round(10 * luck) + Math.round(Math.floor(B.winBase(12) * (0.15 + 0.6 * 0.5)) * luck), luck];
      out.hints = [f1.hint];
      sv.buttons = 0; out.hints.push(fail(12, 0.5, { enemy: 1, hazard: 2, shot: 0, boss: 9, gate: 1 }).hint);      // 2nd fail: Helping Hand tier rises
      sv.buttons = 0; sv.fails = {}; out.hints.push(fail(13, 0.5, { enemy: 1, hazard: 2, shot: 0, boss: 9, gate: 1 }).hint);
      sv.buttons = 0; sv.fails = {}; out.hints.push(fail(14, 0.5, { enemy: 9, hazard: 2, shot: 3, boss: 0, gate: 1 }).hint);
      sv.buttons = 0; sv.fails = {}; out.hints.push(fail(15, 0.5, { enemy: 5, hazard: 2, shot: 0, boss: 0, gate: 4 }).hint);
      sv.upg = JSON.parse(upg0); sv.toy = 1; sv.buttons = 9999; sv.fails = {}; out.hints.push(fail(16, 0.5, { enemy: 9, hazard: 0, shot: 0, boss: 0, gate: 0 }).hint);
      // Helping Hand tiers by consecutive fails
      out.help = [1, 2, 3, 4, 5, 6, 9].map(f => { const h = PP.econ.helpingFor(27, f); return [h.tier, h.pom, h.shield, h.dmg].join('/'); }).join(' ');
      out.help6 = [2, 4].map(f => PP.econ.helpingFor(6, f).pom).join(',');
      sv.buttons = 0; sv.fails = {};
      return out;
    });
    check('gameplay-5 fail reward = (collected + floor(winBase x (0.15 + 0.6 x progress))) x luck', r.reward[0] === r.reward[1] && r.reward[0] === 15 + 62 && r.reward[2] === 1.5, JSON.stringify(r.reward));
    check('gameplay-9 hint by cause: hazard / glove / boss / enemy / gates / upgrade', JSON.stringify(r.hints) === '["hazard","glove","boss","enemy","gates","upgrade"]', JSON.stringify(r.hints));
    check('gameplay-5 Helping Hand tiers (L27: mid 46.6): >=2 +5, >=3 +shield, >=4 +9 and +15 %, >=6 +30 %', r.help === '0/0/0/1 1/5/0/1 2/5/1/1 3/9/1/1.15 3/9/1/1.15 4/9/1/1.3 4/9/1/1.3' && r.help6 === '3,3', r.help + ' | ' + r.help6);
    // lose screen titles by progress + pictogram hints + Go to boss after 3 fails
    for (const [prog, key, txt] of [[0.2, 'result.lose.far', 'Keep going!'], [0.6, 'result.lose.mid', 'Nice try!'], [0.9, 'result.lose.title', 'So close!']]) {
      const t = await page.evaluate(([prog]) => { PP.save.data.fails = {}; PP.save.data.buttons = 0; PP.game.startLevel(6); PP.G.progress = prog; PP.G.lostBy.boss = 5; PP.run.finish(false); return new Promise(res => setTimeout(() => { const e = document.querySelector('[data-testid=lose-title]'); res({ key: e && e.getAttribute('data-title'), txt: e && e.textContent, hint: !!document.querySelector('[data-testid=hint-boss]') }); }, 900)); }, [prog]);
      check('gameplay-9 lose title at ' + Math.round(prog * 100) + ' %: "' + txt + '"', t.key === key && t.txt === txt && t.hint, JSON.stringify(t));
    }
    r = await page.evaluate(() => { const o = { before: PP.econ.canSkipToBoss(6) }; PP.save.data.fails[6] = 3; o.after = PP.econ.canSkipToBoss(6); o.normal = (PP.save.data.fails[5] = 9, PP.econ.canSkipToBoss(5)); PP.game.goto('map', { open: 6 }); return o; });
    await sleep(300);
    check('gameplay-5 "Go to boss" is offered on boss levels after 3 fails only', r.before === false && r.after === true && r.normal === false && await page.evaluate(() => !!document.querySelector('[data-testid=card-toboss]') && document.querySelector('[data-testid=helping-hand]').getAttribute('data-tier') === '2'), JSON.stringify(r));
    await page.click('[data-testid=card-toboss]');
    await sleep(400);
    r = await page.evaluate(() => { const G = PP.G; for (let i = 0; i < 30; i++) PP.run.step(1 / 60); return { toBoss: G.toBoss, state: G.state, squad: PP.squad.n, want: Math.round(PP.bal.mid(6)) + PP.econ.helpingFor(6, 3).pom + 0, shields: PP.squad.shields, btn: G.buttonsRun, rows: G.rowsSpawned, prog: Math.round(G.progress * 100), cheated: PP.cheated }; });
    check('gameplay-5 Go to boss: fight starts at once with round(mid) + Helping Hand, no run-in', r.toBoss && /boss/.test(r.state) && r.squad === r.want && r.shields === 1 && r.btn === 0 && r.rows === 0 && r.prog === 60 && r.cheated === false, JSON.stringify(r));
    // Workshop: shared Toy Level card + role icons
    await page.evaluate(() => { PP.save.data.buttons = 500; PP.save.data.weapons.gumball.own = 1; PP.game.goto('shop', { tab: 'weapons' }); });
    await sleep(300);
    await page.click('[data-testid=buy-toy]');
    await sleep(200);
    r = await page.evaluate(() => ({ toy: PP.save.data.toy, btn: PP.save.data.buttons, roles: ['shaker', 'gumball'].map(id => { const e = document.querySelector('[data-testid=role-' + id + ']'); return e ? e.querySelectorAll('canvas').length : -1; }), perWeapon: !!document.querySelector('[data-testid=buy-weapon-wand]') }));
    check('gameplay-3 Workshop: one Toy Level purchase (150), role icons on the cards', r.toy === 2 && r.btn === 350 && r.roles[0] === 3 && r.roles[1] === 3 && !r.perWeapon, JSON.stringify(r));
    check('all of the above in a clean session (no debug hook used)', await page.evaluate(() => PP.cheated === false), '');
    allErrors.push(...errors); await ctx.close();
  }

  /* ---------------- code-1: Playables package ---------------- */
  {
    const dist = path.join(__dirname, '..', 'dist', 'playables');
    const { spawnSync } = require('child_process');
    const pk = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'package_playables.js'), '--no-sdk'], { encoding: 'utf8' });
    const flags = fs.existsSync(path.join(dist, 'js', 'build_flags.js')) ? fs.readFileSync(path.join(dist, 'js', 'build_flags.js'), 'utf8') : '';
    const has = p => fs.existsSync(path.join(dist, p));
    check('package_playables: dist/playables without js/debug, review, tests; BUILD = playables', pk.status === 0 && has('index.html') && has('js/main.js') && !has('js/debug') && !has('review') && !has('tests') && /BUILD = 'playables'/.test(flags), (pk.stdout || '').trim().split('\n').pop() + (pk.stderr || ''));
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', q => errs.push('request failed ' + q.url()));
    await page.goto('file://' + path.join(dist, 'index.html') + '?level=9&god=1&autoplay=1&unlockall=1');
    await page.waitForFunction(() => window.PP && window.PP.game && window.PP.game.isReady, null, { timeout: 20000 });
    await sleep(300);
    const r = await page.evaluate(() => ({ game: typeof window.__game, debug: typeof PP.debug, humans: typeof PP.humans, params: Object.keys(PP.params).length, screen: PP.game.screen, build: PP.BUILD, cheated: PP.cheated, unlocked: PP.save.data.unlocked }));
    check('packaged build boots to the menu: no __game, no debug, URL params ignored, no errors', r.game === 'undefined' && r.debug === 'undefined' && r.humans === 'undefined' && r.params === 0 && r.screen === 'menu' && r.build === 'playables' && !r.cheated && r.unlocked === 1 && errs.length === 0, JSON.stringify(r) + ' ' + errs.join('|'));
    await page.tap ? null : null;
    await page.click('[data-testid=btn-play]');
    await sleep(600);
    check('packaged build plays level 1', await page.evaluate(() => PP.game.screen === 'play' && PP.G.levelId === 1) && errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  check('zero page / console errors in all regression pages', allErrors.length === 0, allErrors.slice(0, 5).join(' || '));
  await browser.close();
  process.exit(check.done() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
