/* Pompom Parade - win / lose (and Endless) result screens */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;

  function rline(icon, label, value, cls, testid) {
    var v = h('span', 'v', '0', testid ? { 'data-testid': testid } : null);
    var row = h('div', 'rline' + (cls ? ' ' + cls : ''), [h('span', 'l', [icon ? UI.icon(icon, 20) : null, h('span', null, label)]), h('span', 'cost', [UI.icon('i_button', 14), v])]);
    row._v = v; row._n = value;
    return row;
  }

  UI.register('win', {
    cls: 'soft',
    render: function (el, p) {
      var t = PP.t, res = p.res, out = p.out, L = res.level, anim = !p.again;
      var panel = h('div', 'panel res scroll', null, { 'data-testid': 'win-panel' });
      panel.appendChild(h('div', 'title dark', t('result.win.title')));
      var stars = UI.starsRow(res.stars, 46, true);
      panel.appendChild(stars);
      var ss = stars.querySelectorAll('.s');
      for (var i = 0; i < 3; i++) (function (i) {
        if (!anim) { ss[i].classList.add('show'); return; }
        setTimeout(function () { if (!ss[i].isConnected) return; ss[i].classList.add('show'); if (i < res.stars) PP.audio.sfx('star', i); }, 350 + i * 380);
      })(i);
      var lines = [
        rline('i_flag', t('result.level'), out.base, '', 'reward-level'),
        rline('i_bridge', t('result.bridge'), out.bridge, '', 'reward-bridge'),
        rline('k_button', t('result.collected'), out.collected, '', 'reward-collected'),
        rline('i_star', t('result.stars'), out.starBonus, '', 'reward-stars'),
        rline(null, t('result.total'), out.total, 'total', 'reward-total')
      ];
      lines.forEach(function (ln, k) {
        panel.appendChild(ln);
        if (anim) setTimeout(function () { UI.countUp(ln._v, ln._n, k === 4 ? 900 : 500, '+'); }, 300 + k * 220); else ln._v.textContent = '+' + PP.i18n.fmt(ln._n);
      });
      if (out.newWeapon) panel.appendChild(h('div', 'newcard', [UI.icon('i_w_' + out.newWeapon, 40), h('div', null, [h('div', null, t('result.newweapon')), h('div', 'muted', t('weapon.' + out.newWeapon))])], { 'data-testid': 'new-weapon' }));
      if (out.newWorld) panel.appendChild(h('div', 'newcard', [UI.icon('i_flag', 34), h('div', null, [h('div', null, t('result.newworld')), h('div', 'muted', t('world.' + out.newWorld))])], { 'data-testid': 'new-world' }));
      var nw = PP.data.nextWeaponAfter(L);
      if (nw) {
        var prev = 0; PP.data.weapons.forEach(function (w) { if (w.unlock <= L && w.unlock > prev) prev = w.unlock; });
        var f = (L - prev) / (nw.unlock - prev);
        panel.appendChild(h('div', 'strip', [h('span', null, t('result.nextweapon', { n: nw.unlock })), h('span', 'bar', h('i', null, null, { style: 'width:' + Math.round(f * 100) + '%' })), h('span', 'sil', UI.icon('i_w_' + nw.id, 24))], { 'data-testid': 'weapon-strip' }));
      }
      var row = h('div', 'btnrow');
      var next;
      if (L < 30) next = UI.btn(t('result.next'), 'btn-next', function () { PP.game.startLevel(L + 1); }, 'primary');
      else next = UI.btn(t('menu.map'), 'btn-next', function () { PP.game.goto('map'); }, 'primary');
      next.setAttribute('data-autofocus', '1');
      panel.appendChild(next);
      row.appendChild(UI.btn(t('result.replay'), 'btn-replay', function () { PP.game.startLevel(L); }, 'small'));
      var shop = UI.btn(t('menu.shop'), 'btn-result-shop', function () { PP.game.goto('shop', { from: 'win' }); }, 'small gold');
      if (PP.econ.canAffordAny()) shop.appendChild(h('span', 'bang', '!'));
      row.appendChild(shop);
      row.appendChild(UI.btn(t('menu.map'), 'btn-result-map', function () { PP.game.goto('map'); }, 'small blue'));
      panel.appendChild(row);
      el.appendChild(panel);
    },
    onKey: function (key) { if (key === 'esc') { PP.game.goto('map'); return true; } return false; }
  });

  UI.register('lose', {
    cls: 'soft',
    render: function (el, p) {
      var t = PP.t, res = p.res, out = p.out, L = res.level, endless = res.mode === 'endless', anim = !p.again;
      var panel = h('div', 'panel res', null, { 'data-testid': 'lose-panel' });
      panel.appendChild(h('div', 'title dark', endless ? t('result.endless.title') : t('result.lose.title')));
      panel.appendChild(h('div', null, UI.icon('pom_pip_0', 54), { style: 'margin:calc(var(--u)*2) 0' }));
      if (endless) {
        panel.appendChild(h('div', 'pill', t('result.distance', { n: PP.i18n.fmt(res.score) }), { 'data-testid': 'endless-score', style: 'font-size:calc(var(--u)*18)' }));
        panel.appendChild(h('div', 'muted', (out.endlessBest ? '★ ' : '') + t('menu.best', { n: PP.i18n.fmt(out.best) }), { 'data-testid': 'endless-best' }));
      } else {
        var pct = Math.floor(res.progress * 100);
        panel.appendChild(h('div', 'strip', [h('span', null, pct + '%'), h('span', 'bar', h('i', null, null, { style: 'width:' + pct + '%;background:#FF8FB6' })), h('span', null, t('map.best', { n: Math.max(out.best, pct) }))], { 'data-testid': 'lose-progress' }));
      }
      var ln = rline('k_button', t('result.kept'), out.total, 'total', 'reward-total');
      panel.appendChild(ln);
      if (anim) setTimeout(function () { UI.countUp(ln._v, ln._n, 800, '+'); }, 300); else ln._v.textContent = '+' + PP.i18n.fmt(ln._n);
      // one hint icon: upgrade arrow if something is affordable, otherwise "pick blue gates"
      if (PP.econ.canAffordAny()) {
        var hb = h('button', 'hintico', [UI.icon('i_arrowup', 30), UI.icon('i_up_power', 30), h('span', null, t('result.hint.upgrade'))], { 'data-testid': 'hint-upgrade', type: 'button' });
        hb.addEventListener('click', function () { PP.game.goto('shop', { from: 'lose', tab: 'upgrades' }); });
        panel.appendChild(hb);
      } else if (!endless) panel.appendChild(h('div', 'hintico', [UI.icon('i_gateblue', 40), h('span', null, t('result.hint.gates'))], { 'data-testid': 'hint-gates' }));
      if (!endless && PP.econ.helping(L) > 0) panel.appendChild(h('div', 'pill', [UI.icon('i_glove', 26), h('span', null, '+' + PP.econ.helping(L)), UI.icon('pom_bunny_0', 18)], { 'data-testid': 'helping-hand' }));
      var retry = UI.btn(t('result.retry'), 'btn-retry', function () { if (endless) PP.game.startEndless(); else PP.game.startLevel(L); }, 'primary');
      retry.setAttribute('data-autofocus', '1');
      panel.appendChild(retry);
      var row = h('div', 'btnrow');
      var shop = UI.btn(t('menu.shop'), 'btn-result-shop', function () { PP.game.goto('shop', { from: 'lose' }); }, 'small gold');
      row.appendChild(shop);
      row.appendChild(UI.btn(t('menu.map'), 'btn-result-map', function () { PP.game.goto(endless ? 'menu' : 'map'); }, 'small blue'));
      panel.appendChild(row);
      el.appendChild(panel);
    },
    onKey: function (key) { if (key === 'esc') { PP.game.goto('map'); return true; } return false; }
  });
})();
