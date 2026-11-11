/* Pompom Parade - main menu */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;
  UI.register('menu', {
    cls: '',
    render: function (el) {
      var sv = PP.save.data, t = PP.t, next = Math.min(30, sv.unlocked), endless = PP.save.endlessUnlocked();
      el.appendChild(h('div', 'menu-logo', UI.icon('logo', 300)));
      var box = h('div', 'menu-btns');
      var play = UI.btn(null, 'btn-play', function () { PP.game.startLevel(next); }, 'primary wide');
      play.appendChild(h('span', null, [h('span', null, t('menu.play')), h('span', 'sub', t('menu.level', { n: next }))]));
      play.setAttribute('data-autofocus', '1');
      box.appendChild(play);
      var r1 = h('div', 'menu-row');
      r1.appendChild(UI.btn(t('menu.map'), 'btn-map', function () { PP.game.goto('map'); }, 'blue', 'i_flag', 20));
      var shop = UI.btn(t('menu.shop'), 'btn-shop', function () { PP.game.goto('shop'); }, 'gold', 'i_up_power', 22);
      if (PP.econ.canAffordAny()) shop.appendChild(h('span', 'bang', '!', { 'data-testid': 'shop-badge' }));
      r1.appendChild(shop);
      box.appendChild(r1);
      var r2 = h('div', 'menu-row');
      var eb = UI.btn(endless ? t('menu.endless') : t('menu.endless') + ' · L30', 'btn-endless', function () {
        if (PP.save.endlessUnlocked()) PP.game.startEndless(); else UI.toast(t('menu.endless.locked'));
      }, 'small' + (endless ? '' : ' off'), endless ? 'i_bridge' : 'i_lock', 20);
      r2.appendChild(eb);
      r2.appendChild(UI.btn(t('menu.settings'), 'btn-settings', function () { PP.game.goto('settings', { from: 'menu' }); }, 'small'));
      box.appendChild(r2);
      if (endless && sv.endlessBest > 0) box.appendChild(h('div', 'pill', t('menu.best', { n: PP.i18n.fmt(sv.endlessBest) }), { 'data-testid': 'endless-best' }));
      el.appendChild(box);
    }
  });
})();
