/* Pompom Parade - Workshop: toys (one shared Toy Level 1-5, role icons, equip) and permanent upgrades. Buttons only. */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;
  var tab = 'weapons', back = 'menu', scrollPos = 0;

  function pips(n, max) {
    var p = h('div', 'pips');
    for (var i = 0; i < max; i++) p.appendChild(h('span', 'pip' + (i < n ? ' on' : '')));
    return p;
  }
  function costBtn(cost, testid, onBuy) {
    var sv = PP.save.data, can = cost >= 0 && sv.buttons >= cost;
    var b = UI.btn(null, testid, function (e, btn) { onBuy(btn); }, 'small gold' + (can ? '' : ' off'));
    if (cost < 0) { b.appendChild(h('span', null, PP.t('shop.max'))); b.disabled = true; }
    else { b.appendChild(h('span', 'cost', [UI.icon('i_button', 15), h('span', null, PP.i18n.fmt(cost))])); if (!can) b.disabled = true; }
    return b;
  }
  function weaponItem(w, rerender) {
    var t = PP.t, sv = PP.save.data, st = sv.weapons[w.id];
    if (!st.own) {
      return h('div', 'item locked', [
        h('span', 'sil', UI.icon('i_w_' + w.id, 46)),
        h('div', 'info', [h('div', 'name', '???'), h('div', 'desc', t('shop.locked', { n: w.unlock }))])
      ], { 'data-testid': 'weapon-' + w.id });
    }
    var info = h('div', 'info'), lv = sv.toy || 1;
    info.appendChild(h('div', 'name', t('weapon.' + w.id)));
    // role: what this toy is best against (icons)
    if (w.role && w.role.length) {
      var role = h('div', 'role' + (w.roleCol ? ' stack' : ''), null, { 'data-testid': 'role-' + w.id, title: t('shop.best') });
      role.appendChild(h('span', 'rl', t('shop.best')));
      w.role.forEach(function (name) { role.appendChild(UI.icon(name, 20)); });
      info.appendChild(role);
    }
    var bars = h('div', 'bars'), labels = ['shop.stat.power', 'shop.stat.speed', 'shop.stat.special'];
    for (var i = 0; i < 3; i++) {
      var v = w.bars[i] * 20 * (i === 0 ? (0.8 + 0.05 * (lv - 1)) : 1);
      bars.appendChild(h('span', null, t(labels[i])));
      bars.appendChild(h('span', 'bar', h('i', null, null, { style: 'width:' + Math.min(100, v) + '%' })));
    }
    info.appendChild(bars);
    info.appendChild(h('div', 'desc', (lv >= 3 ? '✔ ' : 'Lv3: ') + t('weapon.' + w.id + '.p3') + ' · ' + (lv >= 5 ? '✔ ' : 'Lv5: ') + t('weapon.' + w.id + '.p5')));
    var acts = h('div', 'acts');
    var eq = sv.equipped === w.id;
    var eb = UI.btn(eq ? t('shop.equipped') : t('shop.equip'), 'equip-' + w.id, function () { PP.econ.equip(w.id); rerender(); }, 'small' + (eq ? ' off' : ' blue'));
    if (eq) eb.disabled = true;
    acts.appendChild(eb);
    return h('div', 'item', [UI.icon('i_w_' + w.id, 46), info, acts], { 'data-testid': 'weapon-' + w.id });
  }
  /* the shared Toy Level (1-5): one upgrade for every toy, Lv3 / Lv5 perks apply to the equipped one */
  function toyItem(rerender) {
    var t = PP.t, sv = PP.save.data, lv = sv.toy || 1;
    var info = h('div', 'info');
    info.appendChild(h('div', 'name', t('shop.toy') + '  ' + t('shop.lv', { n: lv })));
    info.appendChild(pips(lv, 5));
    info.appendChild(h('div', 'desc', t('shop.toy.desc') + '  +' + ((lv - 1) * 10) + '%' + (lv < 5 ? ' → +' + (lv * 10) + '%' : '')));
    var acts = h('div', 'acts');
    acts.appendChild(costBtn(PP.econ.toyCost(), 'buy-toy', function () {
      if (PP.econ.buyToy()) { PP.audio.sfx('buy'); rerender('toy-level'); }
    }));
    return h('div', 'item toy', [UI.icon('i_w_' + sv.equipped, 46), info, acts], { 'data-testid': 'toy-level' });
  }
  function upgradeItem(u, rerender) {
    var t = PP.t, sv = PP.save.data, lv = sv.upg[u.id];
    var info = h('div', 'info');
    info.appendChild(h('div', 'name', t('upg.' + u.id) + '  ' + lv + '/' + u.max));
    if (u.max <= 6) info.appendChild(pips(lv, u.max));
    else info.appendChild(h('div', 'bar', h('i', null, null, { style: 'width:' + (lv / u.max * 100) + '%;background:#FFD23F' }), { style: 'margin:calc(var(--u)*4) 0' }));
    var cur = '+' + (lv * u.per) + u.unit, nxt = lv < u.max ? ' → +' + ((lv + 1) * u.per) + u.unit : '';
    info.appendChild(h('div', 'desc', t('upg.' + u.id + '.desc') + '  ' + cur + nxt));
    var acts = h('div', 'acts');
    acts.appendChild(costBtn(PP.econ.upgradeCost(u.id), 'buy-upg-' + u.id, function () {
      if (PP.econ.buyUpgrade(u.id)) { PP.audio.sfx('buy'); rerender('upg-' + u.id); }
    }));
    return h('div', 'item', [UI.icon(u.icon, 44), info, acts], { 'data-testid': 'upg-' + u.id });
  }

  UI.register('shop', {
    cls: 'solid',
    render: function (el, params) {
      var t = PP.t;
      if (params.from) back = params.from;
      if (params.tab) tab = params.tab;
      var head = h('div', 'head');
      head.appendChild(UI.btn('←', 'btn-back', function () { PP.game.goto(back === 'shop' ? 'menu' : back); }, 'small round'));
      head.appendChild(h('div', 'title dark', t('shop.title')));
      head.appendChild(UI.buttonsPill());
      el.appendChild(head);
      var tabs = h('div', 'tabs');
      var list = h('div', 'scroll', null, { 'data-testid': 'shop-list' });
      function rerender(sparkleId) {
        scrollPos = list.scrollTop;
        UI.show('shop', { from: back, tab: tab, sparkle: sparkleId });
      }
      tabs.appendChild(UI.btn(t('shop.weapons'), 'tab-weapons', function () { tab = 'weapons'; scrollPos = 0; rerender(); }, 'small tab' + (tab === 'weapons' ? ' sel' : '')));
      tabs.appendChild(UI.btn(t('shop.upgrades'), 'tab-upgrades', function () { tab = 'upgrades'; scrollPos = 0; rerender(); }, 'small tab' + (tab === 'upgrades' ? ' sel' : '')));
      el.appendChild(tabs);
      if (tab === 'weapons') { list.appendChild(toyItem(rerender)); PP.data.weapons.forEach(function (w) { list.appendChild(weaponItem(w, rerender)); }); }
      else PP.data.upgrades.forEach(function (u) { list.appendChild(upgradeItem(u, rerender)); });
      el.appendChild(list);
      setTimeout(function () { if (list.isConnected) list.scrollTop = scrollPos; }, 0);
      if (params.sparkle) { var s = list.querySelector('[data-testid="' + params.sparkle + '"]'); if (s) s.classList.add('sparkle'); }
    },
    onKey: function (key) { if (key === 'esc') { PP.game.goto(back === 'shop' ? 'menu' : back); return true; } return false; }
  });
})();
