/* Pompom Parade - platform adapter.
 * The ONLY file allowed to reference the YouTube Playables SDK global (ytgame).
 * Standalone web build falls back to localStorage / Page Visibility. */
(function () {
  'use strict';
  var PP = window.PP;
  var KEY = 'pompomParade.v1';
  var yt = (typeof ytgame !== 'undefined' && ytgame && ytgame.IN_PLAYABLES_ENV) ? ytgame : null; // eslint-disable-line no-undef
  var P = PP.platform = { isPlayables: !!yt };

  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }

  P.firstFrameReady = function () { if (yt) safe(function () { yt.game.firstFrameReady(); }); };
  P.gameReady = function () { if (yt) safe(function () { yt.game.gameReady(); }); };

  P.loadData = function () {
    if (yt) {
      return Promise.resolve().then(function () { return yt.game.loadData(); })
        .then(function (s) { return s || ''; }, function () { return ''; });
    }
    return new Promise(function (resolve) {
      var s = null;
      try { s = window.localStorage.getItem(KEY); } catch (e) { s = null; }
      resolve(s || '');
    });
  };
  P.saveData = function (str) {
    if (yt) {
      return Promise.resolve().then(function () { return yt.game.saveData(str); }).then(function () { return true; }, function () { return false; });
    }
    return new Promise(function (resolve) {
      try { window.localStorage.setItem(KEY, str); resolve(true); } catch (e) { resolve(false); }
    });
  };
  P.getLanguage = function () {
    if (yt) {
      // Playables: getLanguage() returns a Promise<string> (BCP-47)
      return Promise.resolve().then(function () { return yt.system.getLanguage(); }).then(function (l) { return l || 'en'; }, function () { return 'en'; });
    }
    return Promise.resolve((window.navigator && (navigator.language || navigator.userLanguage)) || 'en');
  };
  P.isAudioEnabled = function () {
    if (yt) { var v = safe(function () { return yt.system.isAudioEnabled(); }); return v !== false; }
    return true;
  };
  P.onAudioEnabledChange = function (cb) { if (yt) safe(function () { yt.system.onAudioEnabledChange(cb); }); };
  P.onPause = function (cb) {
    if (yt) { safe(function () { yt.system.onPause(cb); }); return; }
    document.addEventListener('visibilitychange', function () { if (document.hidden) cb(); });
    window.addEventListener('pagehide', function () { cb(); });
  };
  P.onResume = function (cb) {
    if (yt) { safe(function () { yt.system.onResume(cb); }); return; }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cb(); });
  };
  P.sendScore = function (n) { if (yt) safe(function () { yt.engagement.sendScore({ value: Math.floor(n) }); }); };
  P.logError = function (msg) {
    if (yt) safe(function () { yt.health.logError(); });
    if (window.console) console.error('[PompomParade] ' + msg);
  };
  P.logWarning = function (msg) {
    if (yt) safe(function () { yt.health.logWarning(); });
    if (window.console) console.warn('[PompomParade] ' + msg);
  };

  window.onerror = function (msg, src, line, col) {
    P.logError(msg + ' @' + (src || '') + ':' + line + ':' + col);
    return false;
  };
})();
