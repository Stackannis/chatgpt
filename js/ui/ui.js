/* Pompom Parade - DOM overlay UI framework: screens, buttons, icons, hint line, toast.
 * Every interactive element gets a data-testid. All strings go through PP.t(). */
(function () {
  'use strict';
  var PP = window.PP;
  var UI = PP.ui = {
    root: null, screens: {}, els: {}, cur: null, curParams: null, hintEl: null, toastEl: null, hintTimer: 0, toastTimer: 0,
    hintEnd: 0, hintLeft: 0,          // auto-hide deadline of the hint / time left while a screen suspends it (ms)
    side: null                        // side-bar HUD elements (landscape), created on first use
  };
  function now() { return Date.now(); }

  /* element helper: h('div', 'cls', 'text' | [children], {attr}) */
  UI.h = function (tag, cls, content, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (content !== undefined && content !== null) {
      if (typeof content === 'string' || typeof content === 'number') e.textContent = String(content);
      else if (content.length !== undefined && !content.nodeType) { for (var i = 0; i < content.length; i++) if (content[i]) e.appendChild(content[i]); }
      else e.appendChild(content);
    }
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) {
      if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    return e;
  };
  UI.icon = function (name, size) { return PP.sprites.toCanvas(name, size || 24); };
  UI.btn = function (label, testid, onClick, cls, iconName, iconSize) {
    var b = UI.h('button', 'btn' + (cls ? ' ' + cls : ''), null, { 'data-testid': testid, type: 'button' });
    if (iconName) b.appendChild(UI.icon(iconName, iconSize || 22));
    if (label !== null && label !== undefined && label !== '') b.appendChild(UI.h('span', null, label));
    b.addEventListener('click', function (e) {
      if (b.disabled) return;
      PP.audio.unlock(); PP.audio.sfx('click');
      onClick(e, b);
    });
    return b;
  };
  UI.buttonsPill = function (testid) {
    var p = UI.h('span', 'pill', [UI.icon('i_button', 16), UI.h('span', null, PP.i18n.fmt(PP.save.data.buttons))], { 'data-testid': testid || 'buttons-count' });
    return p;
  };
  UI.starsRow = function (n, size, animated) {
    var r = UI.h('div', 'stars3' + (animated ? '' : ' static'));
    for (var i = 0; i < 3; i++) r.appendChild(UI.h('span', 's', UI.icon(i < n ? 'i_star' : 'i_star_off', size || 30)));
    return r;
  };

  UI.init = function () {
    UI.root = document.getElementById('ui');
    UI.hintEl = UI.h('div', null, UI.h('span', null, ''), { id: 'hint' });
    // the toast is a real <button> (tap to dismiss): steering input ignores pointerdowns on buttons
    var tb = UI.h('button', null, UI.h('span', null, ''), { 'data-testid': 'toast', type: 'button' });
    tb.addEventListener('click', function () { UI.toastHide(); });
    UI.toastEl = UI.h('div', null, tb, { id: 'toast' });
    UI.root.appendChild(UI.hintEl); UI.root.appendChild(UI.toastEl);
  };

  /* ---- side-bar HUD (landscape, column narrower than 300 CSS px): DOM pause button + counters.
   * Created lazily (needs the sprites); shown through the classes .sidehud (layout) + .inplay (PP.hud.sync). ---- */
  UI.sideHud = function () {
    if (UI.side) return UI.side;
    var pause = UI.h('button', 'hudbtn', UI.icon('h_pause', 48), { 'data-testid': 'hud-pause', type: 'button', 'aria-label': PP.t('pause.title') });
    pause.addEventListener('click', function () { PP.audio.unlock(); PP.audio.sfx('click'); PP.game.pause(); });
    var count = UI.h('span', null, '0'), dist = UI.h('span', null, '0');
    var cp = UI.h('span', 'pill hudpill', [UI.icon('k_button', 22), count], { 'data-testid': 'hud-buttons' });
    var dp = UI.h('span', 'pill hudpill', [UI.icon('i_flag', 20), dist], { 'data-testid': 'hud-distance', style: 'display:none' });
    var l = UI.h('div', null, pause, { id: 'side-l' }), r = UI.h('div', null, [cp, dp], { id: 'side-r' });
    UI.root.appendChild(l); UI.root.appendChild(r);
    UI.side = { left: l, right: r, pause: pause, count: count, dist: dist, distPill: dp };
    return UI.side;
  };

  /* called by the renderer after every layout change (resize / rotation / safe-area change) */
  UI.onLayout = function () { UI.portraitTip(); };
  /* one-time, dismissible "Best in portrait" toast, the first time the game is seen in landscape */
  UI.portraitTip = function () {
    if (!PP.R.land || !PP.game || !PP.game.isReady || !PP.tut || !PP.save.data || PP.tut.seen('portrait')) return;
    PP.tut.done('portrait');
    UI.toast(PP.t('toast.portrait'), 7, true);
  };
  /* def: {cls, render(el, params), onKey(key) -> bool, onHide()} */
  UI.register = function (name, def) { UI.screens[name] = def; };
  UI.show = function (name, params) {
    var def = UI.screens[name];
    if (!def) return;
    if (UI.cur && UI.cur !== name) UI.hide();
    var el = UI.els[name];
    // every screen carries .scroll: panels / modals inside may scroll by touch (see the touchmove rule in input.js)
    if (!el) { el = UI.els[name] = UI.h('div', 'screen scroll ' + (def.cls || ''), null, { 'data-screen': name }); UI.root.appendChild(el); }
    el.innerHTML = '';
    UI.cur = name; UI.curParams = params || null;
    def.render(el, params || {});
    el.classList.add('on');
    el.scrollTop = 0;
    UI.overlay(true);
    var f = el.querySelector('[data-autofocus]');
    if (f && PP.input && PP.input.keyboardUser) { try { f.focus(); } catch (e) { /* ignore */ } }
    UI.portraitTip();
  };
  UI.hide = function () {
    if (!UI.cur) return;
    var el = UI.els[UI.cur], def = UI.screens[UI.cur];
    if (def && def.onHide) def.onHide();
    if (el) { el.classList.remove('on'); el.innerHTML = ''; }
    UI.cur = null; UI.curParams = null;
    UI.overlay(false);
  };
  /* a DOM screen opened / closed: while one is open the tutorial hint and the side-bar HUD are hidden (CSS
   * .has-screen) and the hint's auto-hide timer is frozen; when play resumes the hint comes back for the time left */
  UI.overlay = function (on) {
    if (!UI.root) return;
    UI.root.classList.toggle('has-screen', on);
    if (on) {
      if (PP.hud && PP.hud.hideDom) PP.hud.hideDom();
      if (UI.hintTimer) { clearTimeout(UI.hintTimer); UI.hintTimer = 0; UI.hintLeft = Math.max(300, UI.hintEnd - now()); }
    } else if (UI.hintLeft > 0) {
      var left = UI.hintLeft; UI.hintLeft = 0;
      if (UI.hintEl.classList.contains('on')) hintTimeout(left);
    }
  };
  function hintTimeout(ms) {
    clearTimeout(UI.hintTimer);
    UI.hintEnd = now() + ms;
    UI.hintTimer = setTimeout(function () { UI.hintTimer = 0; UI.hintEl.classList.remove('on'); }, ms);
  }
  UI.refresh = function () { if (UI.cur) UI.show(UI.cur, UI.curParams); };
  UI.key = function (key) {
    var def = UI.cur && UI.screens[UI.cur];
    return !!(def && def.onKey && def.onKey(key));
  };
  UI.hint = function (text, secs) {
    clearTimeout(UI.hintTimer); UI.hintTimer = 0; UI.hintLeft = 0;
    if (!text) { UI.hintEl.classList.remove('on'); return; }
    UI.hintEl.firstChild.textContent = text;
    UI.hintEl.classList.remove('on'); void UI.hintEl.offsetWidth; UI.hintEl.classList.add('on');
    if (secs) {
      if (UI.cur) UI.hintLeft = secs * 1000;      // shown behind an open screen: the countdown starts when it closes
      else hintTimeout(secs * 1000);
    }
  };
  /* toast(text, secs, sticky): tap to dismiss; sticky toasts show a small close mark */
  UI.toast = function (text, secs, sticky) {
    clearTimeout(UI.toastTimer);
    var b = UI.toastEl.firstChild;
    b.firstChild.textContent = text;
    if (b.lastChild !== b.firstChild) b.removeChild(b.lastChild);
    if (sticky) b.appendChild(UI.h('span', 'x', '✕'));
    UI.toastEl.classList.remove('on'); void UI.toastEl.offsetWidth; UI.toastEl.classList.add('on');
    UI.toastTimer = setTimeout(UI.toastHide, (secs || 2) * 1000);
  };
  UI.toastHide = function () { clearTimeout(UI.toastTimer); UI.toastTimer = 0; UI.toastEl.classList.remove('on'); };
  /* animated count-up on an element */
  UI.countUp = function (el, to, ms, prefix) {
    var t0 = Date.now(), from = 0;
    function tick() {
      if (!el.isConnected) return;
      var k = Math.min(1, (Date.now() - t0) / (ms || 800));
      el.textContent = (prefix || '') + PP.i18n.fmt(from + (to - from) * k);
      if (k < 1) setTimeout(tick, 33);
    }
    tick();
  };
})();
