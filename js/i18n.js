(function (App) {
  'use strict';

  var currentLocale = 'en';

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, params) {
    if (typeof str !== 'string' || !params) return str;
    return str.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
    });
  }

  App.i18n = {
    getLocale: function () {
      return currentLocale;
    },

    setLocale: function (code) {
      if (code && App.locales[code]) {
        currentLocale = code;
      } else {
        currentLocale = 'en';
      }
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = currentLocale;
      }
    },

    getAvailableLocales: function () {
      var codes = Object.keys(App.locales);
      codes.sort(function (a, b) {
        if (a === 'en') return -1;
        if (b === 'en') return 1;
        return a.localeCompare(b);
      });
      return codes.map(function (code) {
        var meta = (App.locales[code] && App.locales[code]._meta) || {};
        return {
          code: code,
          name: meta.name || code,
          nativeName: meta.nativeName || meta.name || code
        };
      });
    },

    t: function (key, params) {
      var activeDict = App.locales[currentLocale];
      var val = getByPath(activeDict, key);
      if (val === undefined && currentLocale !== 'en') {
        val = getByPath(App.locales.en, key);
      }
      if (val === undefined) return key;
      return interpolate(val, params);
    },

    formatDate: function (dateOrMs, options) {
      var d = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs);
      try {
        return new Intl.DateTimeFormat(currentLocale, options).format(d);
      } catch (e) {
        return d.toLocaleDateString();
      }
    }
  };
})(window.TimApp);
