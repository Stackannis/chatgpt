/* Pompom Parade - level map (winding path through the 5 worlds) + level card */
(function () {
  'use strict';
  var PP = window.PP, UI = PP.ui, h = UI.h;
  var STEP = 84, TOP = 60, BOTTOM = 70;
  var BOSS_SPR = { 6: 'b_wobble', 12: 'b_snail', 18: 'b_donut', 24: 'b_puff', 30: 'b_queen' };
  function nodeX(L) { return 50 + 28 * Math.sin(L * 1.05 + 0.6); }          // % of width
  function nodeY(L) { return TOP + (30 - L) * STEP; }                          // logical units from the top

  function levelCard(el, L) {
    var t = PP.t, sv = PP.save.data, B = PP.bal, rec = sv.levels[L] || { s: 0, best: 0, pct: 0 };
    var modal = h('div', 'modal', null, { 'data-testid': 'level-card' });
    var panel = h('div', 'panel', null, { style: 'position:relative' });
    function close() { if (modal.parentNode) modal.parentNode.removeChild(modal); }
    panel.appendChild(UI.btn('✕', 'card-close', close, 'small round close'));
    panel.appendChild(h('div', 'title dark', t('hud.level', { n: L })));
    panel.appendChild(h('div', 'muted center', t('world.' + B.world(L)) + (B.isBoss(L) ? ' · ' + t('boss.' + (L / 6)) : '')));
    panel.appendChild(UI.starsRow(rec.s, 34, false));
    var th = h('div', 'row', null, { style: 'font-size:calc(var(--u)*13)' });
    th.appendChild(h('span', 'pill', [UI.icon('i_star', 14), UI.icon('i_star', 14), h('span', null, '≥ ' + B.star2(L)), UI.icon('pom_bunny_0', 16)]));
    th.appendChild(h('span', 'pill', [UI.icon('i_star', 14), UI.icon('i_star', 14), UI.icon('i_star', 14), h('span', null, '≥ ' + B.star3(L)), UI.icon('pom_bunny_0', 16)]));
    panel.appendChild(th);
    if (rec.s === 0 && rec.pct > 0) panel.appendChild(h('div', 'muted', t('map.best', { n: rec.pct })));
    if (PP.econ.helping(L) > 0) panel.appendChild(h('div', 'pill', [UI.icon('i_glove', 22), h('span', null, '+' + PP.econ.helping(L))], { 'data-testid': 'helping-hand', style: 'margin-top:calc(var(--u)*4)' }));
    // weapon carousel (equip)
    var wsel = h('div', 'wsel');
    PP.data.weapons.forEach(function (w) {
      if (!sv.weapons[w.id].own) return;
      var b = h('button', 'wbtn' + (sv.equipped === w.id ? ' sel' : ''), UI.icon('i_w_' + w.id, 38), { 'data-testid': 'equip-' + w.id, type: 'button', title: t('weapon.' + w.id) });
      b.addEventListener('click', function () {
        PP.econ.equip(w.id); PP.audio.sfx('click');
        var all = wsel.querySelectorAll('.wbtn'); for (var i = 0; i < all.length; i++) all[i].classList.remove('sel');
        b.classList.add('sel'); name.textContent = t('weapon.' + w.id) + ' · ' + t('shop.lv', { n: sv.weapons[w.id].lv });
      });
      wsel.appendChild(b);
    });
    panel.appendChild(wsel);
    var name = h('div', 'muted', t('weapon.' + sv.equipped) + ' · ' + t('shop.lv', { n: sv.weapons[sv.equipped].lv }));
    panel.appendChild(name);
    var play = UI.btn(t('menu.play'), 'card-play', function () { close(); PP.game.startLevel(L); }, 'primary');
    play.setAttribute('data-autofocus', '1');
    panel.appendChild(play);
    modal.appendChild(panel);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    el.appendChild(modal);
    UI.modalClose = close;
  }

  UI.register('map', {
    cls: 'solid',
    render: function (el, params) {
      var t = PP.t, sv = PP.save.data, W = PP.data.worlds;
      UI.modalClose = null;
      var head = h('div', 'head');
      head.appendChild(UI.btn('←', 'btn-back', function () { PP.game.goto('menu'); }, 'small round'));
      head.appendChild(h('div', 'title dark', t('menu.map')));
      head.appendChild(h('span', 'pill', [UI.icon('i_star', 16), h('span', null, PP.save.totalStars() + '/90')], { 'data-testid': 'total-stars' }));
      head.appendChild(UI.buttonsPill());
      el.appendChild(head);
      if (PP.save.cleared(30)) el.appendChild(h('div', 'banner', t('map.theend'), { 'data-testid': 'the-end' }));
      var wrap = h('div', 'scroll map-wrap', null, { 'data-testid': 'map-scroll' });
      var totalH = TOP + 29 * STEP + BOTTOM;
      var inner = h('div', 'map-inner', null, { style: 'height:calc(var(--u)*' + totalH + ')' });
      var w, L;
      for (w = 1; w <= 5; w++) {
        var top = w === 5 ? 0 : nodeY(w * 6) - STEP / 2, bot = w === 1 ? totalH : nodeY((w - 1) * 6 + 1) + STEP / 2;
        var sec = h('div', 'world-sec', null, { style: 'top:calc(var(--u)*' + top + ');height:calc(var(--u)*' + (bot - top) + ');background:linear-gradient(90deg,transparent 0,transparent 9%,' + W[w].road + ' 9%,' + W[w].road + ' 91%,transparent 91%),url(' + PP.bg.pattern(w) + ') ' + W[w].side2 });
        sec.appendChild(h('div', 'world-name', w + ' · ' + t('world.' + w)));
        inner.appendChild(sec);
      }
      // dotted path
      var svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'map-path'); svg.setAttribute('viewBox', '0 0 100 ' + totalH); svg.setAttribute('preserveAspectRatio', 'none');
      var pts = '';
      for (L = 1; L <= 30; L++) pts += nodeX(L) + ',' + nodeY(L) + ' ';
      var pl = document.createElementNS(svgNS, 'polyline');
      pl.setAttribute('points', pts); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', 'rgba(74,59,82,0.45)');
      pl.setAttribute('stroke-width', '5'); pl.setAttribute('stroke-dasharray', '2 9'); pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(pl); inner.appendChild(svg);
      var curNode = null;
      for (L = 1; L <= 30; L++) (function (L) {
        var rec = sv.levels[L], locked = L > sv.unlocked, done = !!(rec && rec.s > 0), cur = L === Math.min(30, sv.unlocked) && !done, boss = PP.bal.isBoss(L);
        var cls = 'node' + (boss ? ' boss' : '') + (locked ? ' locked' : (cur ? ' cur' : (done ? ' done' : '')));
        var n = h('button', cls, null, { 'data-testid': 'node-' + L, type: 'button', style: 'left:' + nodeX(L) + '%;top:calc(var(--u)*' + nodeY(L) + ')' });
        if (locked) n.appendChild(UI.icon('i_lock', 26));
        else if (boss) { var bi = UI.icon(BOSS_SPR[L], 50); n.appendChild(bi); }
        n.appendChild(h('span', 'num', String(L)));
        if (locked && !boss) n.querySelector('.num').style.display = 'none';
        if (done) { var st = h('span', 'stars'); for (var i = 0; i < 3; i++) st.appendChild(UI.icon(i < rec.s ? 'i_star' : 'i_star_off', 15)); n.appendChild(st); }
        else if (rec && rec.pct > 0) n.appendChild(h('span', 'pct', rec.pct + '%'));
        n.addEventListener('click', function () {
          PP.audio.unlock();
          if (L > PP.save.data.unlocked) { PP.audio.sfx('gate_bad'); UI.toast(t('map.locked')); return; }
          PP.audio.sfx('click'); levelCard(el, L);
        });
        inner.appendChild(n);
        if (cur || (L === 30 && !curNode && done)) curNode = n;
        var wu = PP.data.weaponUnlockedAt(L);
        if (wu) {
          var right = nodeX(L) < 50;
          var wi = h('span', 'node-w', UI.icon('i_w_' + wu.id, 30), { style: 'left:calc(' + nodeX(L) + '% + var(--u)*' + (right ? 38 : -74) + ');top:calc(var(--u)*' + nodeY(L) + ')' + (sv.weapons[wu.id].own ? '' : ';opacity:0.75') });
          inner.appendChild(wi);
        }
      })(L);
      wrap.appendChild(inner);
      el.appendChild(wrap);
      // scroll to the current node
      var target = params && params.focus ? inner.querySelector('[data-testid="node-' + params.focus + '"]') : curNode;
      setTimeout(function () { if (target && wrap.isConnected) wrap.scrollTop = Math.max(0, target.offsetTop - wrap.clientHeight * 0.55); }, 0);
      if (params && params.open) levelCard(el, params.open);
    },
    onKey: function (key) {
      if (key === 'esc') { if (UI.modalClose && document.querySelector('.modal')) { UI.modalClose(); return true; } PP.game.goto('menu'); return true; }
      return false;
    }
  });
})();
