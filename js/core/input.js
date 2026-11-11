/* Pompom Parade - input: relative pointer drag (touch / mouse) + keyboard.
 * The first finger owns steering; extra fingers are tracked but never steal it. When the owner lifts,
 * the oldest remaining finger takes over with a fresh baseline (the squad does not jump).
 * Dragging works anywhere on the stage, including the side bars next to the portrait column. */
(function () {
  'use strict';
  var PP = window.PP;
  var I = PP.input = { dx: 0, down: false, left: false, right: false, lastX: 0, id: null, moved: 0, any: false, ptrs: [] };
  var ptrs = I.ptrs;      // active pointers, oldest first: {id, x}

  function gesture() {
    if (!I.any) { I.any = true; }
    if (PP.audio) PP.audio.unlock();
  }
  function find(id) { for (var i = 0; i < ptrs.length; i++) if (ptrs[i].id === id) return i; return -1; }
  /* steering input only counts while the run is live (not behind the pause / card overlays) */
  function live() { var GM = PP.game, G = PP.G; return !!GM && GM.screen === 'play' && !GM.paused && !(G && G.cards); }
  function down(x, y, id) {
    gesture();
    if (find(id) < 0) ptrs.push({ id: id, x: x });
    if (I.id === null) { I.down = true; I.id = id; I.lastX = x; I.moved = 0; }
    if (PP.game) PP.game.onPointerDown(PP.R.toLogicalX(x), PP.R.toLogicalY(y));
  }
  function move(x, id) {
    var k = find(id);
    if (k >= 0) ptrs[k].x = x;
    if (!I.down || id !== I.id) return;
    var d = (x - I.lastX) / PP.R.scale;
    I.lastX = x;
    if (!live()) return;
    I.dx += d; I.moved += Math.abs(d);
  }
  function up(id) {
    var k = find(id);
    if (k >= 0) ptrs.splice(k, 1);
    if (id !== I.id) return;
    if (ptrs.length) { I.id = ptrs[0].id; I.lastX = ptrs[0].x; I.down = true; }   // hand over, fresh baseline
    else { I.down = false; I.id = null; }
  }
  function dropAll() { ptrs.length = 0; I.down = false; I.id = null; }

  I.takeDx = function () { var d = I.dx; I.dx = 0; return d; };
  I.reset = function () { I.dx = 0; I.left = I.right = false; };

  I.init = function () {
    var c = PP.R.canvas, stage = document.getElementById('stage') || c;
    /* a pointer steers when it lands on the game itself (canvas, side bars), not on a DOM screen / button */
    function steerable(t) {
      if (t === c || t === stage || t === PP.R.ui || t === document.body || t === document.documentElement) return true;
      while (t && t !== stage) {
        if (t.tagName === 'BUTTON' || (t.classList && (t.classList.contains('screen') || t.classList.contains('modal')))) return false;
        t = t.parentNode;
      }
      return true;
    }
    if (window.PointerEvent) {
      stage.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!steerable(e.target)) return;
        down(e.clientX, e.clientY, e.pointerId);
        try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
      });
      window.addEventListener('pointermove', function (e) { move(e.clientX, e.pointerId); });
      window.addEventListener('pointerup', function (e) { up(e.pointerId); });
      window.addEventListener('pointercancel', function (e) { up(e.pointerId); });
    } else {
      stage.addEventListener('touchstart', function (e) {
        if (!steerable(e.target)) return;
        for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; down(t.clientX, t.clientY, t.identifier); }
        e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) move(e.changedTouches[i].clientX, e.changedTouches[i].identifier);
      }, { passive: true });
      window.addEventListener('touchend', function (e) { for (var i = 0; i < e.changedTouches.length; i++) up(e.changedTouches[i].identifier); });
      window.addEventListener('touchcancel', function (e) { for (var i = 0; i < e.changedTouches.length; i++) up(e.changedTouches[i].identifier); });
      stage.addEventListener('mousedown', function (e) { if (e.button === 0 && steerable(e.target)) down(e.clientX, e.clientY, 'm'); });
      window.addEventListener('mousemove', function (e) { move(e.clientX, 'm'); });
      window.addEventListener('mouseup', function () { up('m'); });
    }
    // no page scroll / zoom / context menu
    document.addEventListener('touchmove', function (e) {
      var t = e.target;
      while (t && t !== document.body) { if (t.classList && t.classList.contains('scroll')) return; t = t.parentNode; }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('pointerdown', gesture, true);

    window.addEventListener('keydown', function (e) {
      gesture(); I.keyboardUser = true;
      var k = e.key, rep = !!e.repeat;      // a held key must not toggle pause / confirm again and again
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') { I.left = true; if (PP.game && !rep) PP.game.onKey('left', e); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { I.right = true; if (PP.game && !rep) PP.game.onKey('right', e); }
      else if (rep) { /* ignore auto-repeat for Esc / P / Enter */ }
      else if (k === 'Escape' || k === 'Esc') { if (PP.game) PP.game.onKey('esc', e); } // never preventDefault on Esc
      else if (k === 'p' || k === 'P') { if (PP.game) PP.game.onKey('p', e); }
      else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { if (PP.game) PP.game.onKey('enter', e); }
    });
    window.addEventListener('keyup', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') I.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') I.right = false;
    });
    window.addEventListener('blur', function () {
      I.left = I.right = false; dropAll();
      if (PP.game) PP.game.autoPause('blur');
    });
  };
})();
