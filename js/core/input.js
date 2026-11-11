/* Pompom Parade - input: relative pointer drag (touch / mouse) + keyboard */
(function () {
  'use strict';
  var PP = window.PP;
  var I = PP.input = { dx: 0, down: false, left: false, right: false, lastX: 0, id: null, moved: 0, any: false };

  function gesture() {
    if (!I.any) { I.any = true; }
    if (PP.audio) PP.audio.unlock();
  }
  function down(x, y, id) {
    gesture();
    I.down = true; I.id = id; I.lastX = x; I.moved = 0;
    if (PP.game) PP.game.onPointerDown(PP.R.toLogicalX(x), PP.R.toLogicalY(y));
  }
  function move(x, id) {
    if (!I.down || id !== I.id) return;
    var d = (x - I.lastX) / PP.R.scale;
    I.lastX = x; I.dx += d; I.moved += Math.abs(d);
  }
  function up(id) { if (id === I.id) { I.down = false; I.id = null; } }

  I.takeDx = function () { var d = I.dx; I.dx = 0; return d; };
  I.reset = function () { I.dx = 0; I.left = I.right = false; };

  I.init = function () {
    var c = PP.R.canvas;
    if (window.PointerEvent) {
      c.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        down(e.clientX, e.clientY, e.pointerId);
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
      });
      window.addEventListener('pointermove', function (e) { move(e.clientX, e.pointerId); });
      window.addEventListener('pointerup', function (e) { up(e.pointerId); });
      window.addEventListener('pointercancel', function (e) { up(e.pointerId); });
    } else {
      c.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0]; down(t.clientX, t.clientY, t.identifier); e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) move(e.changedTouches[i].clientX, e.changedTouches[i].identifier);
      }, { passive: true });
      window.addEventListener('touchend', function (e) { for (var i = 0; i < e.changedTouches.length; i++) up(e.changedTouches[i].identifier); });
      window.addEventListener('touchcancel', function (e) { for (var i = 0; i < e.changedTouches.length; i++) up(e.changedTouches[i].identifier); });
      c.addEventListener('mousedown', function (e) { if (e.button === 0) down(e.clientX, e.clientY, 'm'); });
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
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') { I.left = true; if (PP.game) PP.game.onKey('left', e); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { I.right = true; if (PP.game) PP.game.onKey('right', e); }
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
      I.left = I.right = false; I.down = false;
      if (PP.game) PP.game.autoPause('blur');
    });
  };
})();
