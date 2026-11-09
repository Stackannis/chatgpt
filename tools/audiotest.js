#!/usr/bin/env node
// Audio check: API safety before init(), live scheduling, switching, and offline renders (peak / RMS) of every song and sfx.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?manual');
  await page.waitForFunction('window.G && G.audio');
  const res = await page.evaluate(async () => {
    const A = G.audio, out = [], wait = ms => new Promise(r => setTimeout(r, ms));
    // 1. nothing throws before init()
    A.sfx('jump'); A.music('level'); A.stopMusic(); A.setMuted(true); A.setMuted(false); A.music('title');
    out.push('before init: ok, ready=' + A.ready);
    // 2. live: init, pending music starts, switching, stop
    A.init(); A.init();
    await wait(400);
    out.push('after init: ready=' + A.ready);
    let created = 0; const AN = AudioNode.prototype.connect; AudioNode.prototype.connect = function () { created++; return AN.apply(this, arguments); };
    await wait(1500); const c1 = created;
    A.music('level'); await wait(1500); const c2 = created;
    A.sfxNames.forEach(n => A.sfx(n));
    A.music('clear'); await wait(600); A.music('gameover'); await wait(600);
    A.stopMusic(); const c3 = created; await wait(700); const c4 = created;
    AudioNode.prototype.connect = AN;
    out.push('node connections: title 1.5s=' + c1 + ', level 1.5s=' + (c2 - c1) + ', after stopMusic (0.7s)=' + (c4 - c3) + ' (must be 0)');
    // 3. offline renders
    for (const [n, sec] of [['level', 80], ['title', 24], ['clear', 6], ['gameover', 7]]) {
      const r = await A._render(n, sec);
      const raw = await A._render(n, Math.min(sec, 30), null, true);
      out.push(n + ': ' + JSON.stringify(r) + ' rawPeak(no limiter)=' + raw.peak);
    }
    const s = await A._render(null, 0.7 * A.sfxNames.length + 1, A.sfxNames);
    out.push('all sfx: ' + JSON.stringify(s));
    for (const n of A.sfxNames) { const r = await A._render(null, 1.2, [n]); out.push('  sfx ' + n.padEnd(10) + ' peak=' + r.peak + ' rms=' + r.rms); }
    const mix = await A._render('level', 12, ['gem', 'jump', 'stomp', 'gem', 'spring', 'bigcoin', 'hurt', 'gem', 'jump', 'checkpoint']);
    out.push('level + sfx together: ' + JSON.stringify(mix));
    return out;
  });
  console.log(res.join('\n'));
  if (errs.length) console.log('PROBLEMS:\n' + errs.join('\n'));
  await browser.close();
  process.exitCode = errs.length ? 1 : 0;
})();
