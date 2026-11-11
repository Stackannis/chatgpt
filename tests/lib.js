/* Shared helpers for the Playwright test scripts. */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

/* open a page on the game and wait until it is ready. opts: {q, viewport, touch, dpr, init, locale} */
async function open(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 360, height: 640 }, hasTouch: opts.touch !== false, isMobile: opts.touch !== false,
    deviceScaleFactor: opts.dpr || 1, locale: opts.locale || 'en-US'
  });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL + (opts.q || ''));
  await page.waitForFunction(opts.readyFn || (() => window.PP && window.PP.game && window.PP.game.isReady), null, { timeout: 20000 });
  return { ctx, page, errors };
}

/* run `fn(arg)` (serialisable, executed in the page) for every item of `items` on `conc` parallel pages */
async function pool(items, fn, conc, q) {
  const browser = await chromium.launch();
  const out = new Array(items.length);
  let next = 0;
  const errors = [];
  await Promise.all(Array.from({ length: Math.min(conc || 4, items.length) }, async () => {
    const { ctx, page, errors: e } = await open(browser, { q: q || '?mute=1&tutorial=0', touch: false });
    while (next < items.length) { const i = next++; out[i] = await page.evaluate(fn, items[i]); }
    errors.push(...e);
    await ctx.close();
  }));
  await browser.close();
  return { out, errors };
}

function makeChecker() {
  const results = [];
  function check(name, ok, info) { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && info !== '' ? '  [' + info + ']' : '')); }
  check.results = results;
  check.done = function () { const f = results.filter(r => !r.ok); console.log('\n' + (results.length - f.length) + '/' + results.length + ' checks passed'); return f.length; };
  return check;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { chromium, URL, open, pool, makeChecker, sleep };
