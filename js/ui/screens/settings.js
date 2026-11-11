/* Pompom Parade - settings. Music and SFX are separate toggles (no master mute). */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;
  var back = 'menu', confirmReset = false;

  UI.toggleRow = function (labelKey, testid, on, onChange, onLabel, offLabel) {
    var t = PP.t;
    var b = UI.btn(on ? (onLabel || t('set.on')) : (offLabel || t('set.off')), testid, function () { onChange(!on); }, 'small toggle' + (on ? ' on' : ''));
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    return h('div', 'set-row', [h('span', 'lbl', t(labelKey)), b]);
  };
  UI.applySettings = function () {
    var s = PP.save.data.settings;
    PP.audio.setSettings(s.music, s.sfx);
    PP.fx.vibOn = !!s.vib; PP.fx.reduced = !s.shake;
    if (PP.G) PP.G.sens = s.sens;
  };

  UI.register('settings', {
    cls: 'solid',
    render: function (el, params) {
      var t = PP.t, s = PP.save.data.settings;
      if (params.from) back = params.from;
      function set(k, v) { s[k] = v; PP.save.write(); UI.applySettings(); UI.show('settings', { from: back }); }
      var head = h('div', 'head');
      head.appendChild(UI.btn('←', 'btn-back', function () { confirmReset = false; PP.game.goto(back); }, 'small round'));
      head.appendChild(h('div', 'title dark', t('set.title')));
      el.appendChild(head);
      var p = h('div', 'panel scroll');
      p.appendChild(UI.toggleRow('set.music', 'set-music', !!s.music, function (v) { set('music', v ? 1 : 0); }));
      p.appendChild(UI.toggleRow('set.sfx', 'set-sfx', !!s.sfx, function (v) { set('sfx', v ? 1 : 0); }));
      if (window.navigator && navigator.vibrate) p.appendChild(UI.toggleRow('set.vib', 'set-vib', !!s.vib, function (v) { set('vib', v ? 1 : 0); }));
      p.appendChild(UI.toggleRow('set.shake', 'set-shake', !!s.shake, function (v) { set('shake', v ? 1 : 0); }, t('set.shake.full'), t('set.shake.reduced')));
      var seg = h('div', 'seg');
      [[0.8, 'set.sens.low'], [1, 'set.sens.mid'], [1.3, 'set.sens.high']].forEach(function (o) {
        seg.appendChild(UI.btn(t(o[1]), 'set-sens-' + o[0], function () { set('sens', o[0]); }, 'small' + (s.sens === o[0] ? ' sel' : '')));
      });
      p.appendChild(h('div', 'set-row', [h('span', 'lbl', t('set.sens')), seg]));
      if (!PP.platform.isPlayables) {           // hidden inside Playables: the platform language is used
        var lseg = h('div', 'seg');
        [['auto', 'set.lang.auto'], ['en', 'English'], ['fr', 'Français']].forEach(function (o) {
          lseg.appendChild(UI.btn(o[0] === 'auto' ? t(o[1]) : o[1], 'set-lang-' + o[0], function () {
            s.lang = o[0]; PP.save.write();
            PP.i18n.resolve(s.lang).then(function () { UI.show('settings', { from: back }); });
          }, 'small' + (s.lang === o[0] ? ' sel' : '')));
        });
        p.appendChild(h('div', 'set-row', [h('span', 'lbl', t('set.lang')), lseg]));
      }
      var rb = UI.btn(confirmReset ? t('set.reset.confirm') : t('set.reset'), confirmReset ? 'set-reset-confirm' : 'set-reset', function () {
        if (!confirmReset) { confirmReset = true; UI.show('settings', { from: back }); return; }
        confirmReset = false;
        PP.save.reset().then(function () { UI.applySettings(); PP.i18n.resolve('auto').then(function () { UI.toast(PP.t('set.reset.done')); PP.game.goto('menu'); }); });
      }, 'small' + (confirmReset ? ' primary' : ''));
      var rrow = h('div', 'set-row', [h('span', 'lbl', t('set.progress')), rb]);
      if (confirmReset) rrow.appendChild(UI.btn(t('set.cancel'), 'set-reset-cancel', function () { confirmReset = false; UI.show('settings', { from: back }); }, 'small'));
      p.appendChild(rrow);
      p.appendChild(h('div', 'muted center', t('set.credits') + ' · v' + PP.version, { style: 'margin-top:calc(var(--u)*10)' }));
      el.appendChild(p);
    },
    onKey: function (key) { if (key === 'esc') { confirmReset = false; PP.game.goto(back); return true; } return false; },
    onHide: function () { }
  });
})();
