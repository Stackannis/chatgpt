/* Pompom Parade - i18n: flat-key dictionaries, t(key, params), locale number formatting */
(function () {
  'use strict';
  var PP = window.PP;
  var I = PP.i18n = { lang: 'en', dicts: {} };
  I.register = function (lang, dict) { I.dicts[lang] = dict; };
  I.setLang = function (l) {
    l = (l || 'en').toLowerCase();
    I.lang = l.indexOf('fr') === 0 ? 'fr' : 'en';
    try { document.documentElement.lang = I.lang; } catch (e) { /* ignore */ }
  };
  I.t = function (key, params) {
    var d = I.dicts[I.lang] || {};
    var s = d[key];
    if (s === undefined) s = (I.dicts.en || {})[key];
    if (s === undefined) return key;
    if (params) {
      for (var k in params) if (params.hasOwnProperty(k)) s = s.split('{' + k + '}').join(params[k]);
    }
    return s;
  };
  I.fmt = function (n) {
    n = Math.round(n);
    var neg = n < 0; n = Math.abs(n);
    var s = String(n), out = '';
    var sep = I.lang === 'fr' ? ' ' : ',';
    while (s.length > 3) { out = sep + s.slice(-3) + out; s = s.slice(0, -3); }
    return (neg ? '-' : '') + s + out;
  };
  /* resolve language: ?lang= > settings override > platform */
  I.resolve = function (settingLang) {
    if (PP.params.lang) { I.setLang(PP.params.lang); return Promise.resolve(I.lang); }
    if (!PP.platform.isPlayables && settingLang && settingLang !== 'auto') { I.setLang(settingLang); return Promise.resolve(I.lang); }
    return PP.platform.getLanguage().then(function (l) { I.setLang(l); return I.lang; });
  };
  PP.t = I.t;
})();
