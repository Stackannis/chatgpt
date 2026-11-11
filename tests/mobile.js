/* Mobile / UX acceptance tests (fix plan R1: mobile-1, -2, -3, -4, -6, -7, -8).
 *  - layout audit: every DOM screen at landscape 640x360 / 844x390 / 915x412, portrait 320x568 / 360x640 and the
 *    "must stay clean" viewports (390x844, 412x915, 768x1024, desktop 1280x800), in EN and FR:
 *    tap targets >= 44 CSS px, text >= 11 CSS px, nothing outside the viewport, nothing clipped (overflow scrolls),
 *    no overlapping buttons;
 *  - quality scaler sequence (synthetic frame times), DPR cap above 1.2 MP;
 *  - hint hidden on pause / cards, overlay titles below the HUD, safe-area variables, side-bar HUD,
 *    projectile rim pixels, one-time "Best in portrait" toast.
 * Usage: node tests/mobile.js [filter]   (filter = substring of a viewport name, e.g. 640x360, or "unit")
 * Screenshots go to tests/screenshots/mobile_*.png. Exits non-zero on failure. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const FILTER = process.argv[2] || '';
const results = [];
function check(name, ok, info) {
  results.push({ name, ok: !!ok, info });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && info !== '' ? '  [' + info + ']' : ''));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = page => page.evaluate(() => window.__game.getState());
async function ready(page) { await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 20000 }); }

const VIEWPORTS = [
  { name: '640x360', w: 640, h: 360, dsf: 2, touch: true, kind: 'land' },
  { name: '844x390', w: 844, h: 390, dsf: 3, touch: true, kind: 'land' },
  { name: '915x412', w: 915, h: 412, dsf: 2.6, touch: true, kind: 'land' },
  { name: '320x568', w: 320, h: 568, dsf: 2, touch: true, kind: 'port' },
  { name: '360x640', w: 360, h: 640, dsf: 2, touch: true, kind: 'port' },
  { name: '390x844', w: 390, h: 844, dsf: 3, touch: true, kind: 'clean' },
  { name: '412x915', w: 412, h: 915, dsf: 2.6, touch: true, kind: 'clean' },
  { name: '768x1024', w: 768, h: 1024, dsf: 2, touch: true, kind: 'clean' },
  { name: '1280x800', w: 1280, h: 800, dsf: 1, touch: false, kind: 'clean' }
];
const SHOTS = { '640x360': ['en', 'fr'], '844x390': ['en'], '915x412': ['fr'], '320x568': ['fr'], '360x640': ['en'], '1280x800': ['en'], '768x1024': ['en'] };

async function open(browser, vp, query, errors, locale) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: vp.dsf, locale: locale || 'en-US' });
  const page = await ctx.newPage();
  if (errors) {
    page.on('pageerror', e => errors.push(vp.name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(vp.name + ' console: ' + m.text()); });
  }
  await page.goto(URL + (query || ''));
  await ready(page);
  return { ctx, page };
}

/* ---- in-page layout audit. sel = optional root selector (e.g. the modal); returns issue lists + minima ---- */
function auditInPage(sel) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const ui = document.getElementById('ui');
  const out = { small: [], font: [], outside: [], clipped: [], overlap: [], untouchable: [], scrolls: [], minTap: 1e9, minFont: 1e9, nTap: 0, nText: 0 };
  const label = e => (e.getAttribute('data-testid') || (typeof e.className === 'string' && e.className) || e.id || e.tagName) + (e.children.length === 0 && e.textContent ? ' "' + e.textContent.trim().slice(0, 18) + '"' : '');
  const rnd = r => '[' + [r.left, r.top, r.right, r.bottom].map(v => Math.round(v)).join(',') + ']';
  const shown = e => {
    if (!e.getClientRects().length) return false;
    for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false; }
    return true;
  };
  const scrollerOf = e => {
    for (let p = e.parentElement; p && p !== ui; p = p.parentElement) {
      const s = getComputedStyle(p);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return null;
  };
  let roots;
  if (sel) roots = Array.from(document.querySelectorAll(sel));
  else roots = Array.from(ui.children).filter(c => c.id !== 'dbg' && c.id !== 'sa-probe');
  const all = [];
  roots.forEach(r => { all.push(r); r.querySelectorAll('*').forEach(e => all.push(e)); });
  const buttons = [];
  for (const e of all) {
    const tag = e.tagName.toLowerCase();
    if (tag === 'svg' || tag === 'polyline' || tag === 'canvas') continue;
    if (!shown(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(e), sc = scrollerOf(e);
    // tap targets
    if (tag === 'button' || e.getAttribute('role') === 'button') {
      out.nTap++;
      const m = Math.min(r.width, r.height);
      if (m < out.minTap) out.minTap = m;
      if (m < 43.5) out.small.push(label(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      // in-flow content must stay inside the button (badges positioned on the corner are fine)
      for (const k of e.querySelectorAll('*')) {
        let abs = false;
        for (let p = k; p && p !== e; p = p.parentElement) if (getComputedStyle(p).position === 'absolute') { abs = true; break; }
        if (abs) continue;
        const kr = k.getBoundingClientRect();
        if (kr.width && (kr.left < r.left - 1.5 || kr.right > r.right + 1.5 || kr.top < r.top - 1.5 || kr.bottom > r.bottom + 1.5)) { out.clipped.push('content sticks out of button ' + label(e)); break; }
      }
      let cr = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      if (sc) { const q = sc.getBoundingClientRect(); cr = { left: Math.max(r.left, q.left), top: Math.max(r.top, q.top), right: Math.min(r.right, q.right), bottom: Math.min(r.bottom, q.bottom) }; }
      if (cr.right - cr.left > 2 && cr.bottom - cr.top > 2) buttons.push({ e, r: cr });
    }
    // text size
    let own = false;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { own = true; break; }
    if (own) {
      out.nText++;
      const fs = parseFloat(cs.fontSize);
      if (fs < out.minFont) out.minFont = fs;
      if (fs < 10.99) out.font.push(label(e) + ' ' + fs.toFixed(1) + 'px');
    }
    // inside the viewport (elements of a scrolling container may be scrolled out of view: that is the point)
    if (!sc) {
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.outside.push(label(e) + ' ' + rnd(r));
    } else {
      const q = sc.getBoundingClientRect();
      if (r.left < q.left - 1 || r.right > q.right + 1) out.outside.push('wider than its scroller: ' + label(e) + ' ' + rnd(r));
    }
    // clipped content: overflow must scroll, never be cut
    const oy = cs.overflowY, ox = cs.overflowX;
    if (e.scrollHeight > e.clientHeight + 1 && e.clientHeight > 0) {
      if (oy === 'auto' || oy === 'scroll') {
        out.scrolls.push(label(e).slice(0, 30) + ' ' + e.scrollHeight + '/' + e.clientHeight);
        if (!e.closest('.scroll')) out.untouchable.push('scroller without a .scroll ancestor: ' + label(e));
      } else if (oy === 'hidden' || oy === 'clip') out.clipped.push('vertical clip: ' + label(e) + ' ' + e.scrollHeight + '/' + e.clientHeight);
    }
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && (ox === 'hidden' || ox === 'clip' || ox === 'auto') && tag !== 'button' && !e.classList.contains('bar'))
      out.clipped.push('horizontal clip: ' + label(e) + ' ' + e.scrollWidth + '/' + e.clientWidth);
  }
  for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
    const a = buttons[i], b = buttons[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 2 && h > 2) out.overlap.push(label(a.e) + ' x ' + label(b.e) + ' ' + Math.round(w) + 'x' + Math.round(h));
  }
  if (out.minTap > 1e8) out.minTap = 0;
  if (out.minFont > 1e8) out.minFont = 0;
  return out;
}

async function cardsNow(page) {
  await page.evaluate(() => {
    const G = window.PP.G;
    window.__game.setAutoplay(true);
    for (let k = 0; k < 40000 && !G.cards && !G.over; k++) window.PP.run.step(1 / 60);
    window.__game.setAutoplay(false);
    if (G.cards && window.PP.game.screen !== 'cards') window.PP.game.onCards();
  });
}

/* walks through every screen at one viewport + language, auditing each */
async function auditViewport(browser, vp, lang, errors, summary) {
  const issues = [];
  let minTap = 1e9, minFont = 1e9, nScreens = 0;
  const shots = (SHOTS[vp.name] || []).indexOf(lang) >= 0;
  async function audit(page, name, sel) {
    await page.evaluate(() => window.PP.ui.toastHide());
    const a = await page.evaluate(auditInPage, sel || null);
    nScreens++;
    if (a.nTap && a.minTap < minTap) minTap = a.minTap;
    if (a.nText && a.minFont < minFont) minFont = a.minFont;
    for (const k of ['small', 'font', 'outside', 'clipped', 'overlap', 'untouchable']) if (a[k].length) issues.push(name + ' ' + k + ': ' + a[k].slice(0, 4).join(' | '));
    if (a.scrolls.length) summary.scrolls.push(vp.name + ' ' + lang + ' ' + name + ': ' + a.scrolls.join(', '));
    if (shots) await page.screenshot({ path: path.join(OUT, 'mobile_' + vp.name + '_' + lang + '_' + name + '.png') });
    return a;
  }
  const q = '&mute=1&nopause=1&lang=' + lang;

  // --- load 1: everything unlocked: menu, map, level card, workshop (both tabs), settings
  let o = await open(browser, vp, '?screen=menu&unlockall=1&buttons=1234' + q, errors);
  let page = o.page;
  await sleep(350);
  await audit(page, 'menu');
  await page.evaluate(() => window.__game.goto('map')); await sleep(300);
  await audit(page, 'map');
  await page.evaluate(() => { const n = document.querySelector('[data-testid=node-12]'); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(450);
  const hasCard = await page.evaluate(() => !!document.querySelector('[data-testid=level-card]'));
  if (!hasCard) issues.push('level card did not open');
  else await audit(page, 'levelcard', '.modal');
  // richest level card: boss level after 6 fails (best %, Helping Hand, "Go to boss"), all 7 toys owned
  await page.evaluate(() => {
    const sv = window.PP.save.data;
    sv.fails[12] = 6; sv.levels[12] = { s: 0, best: 0, pct: 57 };
    window.__game.goto('map', { open: 12 });
  });
  await sleep(450);
  if (!(await page.evaluate(() => !!document.querySelector('[data-testid=card-toboss]') && !!document.querySelector('.modal [data-testid=helping-hand]')))) issues.push('level card: no Go-to-boss / Helping Hand after 6 fails');
  await audit(page, 'levelcard_boss', '.modal');
  await page.evaluate(() => window.__game.goto('shop')); await sleep(300);
  await audit(page, 'shop_weapons');
  await page.evaluate(() => document.querySelector('[data-testid=tab-upgrades]').click()); await sleep(300);
  await audit(page, 'shop_upgrades');
  await page.evaluate(() => window.__game.goto('settings')); await sleep(300);
  await audit(page, 'settings');
  await o.ctx.close();

  // --- load 2: fresh profile: win (new weapon + new world), lose, play with the drag hint, pause, cards, ending
  o = await open(browser, vp, '?screen=win&level=6' + q, errors);
  page = o.page;
  await sleep(2700);
  await audit(page, 'win');
  await page.evaluate(() => { window.PP.game.lastView = null; window.__game.goto('lose'); }); await sleep(450);
  await audit(page, 'lose');
  await page.evaluate(() => window.__game.startLevel(1)); await sleep(500);
  await audit(page, 'play_hint');
  await page.evaluate(() => { window.__game.startLevel(8, { tutorial: false }); window.__game.skip(5); }); await sleep(300);
  await page.evaluate(() => window.__game.pause()); await sleep(350);
  await audit(page, 'pause');
  await page.evaluate(() => window.__game.resume()); await sleep(150);
  await cardsNow(page); await sleep(450);
  if ((await st(page)).screen !== 'cards') issues.push('cards did not open');
  else await audit(page, 'cards');
  await page.evaluate(() => { if (window.PP.G.cards) window.__game.chooseCard(0); window.__game.goto('ending'); }); await sleep(700);
  await audit(page, 'ending');
  await o.ctx.close();

  const tag = vp.name + ' ' + lang;
  check('layout ' + tag + ': ' + nScreens + ' screens, tap >= 44, text >= 11, in viewport, nothing clipped, no overlap', issues.length === 0,
    issues.length ? issues.slice(0, 6).join(' ;; ') : 'min tap ' + minTap.toFixed(1) + ' px, min font ' + minFont.toFixed(1) + ' px');
  summary.rows.push({ vp: vp.name, lang, minTap, minFont, issues: issues.length });
}

/* ---------------- unit-style checks ---------------- */
async function qualityChecks(browser, errors) {
  const o = await open(browser, { name: 'q', w: 360, h: 640, dsf: 2, touch: true }, '?mute=1', errors);
  const r = await o.page.evaluate(() => {
    const Q = window.PP.quality, out = {};
    window.PP.loop.running = false;                       // the real loop must not feed frames in between
    let t = 1000;
    const feed = (ms, n, work) => { const seq = []; for (let i = 0; i < n; i++) { t += ms; const l0 = Q.level; Q.frame(ms, work === undefined ? ms * 0.8 : work, t); if (Q.level !== l0) seq.push(i + 1 + ':' + Q.level); } return seq.join(' '); };
    out.window = Q.WINDOW;
    // A: very slow frames (40 ms avg > 30): two levels at once, twice
    Q.reset(0); out.A = feed(40, 180) + ' => ' + Q.level;
    // B: moderately slow (25 ms): one level per window, 4 down-steps inside 6 s
    Q.reset(0); out.B = feed(25, 300) + ' => ' + Q.level;
    // B2: exactly on the limits: 30 ms is a single step, 20 ms is no step
    Q.reset(0); out.B2 = feed(30, 60) + ' => ' + Q.level; Q.reset(0); out.B3 = feed(20, 120) + ' => ' + Q.level;
    // C: up-steps keep their rate: 5 s of good frames, at most 2 changes per minute overall
    Q.reset(0);
    const c = [];
    c.push(feed(25, 60));                 // down to 1 (change #1)
    c.push(feed(16.7, 300, 5));           // window refill (60) + just under 5 s: not yet
    c.push(feed(16.7, 80, 5));            // -> back to 0 (change #2)
    c.push(feed(25, 60));                 // down to 1 again (downs are not blocked by the 2-change rule)
    c.push(feed(16.7, 900, 5));           // 15 s of good frames: NO up-step, 3 changes in the last minute
    const lvlBlocked = Q.level;
    t += 61000;                           // a minute later the up-step is allowed again
    c.push(feed(16.7, 420, 5));
    out.C = c.join(' / ') + ' => ' + Q.level; out.Cblocked = lvlBlocked;
    // D: at most 4 downward changes per minute
    Q.reset(0);
    const d = [];
    d.push(feed(25, 120)); Q.set(0); d.push(feed(25, 120)); Q.set(0);     // 4 down-steps so far
    d.push(feed(25, 240));                                                // a 5th is refused
    const lvlCapped = Q.level;
    t += 61000; d.push(feed(25, 60));
    out.D = d.join(' / ') + ' => ' + Q.level; out.Dcapped = lvlCapped;
    // E: forced quality never moves
    Q.reset(0); Q.forced = true; out.E = feed(60, 200) + ' => ' + Q.level; Q.forced = false; Q.reset(0);
    return out;
  });
  check('quality: rolling window of 60 frames', r.window === 60, r.window);
  check('quality: avg > 30 ms steps down two levels at once', r.A === '60:2 120:4 => 4', r.A);
  check('quality: avg 20-30 ms steps down one level per window (4 within 6 s)', r.B === '60:1 120:2 180:3 240:4 => 4', r.B);
  check('quality: 30 ms is a single step, 20 ms no step', r.B2 === '60:1 => 1' && r.B3 === ' => 0', r.B2 + ' ; ' + r.B3);
  check('quality: up-step after 5 s of good frames, blocked after 2 changes per minute', r.Cblocked === 1 && / => 0$/.test(r.C) && r.C.indexOf('60:1 /  / ') === 0, r.C + ' (blocked at level ' + r.Cblocked + ')');
  check('quality: at most 4 downward changes per minute', r.Dcapped === 0 && / => 1$/.test(r.D), r.D + ' (capped at level ' + r.Dcapped + ')');
  check('quality: forced level is never changed', r.E === ' => 0', r.E);
  await o.ctx.close();

  // DPR cap above 1.2 MP
  for (const c of [
    { w: 412, h: 915, dsf: 2.6, capped: true }, { w: 390, h: 844, dsf: 3, capped: true },
    { w: 360, h: 640, dsf: 2, capped: false }, { w: 768, h: 1024, dsf: 2, capped: true }, { w: 1280, h: 800, dsf: 1, capped: false }
  ]) {
    const p = await open(browser, { name: 'dpr', w: c.w, h: c.h, dsf: c.dsf, touch: true }, '?mute=1', errors);
    const d = await p.page.evaluate(() => { const R = window.PP.R; return { w: R.canvas.width, h: R.canvas.height, dpr: R.dpr, rs: R.rs, scale: R.scale, win: window.devicePixelRatio }; });
    const mp = d.w * d.h / 1e6, uncapped = Math.min(d.scale * Math.min(d.win, 2), 3), mp0 = Math.round(360 * uncapped) * Math.round(d.h / d.rs * uncapped) / 1e6;
    const ok = c.capped ? (d.dpr === 1.5 && mp0 > 1.2 && Math.abs(d.rs - Math.min(d.scale * 1.5, 3)) < 1e-6) : (d.dpr === Math.min(d.win, 2) && mp <= 1.2);
    check('DPR cap ' + c.w + 'x' + c.h + '@' + c.dsf + (c.capped ? ': > 1.2 MP -> DPR 1.5' : ': <= 1.2 MP, untouched'), ok, 'uncapped ' + mp0.toFixed(2) + ' MP -> ' + d.w + 'x' + d.h + ' = ' + mp.toFixed(2) + ' MP, dpr ' + d.dpr);
    await p.ctx.close();
  }
}

async function hintAndTitleChecks(browser, errors) {
  for (const vp of [{ name: '360x640', w: 360, h: 640, dsf: 2, touch: true }, { name: '320x568', w: 320, h: 568, dsf: 2, touch: true }, { name: '640x360', w: 640, h: 360, dsf: 2, touch: true }]) {
    const o = await open(browser, vp, '?level=1&mute=1&nopause=1', errors);
    const page = o.page;
    await sleep(500);
    const hint = () => page.evaluate(() => { const e = document.getElementById('hint'), r = e.getBoundingClientRect(), c = document.getElementById('game').getBoundingClientRect(); return { on: e.classList.contains('on'), disp: getComputedStyle(e).display, top: r.top, left: r.left, right: r.right, cl: c.left, cr: c.right, text: e.textContent, scale: window.PP.R.scale, ctop: c.top }; });
    let h = await hint();
    check(vp.name + ' drag hint visible under the HUD, inside the column', h.on && h.disp === 'block' && h.top >= h.ctop + 100 * h.scale && h.left >= h.cl - 1 && h.right <= h.cr + 1, JSON.stringify(h));
    await page.evaluate(() => window.__game.pause()); await sleep(300);
    h = await hint();
    const title = await page.evaluate(() => { const t = document.querySelector('[data-testid=pause-title]').getBoundingClientRect(), R = window.PP.R; return { top: t.top, min: R.top + 110 * R.scale, bar: R.top + (62 + 9) * R.scale }; });
    check(vp.name + ' hint hidden while paused', h.disp === 'none', h.disp);
    check(vp.name + ' "Paused" title starts below the HUD (y >= 110 u)', title.top >= title.min - 0.5 && title.top > title.bar, 'title top ' + title.top.toFixed(1) + ' px, 110 u = ' + title.min.toFixed(1) + ' px, bar bottom ' + title.bar.toFixed(1));
    if (vp.name !== '640x360') await page.screenshot({ path: path.join(OUT, 'mobile_' + vp.name + '_pause_hint_hidden.png') });
    await page.evaluate(() => window.__game.resume()); await sleep(300);
    h = await hint();
    check(vp.name + ' hint restored after resume', h.on && h.disp === 'block' && h.text.length > 3, h.disp + ' "' + h.text + '"');
    // timed hint: the countdown is frozen while a screen is open
    await page.evaluate(() => { window.__game.startLevel(8, { tutorial: false }); window.PP.ui.hint('Timed test hint', 0.7); });
    await sleep(100);
    await page.evaluate(() => window.__game.pause()); await sleep(1100);
    await page.evaluate(() => window.__game.resume()); await sleep(150);
    h = await hint();
    const stillOn = h.on && h.disp === 'block';
    await sleep(900);
    h = await hint();
    check(vp.name + ' timed hint survives a pause and then expires', stillOn && !h.on, 'after resume ' + stillOn + ', later on=' + h.on);
    // cards
    await page.evaluate(() => window.PP.ui.hint('Card test hint', 30));
    await cardsNow(page); await sleep(400);
    const s = await st(page);
    h = await hint();
    const ct = await page.evaluate(() => { const e = document.querySelector('[data-testid=cards-title]'); if (!e) return null; const t = e.getBoundingClientRect(), R = window.PP.R; return { top: t.top, min: R.top + 110 * R.scale }; });
    check(vp.name + ' hint hidden while cards are shown', s.screen === 'cards' && h.disp === 'none', s.screen + ' ' + h.disp);
    check(vp.name + ' "Pick one!" title starts below the HUD (y >= 110 u)', !!ct && ct.top >= ct.min - 0.5, ct ? 'title top ' + ct.top.toFixed(1) + ' px, 110 u = ' + ct.min.toFixed(1) + ' px' : 'no title');
    await page.evaluate(() => window.__game.chooseCard(0)); await sleep(250);
    h = await hint();
    check(vp.name + ' hint back after choosing a card', h.on && h.disp === 'block', h.disp);
    await o.ctx.close();
  }
}

async function pauseIconChecks(browser, errors) {
  for (const vp of [{ name: '320x568', w: 320, h: 568, dsf: 2, touch: true }, { name: '360x640', w: 360, h: 640, dsf: 2, touch: true }, { name: '412x915', w: 412, h: 915, dsf: 2.6, touch: true }]) {
    const o = await open(browser, vp, '?level=3&mute=1&nopause=1&tutorial=0', errors);
    const page = o.page;
    await sleep(600);
    const d = await page.evaluate(() => {
      const R = window.PP.R, H = window.PP.hud, p = H.PAUSE, g = R.ctx;
      const css = H.pk * 50.8 * R.scale;
      const px = (lx, ly) => Array.from(g.getImageData(Math.round(lx * R.rs), Math.round(ly * R.rs), 1, 1).data.slice(0, 3));
      const rad = H.pk * 50.8 / 2;
      return { css, hitW: (p.w + 10) * R.scale, hitH: (p.h + 12) * R.scale, side: H.side, edge: px(H.px - rad + 1.3, H.py), centre: px(H.px, H.py), bar: px(H.px - rad * 0.3, H.py), cx: R.left + H.px * R.scale, cy: R.top + H.py * R.scale };
    });
    const dark = c => c[0] < 130 && c[1] < 120 && c[2] < 140, pink = c => c[0] > 220 && c[1] < 170 && c[2] > 130, white = c => c[0] > 225 && c[1] > 215 && c[2] > 220;
    check(vp.name + ' canvas pause icon drawn at >= 44 CSS px, hit box >= 44', !d.side && d.css >= 43.99 && d.hitW >= 44 && d.hitH >= 44, 'icon ' + d.css.toFixed(1) + ' px, hit ' + d.hitW.toFixed(1) + 'x' + d.hitH.toFixed(1));
    check(vp.name + ' pause icon pixels (outline at the 44 px edge, white disc, pink bar)', dark(d.edge) && white(d.centre) && pink(d.bar), JSON.stringify([d.edge, d.centre, d.bar]));
    await page.touchscreen.tap(d.cx + 0.4 * d.css, d.cy + 0.3 * d.css);
    await sleep(250);
    check(vp.name + ' tap near the icon edge pauses', (await st(page)).paused, '');
    await o.ctx.close();
  }
}

async function safeAreaChecks(browser, errors) {
  // portrait: top / bottom insets
  let o = await open(browser, { name: '390x844', w: 390, h: 844, dsf: 2, touch: true }, '?level=1&mute=1&nopause=1', errors);
  let page = o.page;
  await sleep(500);
  const snap = () => page.evaluate(() => {
    const R = window.PP.R, H = window.PP.hud, hint = document.getElementById('hint').getBoundingClientRect();
    const scr = document.querySelector('#ui .screen.on'), cs = scr ? getComputedStyle(scr) : null;
    const first = scr ? scr.querySelector('button') : null;
    return { hudTop: H.top, py: H.py, pauseY: H.PAUSE.y, hintTop: hint.top, scale: R.scale, inset: R.inset,
      padT: cs ? parseFloat(cs.paddingTop) : 0, padB: cs ? parseFloat(cs.paddingBottom) : 0, padL: cs ? parseFloat(cs.paddingLeft) : 0, padR: cs ? parseFloat(cs.paddingRight) : 0,
      firstTop: first ? first.getBoundingClientRect().top : 0,
      toastB: (() => { window.PP.ui.toast('safe area test', 5); const q = document.querySelector('[data-testid=toast]').getBoundingClientRect(); window.PP.ui.toastHide(); return window.innerHeight - q.bottom; })(),
      hit0: H.hitPause(30, 70), hit1: H.hitPause(30, 70 + 47 / R.scale) };
  });
  const setInsets = (t, r, b, l) => page.evaluate(v => {
    const s = document.documentElement.style;
    ['--sat', '--sar', '--sab', '--sal'].forEach((k, i) => { if (v[i] === null) s.removeProperty(k); else s.setProperty(k, v[i] + 'px'); });
    window.PP.R.resize(true);
  }, [t, r, b, l]);
  const a = await snap();
  await setInsets(47, 0, 34, 0); await sleep(250);
  const b = await snap();
  check('safe area: default insets are 0 here and the variables are read', a.hudTop === 0 && b.inset.t === 47 && b.inset.b === 34, JSON.stringify(a.inset) + ' -> ' + JSON.stringify(b.inset));
  check('safe area (portrait): canvas HUD row moves down by the top inset', Math.abs(b.hudTop - 47 / b.scale) < 0.01 && Math.abs(b.py - a.py - 47 / b.scale) < 0.01 && Math.abs(b.pauseY - a.pauseY - 47 / b.scale) < 0.01, 'HUD.top ' + a.hudTop + ' -> ' + b.hudTop.toFixed(2) + ' u, pause y ' + a.py.toFixed(1) + ' -> ' + b.py.toFixed(1));
  check('safe area (portrait): pause hit box follows the HUD', a.hit0 && !a.hit1 && b.hit1 && !b.hit0, [a.hit0, a.hit1, b.hit0, b.hit1].join(','));
  check('safe area (portrait): tutorial hint moves down', Math.abs(b.hintTop - a.hintTop - 47) < 0.6, a.hintTop.toFixed(1) + ' -> ' + b.hintTop.toFixed(1));
  await page.screenshot({ path: path.join(OUT, 'mobile_390x844_safe_area_play.png') });
  await setInsets(null, null, null, null);
  await page.evaluate(() => { window.__game.pause(); }); await sleep(250);
  const c = await snap();
  await setInsets(47, 0, 34, 0); await sleep(250);
  const d = await snap();
  check('safe area (portrait): screen padding + first button move by the insets', Math.abs(d.padT - c.padT - 47) < 0.6 && Math.abs(d.padB - c.padB - 34) < 0.6 && Math.abs(d.firstTop - c.firstTop - 47) < 12 && d.firstTop > c.firstTop + 20,
    'pad top ' + c.padT.toFixed(1) + ' -> ' + d.padT.toFixed(1) + ', pad bottom ' + c.padB.toFixed(1) + ' -> ' + d.padB.toFixed(1) + ', first button ' + c.firstTop.toFixed(1) + ' -> ' + d.firstTop.toFixed(1));
  check('safe area (portrait): toast lifted by the bottom inset', Math.abs(d.toastB - c.toastB - 34) < 0.6, c.toastB.toFixed(1) + ' -> ' + d.toastB.toFixed(1));
  await o.ctx.close();

  // landscape: left / right / bottom insets, side-bar HUD
  o = await open(browser, { name: '844x390', w: 844, h: 390, dsf: 2, touch: true }, '?screen=shop&unlockall=1&buttons=900&mute=1&nopause=1', errors);
  page = o.page;
  await sleep(400);
  await page.evaluate(() => window.PP.ui.toastHide());
  const e = await snap();
  await setInsets(0, 47, 21, 47); await sleep(250);
  const f = await snap();
  check('safe area (landscape): screens padded left / right / bottom', Math.abs(f.padL - e.padL - 47) < 0.6 && Math.abs(f.padR - e.padR - 47) < 0.6 && Math.abs(f.padB - e.padB - 21) < 0.6,
    'L ' + e.padL.toFixed(1) + ' -> ' + f.padL.toFixed(1) + ', R ' + e.padR.toFixed(1) + ' -> ' + f.padR.toFixed(1) + ', B ' + e.padB.toFixed(1) + ' -> ' + f.padB.toFixed(1));
  const au = await page.evaluate(auditInPage, null);
  const bad = ['small', 'font', 'outside', 'clipped', 'overlap'].filter(k => au[k].length).map(k => k + ': ' + au[k].slice(0, 3).join(' | '));
  check('safe area (landscape): workshop still clean with 47 px side insets', bad.length === 0, bad.join(' ;; '));
  await page.screenshot({ path: path.join(OUT, 'mobile_844x390_safe_area_shop.png') });
  await page.evaluate(() => { window.__game.startLevel(3, { tutorial: false }); }); await sleep(500);
  const sideTop = () => page.evaluate(() => { const b = document.querySelector('[data-testid=hud-pause]'); const r = b.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, vis: getComputedStyle(b.parentElement).display }; });
  const g = await sideTop();
  await setInsets(24, 47, 21, 47); await sleep(250);
  const h2 = await sideTop();
  check('safe area (landscape): side-bar HUD moves down with the top inset', g.vis === 'flex' && Math.abs(h2.top - g.top - 24) < 0.6, g.top.toFixed(1) + ' -> ' + h2.top.toFixed(1));
  await setInsets(null, null, null, null);
  await o.ctx.close();
}

async function sideHudChecks(browser, errors) {
  const o = await open(browser, { name: '640x360', w: 640, h: 360, dsf: 2, touch: true }, '?mute=1&nopause=1&tutorial=0', errors);
  const page = o.page;
  await page.evaluate(() => window.PP.ui.toastHide());
  const vis = () => page.evaluate(() => {
    const b = document.querySelector('[data-testid=hud-pause]'), c = document.querySelector('[data-testid=hud-buttons]'), d = document.querySelector('[data-testid=hud-distance]');
    const cv = document.getElementById('game').getBoundingClientRect();
    const box = e => { if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    return { pause: box(b), count: box(c), dist: box(d), countText: c ? c.textContent : '', distText: d ? d.textContent : '', cl: cv.left, cr: cv.right, side: window.PP.hud.side, hit: window.PP.hud.hitPause(30, 70), cw: cv.width };
  });
  let v = await vis();
  check('side HUD: not shown on the menu', v.cw < 300 && v.side && !v.pause && !v.count, 'column ' + v.cw + ' px');
  await page.evaluate(() => window.__game.startLevel(3)); await sleep(500);
  v = await vis();
  check('side HUD: pause button (>= 44 px) in the left bar, Buttons counter in the right bar, during play',
    !!v.pause && v.pause.w >= 44 && v.pause.h >= 44 && v.pause.r <= v.cl && v.pause.l >= 0 && !!v.count && v.count.l >= v.cr && v.count.r <= 640 && !v.dist,
    JSON.stringify({ pause: v.pause && [Math.round(v.pause.l), Math.round(v.pause.t), Math.round(v.pause.w), Math.round(v.pause.h)], count: v.count && [Math.round(v.count.l), Math.round(v.count.t)], column: [v.cl, v.cr] }));
  check('side HUD: canvas pause button is not hit-tested', v.hit === false, v.hit);
  const cpx = await page.evaluate(() => {
    const R = window.PP.R, H = window.PP.hud, g = R.ctx, rad = H.pk * 50.8 / 2;
    const px = (lx, ly) => Array.from(g.getImageData(Math.round(lx * R.rs), Math.round(ly * R.rs), 1, 1).data.slice(0, 3));
    return { edge: px(H.px - rad + 1.3, H.py), bar: px(H.px - rad * 0.3, H.py) };
  });
  check('side HUD: canvas pause icon is not drawn', !(cpx.edge[0] < 130 && cpx.edge[1] < 120 && cpx.edge[2] < 140) && !(cpx.bar[0] > 220 && cpx.bar[1] < 170 && cpx.bar[2] > 130 && cpx.bar[2] < 200), JSON.stringify(cpx));
  await page.touchscreen.tap(v.cl + 30 * 0.6, 70 * 0.6); await sleep(250);
  check('side HUD: tapping the old canvas spot does not pause', !(await st(page)).paused, '');
  await page.evaluate(() => { window.PP.G.buttonsRun = 37; }); await sleep(150);
  v = await vis();
  check('side HUD: counter follows G.buttonsRun', v.countText === '37', v.countText);
  const writes = await page.evaluate(() => new Promise(res => {
    const c = document.querySelector('[data-testid=hud-buttons]'); let n = 0;
    const mo = new MutationObserver(l => { n += l.length; }); mo.observe(c, { childList: true, characterData: true, subtree: true });
    setTimeout(() => { mo.disconnect(); res(n); }, 500);
  }));
  check('side HUD: no DOM writes while the value is unchanged (30 frames)', writes === 0, writes + ' mutations');
  await page.screenshot({ path: path.join(OUT, 'mobile_640x360_en_play_sidehud.png') });
  // informational (input.js is not part of the mobile package): does a drag that starts in a side bar steer?
  const cdp = await o.ctx.newCDPSession(page);
  const x0 = (await st(page)).squadX;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y: 250, id: 1 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60 + i * 5, y: 250, id: 1 }] }); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(200);
  const x1 = (await st(page)).squadX;
  console.log('INFO side-bar drag (50 px right, starting at x=60 in the left bar): squad x ' + x0 + ' -> ' + x1 + (x1 > x0 + 30 ? ' (steers)' : ' (does NOT steer yet)'));
  await page.tap('[data-testid=hud-pause]'); await sleep(300);
  let s = await st(page);
  v = await vis();
  check('side HUD: DOM pause button pauses and the side HUD hides', s.paused && s.screen === 'pause' && !v.pause && !v.count, s.screen);
  await page.tap('[data-testid=btn-resume]'); await sleep(300);
  s = await st(page); v = await vis();
  check('side HUD: back after resume', !s.paused && !!v.pause && !!v.count, s.screen);
  await page.evaluate(() => window.__game.startEndless()); await sleep(500);
  v = await vis();
  check('side HUD: Endless distance shown in the right bar', !!v.dist && v.dist.l >= v.cr && / m$/.test(v.distText), v.distText);
  await page.screenshot({ path: path.join(OUT, 'mobile_640x360_en_endless_sidehud.png') });
  // rotate to portrait: back to the canvas HUD
  await page.setViewportSize({ width: 360, height: 640 }); await sleep(450);
  v = await vis();
  check('side HUD: gone in portrait, canvas pause active again', !v.side && !v.pause && v.hit === true, 'column ' + v.cw + ' px');
  await page.touchscreen.tap(30, 70); await sleep(250);
  check('canvas pause works after rotating back', (await st(page)).paused, '');
  await o.ctx.close();
}

async function scrollChecks(browser, errors) {
  // repro of mobile-2: at 640x360 the vibration / sfx toggles of the pause panel were cropped
  const o = await open(browser, { name: '640x360', w: 640, h: 360, dsf: 2, touch: true }, '?level=8&mute=1&nopause=1&tutorial=0', errors);
  const page = o.page, cdp = await o.ctx.newCDPSession(page);
  await sleep(300);
  await page.evaluate(() => { window.PP.ui.toastHide(); window.__game.pause(); }); await sleep(300);
  const r = await page.evaluate(() => {
    const ids = ['btn-resume', 'btn-restart', 'btn-pause-map', 'pause-music', 'pause-sfx', 'pause-vib'], out = {};
    ids.forEach(id => { const e = document.querySelector('[data-testid=' + id + ']'); if (e) { const q = e.getBoundingClientRect(); out[id] = [Math.round(q.top), Math.round(q.bottom)]; } });
    const p = document.querySelector('[data-testid=pause-panel]'), cs = getComputedStyle(p), acts = p.children[0].getBoundingClientRect(), sets = p.children[1].getBoundingClientRect();
    return { out, vh: window.innerHeight, twoCols: sets.left >= acts.right - 1, overflowY: cs.overflowY, fits: p.scrollHeight <= p.clientHeight + 1 };
  });
  const allIn = Object.keys(r.out).every(k => r.out[k][0] >= 0 && r.out[k][1] <= r.vh);
  check('pause 640x360: two columns, every button and toggle inside the viewport', r.twoCols && allIn && Object.keys(r.out).length >= 5, JSON.stringify(r.out));
  check('pause panel is a scroll container (overflow-y auto)', r.overflowY === 'auto', r.overflowY + ', fits ' + r.fits);
  // force an overflow and scroll it with a real touch drag (the global touchmove rule must let it through)
  for (const sel of ['[data-testid=pause-panel]']) {
    await page.evaluate(s => { document.querySelector(s).style.maxHeight = '150px'; }, sel);
    const box = await page.evaluate(s => { const q = document.querySelector(s).getBoundingClientRect(); return { x: q.left + q.width * 0.75, y: q.top + q.height * 0.7, top: q.top + 20 }; }, sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y, id: 1 }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - i * 12, id: 1 }] }); await sleep(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300);
    const sc = await page.evaluate(s => { const p = document.querySelector(s); return { top: p.scrollTop, sh: p.scrollHeight, ch: p.clientHeight }; }, sel);
    check('overflowing pause panel scrolls with a touch drag', sc.sh > sc.ch && sc.top > 20, 'scrollTop ' + Math.round(sc.top) + ' of ' + (sc.sh - sc.ch));
  }
  await o.ctx.close();
  // same for the lose panel and the level card on a very small landscape viewport (568x320): overflow must scroll
  const p2 = await open(browser, { name: '568x320', w: 568, h: 320, dsf: 2, touch: true }, '?screen=map&unlockall=1&mute=1', errors);
  const cdp2 = await p2.ctx.newCDPSession(p2.page);
  await p2.page.evaluate(() => { window.PP.ui.toastHide(); const n = document.querySelector('[data-testid=node-12]'); n.scrollIntoView({ block: 'center' }); n.click(); });
  await sleep(450);
  await p2.page.evaluate(() => { document.querySelector('.modal .panel').style.maxHeight = '170px'; });
  const b2 = await p2.page.evaluate(() => { const q = document.querySelector('.modal .panel').getBoundingClientRect(); return { x: q.left + q.width * 0.5, y: q.top + q.height * 0.75 }; });
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b2.x, y: b2.y, id: 1 }] });
  for (let i = 1; i <= 8; i++) { await cdp2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b2.x, y: b2.y - i * 12, id: 1 }] }); await sleep(16); }
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  const sc2 = await p2.page.evaluate(() => { const p = document.querySelector('.modal .panel'); return { top: p.scrollTop, sh: p.scrollHeight, ch: p.clientHeight, card: !!document.querySelector('[data-testid=level-card]') }; });
  check('overflowing level card scrolls with a touch drag (and stays open)', sc2.card && sc2.sh > sc2.ch && sc2.top > 20, 'scrollTop ' + Math.round(sc2.top) + ' of ' + (sc2.sh - sc2.ch));
  await p2.ctx.close();
}

async function projectileChecks(browser, errors) {
  const o = await open(browser, { name: '360x640', w: 360, h: 640, dsf: 2, touch: true }, '?mute=1', errors);
  const r = await o.page.evaluate(() => {
    const S = window.PP.spr, out = {};
    const px = (name, x, y) => { const s = S[name], c = s.c, k = c.width / s.w, d = c.getContext('2d').getImageData(Math.floor((s.ox + x) * k), Math.floor((s.oy + y) * k), 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
    const edgeAlpha = name => { const s = S[name], c = s.c, g = c.getContext('2d'), w = c.width, h = c.height; return Math.max(g.getImageData(w >> 1, 0, 1, 1).data[3], g.getImageData(w >> 1, h - 1, 1, 1).data[3], g.getImageData(0, h >> 1, 1, 1).data[3], g.getImageData(w - 1, h >> 1, 1, 1).data[3]); };
    // [sprite, rim sample point (middle of the 1.5 u rim), a point 1 u inside the white edge]
    const P = { p_bubble: [7.15, 0, 5.8, 0], p_sprinkle_0: [3.95, 0, 2.6, 0], p_sprinkle_3: [3.95, 0, 2.6, 0], p_gumball: [10.35, 0, 8.8, 0], p_star: [0, -9.7, 0, -7.4], p_cookie: [11.35, 0, 9.8, 0], p_confetti: [8.35, 0, 6.9, 0] };
    Object.keys(P).forEach(n => { const p = P[n]; out[n] = { rim: px(n, p[0], p[1]), white: px(n, p[2], p[3]), edge: edgeAlpha(n), size: [S[n].w, S[n].h] }; });
    out.cookieBody = px('p_cookie', -8, -1); out.cookieIcing = px('p_cookie', 0.6, 0.9); out.bubbleBody = px('p_bubble', -4.6, 0);
    return out;
  });
  const near = (c, t, tol) => Math.abs(c[0] - t[0]) <= tol && Math.abs(c[1] - t[1]) <= tol && Math.abs(c[2] - t[2]) <= tol;
  const bad = [];
  ['p_bubble', 'p_sprinkle_0', 'p_sprinkle_3', 'p_gumball', 'p_star', 'p_cookie', 'p_confetti'].forEach(n => {
    const q = r[n];
    if (!(near(q.rim, [74, 59, 82], 14) && q.rim[3] >= 135 && q.rim[3] <= 170)) bad.push(n + ' rim ' + JSON.stringify(q.rim));
    if (!(near(q.white, [255, 255, 255], 6) && q.white[3] === 255)) bad.push(n + ' white edge ' + JSON.stringify(q.white));
    if (q.edge !== 0) bad.push(n + ' touches its canvas edge (alpha ' + q.edge + ')');
  });
  check('projectiles: 1.5 u rim #4A3B52 at 60% on bubble, sprinkles, gumball, star, cookie, confetti; no clipping', bad.length === 0, bad.length ? bad.join(' ; ') : 'bubble rim rgba ' + JSON.stringify(r.p_bubble.rim));
  check('projectiles: cookie is #8A4F1F with a light icing dot', near(r.cookieBody, [0x8A, 0x4F, 0x1F], 4) && r.cookieIcing[0] > 240 && r.cookieIcing[1] > 225, JSON.stringify(r.cookieBody) + ' icing ' + JSON.stringify(r.cookieIcing));
  check('projectiles: bubble is #2FC8F0', near(r.bubbleBody, [0x2F, 0xC8, 0xF0], 4), JSON.stringify(r.bubbleBody));
  await o.ctx.close();
  // close-ups on the W1 and W3 roads
  for (const c of [['w1_bubbles', '?level=1&mute=1&nopause=1&tutorial=0&autoplay=1'], ['w3_cookies', '?level=15&weapon=cookie&mute=1&nopause=1&tutorial=0&autoplay=1'], ['w3_confetti', '?level=14&weapon=confetti&mute=1&nopause=1&tutorial=0&autoplay=1'], ['w1_star', '?level=3&weapon=star&mute=1&nopause=1&tutorial=0&autoplay=1']]) {
    const p = await open(browser, { name: 'shot', w: 360, h: 640, dsf: 3, touch: true }, c[1], errors);
    await sleep(2600);
    await p.page.screenshot({ path: path.join(OUT, 'mobile_projectiles_' + c[0] + '.png'), clip: { x: 60, y: 250, width: 240, height: 330 } });
    await p.ctx.close();
  }
}

async function toastChecks(browser, errors) {
  // no debug parameters: the save is persistent (localStorage of this context)
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'en-US' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('toast pageerror: ' + e.message));
  await page.goto(URL); await ready(page); await sleep(400);
  const toast = () => page.evaluate(() => { const t = document.getElementById('toast'), b = t.querySelector('button'), r = b.getBoundingClientRect(); return { on: t.classList.contains('on'), text: b.firstChild.textContent, w: r.width, h: r.height, b: r.bottom, l: r.left, r: r.right, seen: !!window.PP.save.data.hints.portrait, cheated: !!window.PP.cheated }; });
  let t = await toast();
  check('portrait tip: shown the first time the game is seen in landscape', t.on && t.text === 'Best in portrait' && t.seen, JSON.stringify(t));
  check('portrait tip: is a tap target >= 44 px inside the viewport', t.h >= 44 && t.w >= 44 && t.b <= 390 && t.l >= 0 && t.r <= 844, Math.round(t.w) + 'x' + Math.round(t.h));
  await page.screenshot({ path: path.join(OUT, 'mobile_844x390_en_portrait_tip.png') });
  await page.tap('[data-testid=toast]'); await sleep(200);
  t = await toast();
  check('portrait tip: tapping dismisses it', !t.on, '');
  await page.evaluate(() => window.PP.save.flush && window.PP.save.flush()); await sleep(150);
  await page.reload(); await ready(page); await sleep(500);
  t = await toast();
  check('portrait tip: not shown again after a reload (remembered in save.hints)', !t.on && t.seen, JSON.stringify({ on: t.on, seen: t.seen }));
  await page.evaluate(() => window.__game.resetSave && window.__game.resetSave());
  await ctx.close();
  // portrait first, rotate later; French text
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'fr-FR' });
  const p2 = await c2.newPage();
  await p2.goto(URL); await ready(p2); await sleep(400);
  const t2 = () => p2.evaluate(() => { const t = document.getElementById('toast'); return { on: t.classList.contains('on'), text: t.querySelector('button').firstChild.textContent }; });
  let a = await t2();
  const before = a.on;
  await p2.setViewportSize({ width: 640, height: 360 }); await sleep(500);
  a = await t2();
  check('portrait tip: not in portrait, appears when the device is rotated (FR)', !before && a.on && a.text === 'Mieux en mode portrait', before + ' -> ' + JSON.stringify(a));
  await p2.setViewportSize({ width: 360, height: 640 }); await sleep(300);
  await p2.evaluate(() => window.PP.ui.toastHide());
  await p2.setViewportSize({ width: 640, height: 360 }); await sleep(500);
  a = await t2();
  check('portrait tip: only once', !a.on, JSON.stringify(a));
  await p2.evaluate(() => window.__game.resetSave && window.__game.resetSave());
  await c2.close();
}

async function i18nChecks(browser, errors) {
  const o = await open(browser, { name: 'i18n', w: 360, h: 640, dsf: 1, touch: true }, '?mute=1', errors);
  const r = await o.page.evaluate(() => { const D = window.PP.i18n.dicts || null; if (!D || !D.en || !D.fr) return null; const en = Object.keys(D.en), fr = Object.keys(D.fr); return { en: en.length, fr: fr.length, miss: en.filter(k => !(k in D.fr)).concat(fr.filter(k => !(k in D.en))) }; });
  if (r) check('i18n: EN and FR have the same keys', r.miss.length === 0, r.en + ' / ' + r.fr + ' ' + r.miss.slice(0, 5).join(','));
  await o.ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const summary = { rows: [], scrolls: [] };
  const unitOnly = FILTER === 'unit';
  if (!unitOnly) {
    for (const vp of VIEWPORTS) {
      if (FILTER && vp.name.indexOf(FILTER) < 0) continue;
      for (const lang of ['en', 'fr']) await auditViewport(browser, vp, lang, errors, summary);
    }
  }
  if (!FILTER || unitOnly) {
    await qualityChecks(browser, errors);
    await hintAndTitleChecks(browser, errors);
    await pauseIconChecks(browser, errors);
    await safeAreaChecks(browser, errors);
    await sideHudChecks(browser, errors);
    await scrollChecks(browser, errors);
    await projectileChecks(browser, errors);
    await toastChecks(browser, errors);
    await i18nChecks(browser, errors);
  }
  check('zero page errors / console errors', errors.length === 0, errors.slice(0, 6).join(' || '));
  if (summary.rows.length) {
    console.log('\nviewport   lang  min tap  min font  issues');
    summary.rows.forEach(r => console.log(r.vp.padEnd(10) + ' ' + r.lang + '    ' + r.minTap.toFixed(1).padStart(6) + '  ' + r.minFont.toFixed(1).padStart(7) + '  ' + r.issues));
    if (summary.scrolls.length) { console.log('\nscrolling containers with overflow (allowed: content scrolls instead of being clipped):'); summary.scrolls.forEach(s => console.log('  ' + s)); }
  }
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
