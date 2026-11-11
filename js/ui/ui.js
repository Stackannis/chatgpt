/* Pompom Parade - DOM overlay UI framework: screens, buttons, icons, hint line, toast.
 * Every interactive element gets a data-testid. All strings go through PP.t(). */
(function () {
  'use strict';
  var PP = window.PP;
  var UI = PP.ui = { root: null, screens: {}, els: {}, cur: null, curParams: null, hintEl: null, toastEl: null, hintTimer: 0, toastTimer: 0 };

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
    UI.toastEl = UI.h('div', null, UI.h('span', null, ''), { id: 'toast' });
    UI.root.appendChild(UI.hintEl); UI.root.appendChild(UI.toastEl);
  };
  /* def: {cls, render(el, params), onKey(key) -> bool, onHide()} */
  UI.register = function (name, def) { UI.screens[name] = def; };
  UI.show = function (name, params) {
    var def = UI.screens[name];
    if (!def) return;
    if (UI.cur && UI.cur !== name) UI.hide();
    var el = UI.els[name];
    if (!el) { el = UI.els[name] = UI.h('div', 'screen ' + (def.cls || ''), null, { 'data-screen': name }); UI.root.appendChild(el); }
    el.innerHTML = '';
    UI.cur = name; UI.curParams = params || null;
    def.render(el, params || {});
    el.classList.add('on');
    var f = el.querySelector('[data-autofocus]');
    if (f && PP.input && PP.input.keyboardUser) { try { f.focus(); } catch (e) { /* ignore */ } }
  };
  UI.hide = function () {
    if (!UI.cur) return;
    var el = UI.els[UI.cur], def = UI.screens[UI.cur];
    if (def && def.onHide) def.onHide();
    if (el) { el.classList.remove('on'); el.innerHTML = ''; }
    UI.cur = null; UI.curParams = null;
  };
  UI.refresh = function () { if (UI.cur) UI.show(UI.cur, UI.curParams); };
  UI.key = function (key) {
    var def = UI.cur && UI.screens[UI.cur];
    return !!(def && def.onKey && def.onKey(key));
  };
  UI.hint = function (text, secs) {
    clearTimeout(UI.hintTimer);
    if (!text) { UI.hintEl.classList.remove('on'); return; }
    UI.hintEl.firstChild.textContent = text;
    UI.hintEl.classList.remove('on'); void UI.hintEl.offsetWidth; UI.hintEl.classList.add('on');
    if (secs) UI.hintTimer = setTimeout(function () { UI.hintEl.classList.remove('on'); }, secs * 1000);
  };
  UI.toast = function (text, secs) {
    clearTimeout(UI.toastTimer);
    UI.toastEl.firstChild.textContent = text;
    UI.toastEl.classList.remove('on'); void UI.toastEl.offsetWidth; UI.toastEl.classList.add('on');
    UI.toastTimer = setTimeout(function () { UI.toastEl.classList.remove('on'); }, (secs || 2) * 1000);
  };
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
