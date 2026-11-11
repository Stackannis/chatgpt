/* Pompom Parade - debug loader.
 * The debug scripts (URL params, window.__game, autoplay bot + human models, balance harness, validator)
 * are NOT static <script> tags: they are injected here, and only in the standalone web build outside the
 * Playables environment. The Playables package ships a stub of this file and no js/debug folder. */
(function () {
  'use strict';
  var PP = window.PP;
  var FILES = ['js/debug/validator.js', 'js/debug/autoplay.js', 'js/debug/humans.js', 'js/debug/balance.js', 'js/debug/debug.js'];
  PP.debugAllowed = function () { return PP.BUILD !== 'playables' && !(PP.platform && PP.platform.isPlayables); };
  /* cb() is called once, after the debug scripts ran (or immediately when they are not allowed) */
  PP.loadDebug = function (cb) {
    if (!PP.debugAllowed()) { cb(); return; }
    var i = 0;
    function next() {
      if (i >= FILES.length) { cb(); return; }
      var s = document.createElement('script');
      s.src = FILES[i++];
      s.onload = next;
      s.onerror = next;          // a missing debug file must never stop the game from booting
      document.head.appendChild(s);
    }
    next();
  };
})();
