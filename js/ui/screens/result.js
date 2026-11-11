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
      if (out.newWeapon) {
        // the new toy is equipped right away; "Keep <old toy>" puts the previous one back
        var sv = PP.save.data, eqLine = h('div', 'muted', t('weapon.' + out.newWeapon) + ' · ' + t('result.equipped'), { 'data-testid': 'new-weapon-state' });
        var card = h('div', 'newcard', [UI.icon('i_w_' + out.newWeapon, 40), h('div', 'grow', [h('div', null, t('result.newweapon')), eqLine])], { 'data-testid': 'new-weapon' });
        if (out.prevWeapon && out.prevWeapon !== out.newWeapon && sv.weapons[out.prevWeapon] && sv.weapons[out.prevWeapon].own) {
          var keep = UI.btn(null, 'btn-keep-weapon', function () {
            var back = sv.equipped === out.newWeapon;
            PP.econ.equip(back ? out.prevWeapon : out.newWeapon);
            eqLine.textContent = t('weapon.' + sv.equipped) + ' · ' + t('result.equipped');
            keepLbl.textContent = t('result.keep', { w: t('weapon.' + (back ? out.newWeapon : out.prevWeapon)) });
            var ico = UI.icon('i_w_' + (back ? out.newWeapon : out.prevWeapon), 22);
            keep.replaceChild(ico, keepIco); keepIco = ico;
          }, 'small keep');
          var keepIco = UI.icon('i_w_' + out.prevWeapon, 22), keepLbl = h('span', null, t('result.keep', { w: t('weapon.' + out.prevWeapon) }));
          keep.appendChild(keepIco); keep.appendChild(keepLbl);
          card.appendChild(keep);
        }
        panel.appendChild(card);
      }
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
      var panel = h('div', 'panel res scroll', null, { 'data-testid': 'lose-panel' });
      // the title follows the progress: < 40 % "Keep going!", 40-80 % "Nice try!", > 80 % "So close!"
      var titleKey = res.progress > 0.8 ? 'result.lose.title' : (res.progress >= 0.4 ? 'result.lose.mid' : 'result.lose.far');
      panel.appendChild(h('div', 'title dark', endless ? t('result.endless.title') : t(titleKey), { 'data-testid': 'lose-title', 'data-title': endless ? 'endless' : titleKey }));
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
      // one hint, by cause: Helping Hand just grew > an upgrade is affordable > the biggest source of lost pompoms
      var hint = out.hint || (PP.econ.canAffordAny() ? 'upgrade' : 'gates');
      if (hint === 'upgrade' && !PP.econ.canAffordAny()) hint = PP.econ.loseHint(res, false);    // spent since (back from the Workshop)
      var help = endless ? null : UI.helpPill(PP.econ.helping(L), 26);
      if (hint === 'glove' && help) {
        panel.appendChild(h('div', 'hintico col', [help, h('span', null, t('result.hint.glove'))], { 'data-testid': 'hint-glove' }));
        help = null;
      } else if (hint === 'upgrade') {
        var hb = h('button', 'hintico', [UI.icon('i_arrowup', 30), UI.icon('i_up_power', 30), h('span', null, t('result.hint.upgrade'))], { 'data-testid': 'hint-upgrade', type: 'button' });
        hb.addEventListener('click', function () { PP.game.goto('shop', { from: 'lose', tab: 'upgrades' }); });
        panel.appendChild(hb);
      } else if (hint === 'boss') panel.appendChild(h('div', 'hintico', [h('span', 'pict', [UI.icon('z_lane', 30), UI.icon('h_arrow', 22)]), h('span', null, t('result.hint.boss'))], { 'data-testid': 'hint-boss' }));
      else if (hint === 'hazard') panel.appendChild(h('div', 'hintico', [h('span', 'pict', [UI.icon('z_roller', 32), UI.icon('h_arrow', 22)]), h('span', null, t('result.hint.hazard'))], { 'data-testid': 'hint-hazard' }));
      else if (hint === 'enemy') panel.appendChild(h('div', 'hintico', [h('span', 'pict', [UI.icon('p_bubble', 16), UI.icon('e_jelly', 32)]), h('span', null, t('result.hint.enemy'))], { 'data-testid': 'hint-enemy' }));
      else panel.appendChild(h('div', 'hintico', [UI.icon('i_gateblue', 40), h('span', null, t('result.hint.gates'))], { 'data-testid': 'hint-gates' }));
      if (help) panel.appendChild(help);
      var retry = UI.btn(t('result.retry'), 'btn-retry', function () { if (endless) PP.game.startEndless(); else PP.game.startLevel(L); }, 'primary');
      retry.setAttribute('data-autofocus', '1');
      panel.appendChild(retry);
      if (!endless && PP.econ.canSkipToBoss(L)) panel.appendChild(UI.btn(t('map.toboss'), 'btn-toboss', function () { PP.game.startLevel(L, { toBoss: true }); }, 'small gold'));
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
