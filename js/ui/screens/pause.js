/* Pompom Parade - pause screen and Sparkle Meter card choice */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;

  UI.register('pause', {
    cls: 'dim',
    render: function (el) {
      var t = PP.t, s = PP.save.data.settings;
      function set(k, v) { s[k] = v; PP.save.write(); UI.applySettings(); UI.show('pause'); }
      el.appendChild(h('div', 'title', t('pause.title')));
      var p = h('div', 'panel col', null, { style: 'max-width:calc(var(--u)*300);margin-top:calc(var(--u)*20)' });
      var r = UI.btn(t('pause.resume'), 'btn-resume', function () { PP.game.resume(); }, 'primary wide');
      r.setAttribute('data-autofocus', '1');
      p.appendChild(r);
      p.appendChild(UI.btn(t('pause.restart'), 'btn-restart', function () { PP.game.restart(); }, 'wide'));
      p.appendChild(UI.btn(t('pause.map'), 'btn-pause-map', function () { PP.game.quitToMap(); }, 'wide blue'));
      p.appendChild(UI.toggleRow('set.music', 'pause-music', !!s.music, function (v) { set('music', v ? 1 : 0); }));
      p.appendChild(UI.toggleRow('set.sfx', 'pause-sfx', !!s.sfx, function (v) { set('sfx', v ? 1 : 0); }));
      if (window.navigator && navigator.vibrate) p.appendChild(UI.toggleRow('set.vib', 'pause-vib', !!s.vib, function (v) { set('vib', v ? 1 : 0); }));
      el.appendChild(p);
    },
    onKey: function (key) { if (key === 'esc' || key === 'p') { PP.game.resume(); return true; } return false; }
  });

  /* two big, almost wordless icon cards; no timer; arrows select, Enter confirms */
  var sel = 0;
  UI.register('cards', {
    cls: 'dim',
    render: function (el) {
      var t = PP.t, G = PP.G, cards = G.cards || [];
      sel = 0;
      el.appendChild(h('div', 'title', t('cards.title')));
      var box = h('div', 'cards');
      cards.forEach(function (c, i) {
        var val = c.id === 'buddy' ? '+' + PP.cards.buddyGain() : c.val;
        var b = h('button', 'card' + (i === sel ? ' sel' : ''), [UI.icon(c.icon, 76), h('div', 'big', val), h('div', 'nm', t('card.' + c.id))], { 'data-testid': 'card-' + i, 'data-card': c.id, type: 'button' });
        b.addEventListener('click', function () { PP.audio.unlock(); PP.game.chooseCard(i); });
        box.appendChild(b);
      });
      if (PP.tut && !PP.tut.seen('cards')) box.appendChild(h('span', 'hand', UI.icon('h_hand', 40)));
      el.appendChild(box);
    },
    onKey: function (key) {
      var el = UI.els.cards; if (!el) return false;
      var cs = el.querySelectorAll('.card');
      if (key === 'left' || key === 'right') {
        sel = key === 'left' ? 0 : 1;
        for (var i = 0; i < cs.length; i++) cs[i].classList.toggle('sel', i === sel);
        return true;
      }
      if (key === 'enter') { PP.game.chooseCard(sel); return true; }
      return false;
    }
  });
})();
