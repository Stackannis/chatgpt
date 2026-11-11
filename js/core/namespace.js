/* Pompom Parade - global namespace, constants, URL params, event bus */
(function () {
  'use strict';
  var PP = window.PP = {
    version: '1.0.0',
    data: {},
    spr: {},
    headless: false,
    cfg: {
      W: 360, ROAD_L: 30, ROAD_R: 330, MINX: 42, MAXX: 318,
      LANES: [67.5, 142.5, 217.5, 292.5], LANE_W: 75,
      OUTLINE: '#4A3B52',
      MAX_VIS: 30, MAX_ENEMIES: 70, MAX_SHOTS: 200, MAX_ESHOTS: 40,
      MAX_PARTICLES: 220, MAX_TEXTS: 24, MAX_PICKUPS: 48
    }
  };

  /* ---- URL parameters ---- */
  var params = {};
  try {
    var q = (window.location.search || '').replace(/^\?/, '').split('&');
    for (var i = 0; i < q.length; i++) {
      if (!q[i]) continue;
      var kv = q[i].split('=');
      params[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv.slice(1).join('=')) : '1';
    }
  } catch (e) { /* ignore */ }
  PP.params = params;
  var debugKeys = ['level', 'endless', 'autoplay', 'god', 'speed', 'seed', 'squad', 'weapon', 'wlv', 'upg', 'profile',
    'unlockall', 'buttons', 'tutorial', 'reset', 'screen', 'balance', 'validate', 'hitbox'];
  PP.debugSession = false;
  for (var d = 0; d < debugKeys.length; d++) if (params[debugKeys[d]] !== undefined) PP.debugSession = true;
  PP.noPersist = PP.debugSession && params.save !== '1';

  /* ---- event bus + ring buffer (last 200) ---- */
  var listeners = {};
  var buf = [];
  PP.events = {
    buf: buf,
    on: function (type, cb) { (listeners[type] = listeners[type] || []).push(cb); },
    off: function (type, cb) {
      var l = listeners[type]; if (!l) return;
      var i = l.indexOf(cb); if (i >= 0) l.splice(i, 1);
    },
    emit: function (type, data) {
      if (PP.headless && !PP.headlessEvents) return;
      buf.push({ t: PP.G ? Math.round(PP.G.t * 100) / 100 : 0, type: type, data: data });
      if (buf.length > 200) buf.shift();
      var l = listeners[type];
      if (l) for (var i = 0; i < l.length; i++) {
        try { l[i](data); } catch (e) { if (window.console) console.error(e); }
      }
    }
  };
})();
