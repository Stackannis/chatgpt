/* Pompom Parade - storage abstraction over the platform adapter with in-memory fallback.
 * In debug sessions (any debug URL param without save=1) nothing is persisted. */
(function () {
  'use strict';
  var PP = window.PP;
  var mem = '';
  PP.storage = {
    persistent: !PP.noPersist,
    load: function () {
      if (PP.noPersist) return Promise.resolve(mem);
      return PP.platform.loadData().then(function (s) { return s || mem; }, function () { return mem; });
    },
    save: function (str) {
      mem = str;
      if (PP.noPersist) return Promise.resolve(true);
      return PP.platform.saveData(str).then(function (ok) { return ok; }, function () { return false; });
    },
    peek: function () { return mem; }
  };
})();
