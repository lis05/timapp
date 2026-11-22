(function (App) {
  'use strict';

  var DAY_MS = 86400000;

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function uid(prefix) {
    var p = prefix ? prefix + '_' : '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return p + crypto.randomUUID();
    }
    return p + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toDate(d) {
    return d instanceof Date ? new Date(d.getTime()) : new Date(d);
  }

  function startOfDay(d) {
    var dt = toDate(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function endOfDay(d) {
    var dt = toDate(d);
    dt.setHours(23, 59, 59, 999);
    return dt;
  }

  function addDays(d, n) {
    var dt = toDate(d);
    dt.setDate(dt.getDate() + n);
    return dt;
  }

  function addMonths(d, n) {
    var dt = toDate(d);
    var day = dt.getDate();
    dt.setDate(1);
    dt.setMonth(dt.getMonth() + n);
    var maxDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(day, maxDay));
    return dt;
  }

  function startOfWeek(d, weekStartsOn) {
    var w = weekStartsOn === 0 ? 0 : 1;
    var dt = startOfDay(d);
    var day = dt.getDay();
    var diff = (day - w + 7) % 7;
    dt.setDate(dt.getDate() - diff);
    return dt;
  }

  function endOfWeek(d, weekStartsOn) {
    return endOfDay(addDays(startOfWeek(d, weekStartsOn), 6));
  }

  function startOfMonth(d) {
    var dt = startOfDay(d);
    dt.setDate(1);
    return dt;
  }

  function endOfMonth(d) {
    var dt = toDate(d);
    dt = new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 23, 59, 59, 999);
    return dt;
  }

  function startOfYear(d) {
    var dt = toDate(d);
    return new Date(dt.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  function endOfYear(d) {
    var dt = toDate(d);
    return new Date(dt.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  function toDateKey(d) {
    var dt = toDate(d);
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  }

  function parseDateKey(key) {
    if (!key || typeof key !== 'string') return startOfDay(new Date());
    var parts = key.split('-');
    if (parts.length !== 3) return startOfDay(new Date());
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(day)) return startOfDay(new Date());
    return new Date(y, m, day, 0, 0, 0, 0);
  }

  function toTimeInput(ts) {
    var dt = new Date(ts);
    return pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
  }

  function combineDateAndTime(dateKey, timeStr) {
    var base = parseDateKey(dateKey);
    if (!timeStr || typeof timeStr !== 'string') return base.getTime();
    var m = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return NaN;
    var hh = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return NaN;
    base.setHours(hh, mm, 0, 0);
    return base.getTime();
  }

  function formatTimeOfDay(ts, timeFormat) {
    var dt = new Date(ts);
    var h = dt.getHours();
    var m = pad2(dt.getMinutes());
    if (timeFormat === '12h') {
      var suffix = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return h12 + ':' + m + ' ' + suffix;
    }
    return pad2(h) + ':' + m;
  }

  function formatClockDuration(ms) {
    var totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }

  function formatWithUnit(num, unit) {
    if (unit.length > 1 || /[^\x00-\x7f]/.test(unit)) {
      return num + ' ' + unit;
    }
    return num + unit;
  }

  function formatDuration(ms, format) {
    var safeMs = Math.max(0, ms || 0);
    var uH = App.i18n.t('common.unitHour');
    var uM = App.i18n.t('common.unitMin');
    var uS = App.i18n.t('common.unitSec');

    if (format === 'decimal') {
      return formatWithUnit((safeMs / 3600000).toFixed(2), uH);
    }
    if (format === 'hm') {
      var totalSec = Math.floor(safeMs / 1000);
      if (totalSec < 60) return formatWithUnit(totalSec, uS);
      var totalMin = Math.floor(totalSec / 60);
      var h = Math.floor(totalMin / 60);
      var m = totalMin % 60;
      if (h === 0) return formatWithUnit(m, uM);
      if (m === 0) return formatWithUnit(h, uH);
      return formatWithUnit(h, uH) + ' ' + formatWithUnit(m, uM);
    }
    return formatClockDuration(safeMs);
  }

  function parseDurationInput(str) {
    if (str == null) return null;
    var s = String(str).trim().toLowerCase().replace(/,/g, '.');
    if (!s) return null;

    // HH:MM:SS or HH:MM
    var colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (colon) {
      var ch = parseInt(colon[1], 10);
      var cm = parseInt(colon[2], 10);
      var cs = colon[3] !== undefined ? parseInt(colon[3], 10) : 0;
      if (cm >= 60 || cs >= 60) return null;
      return (ch * 3600 + cm * 60 + cs) * 1000;
    }

    // Combined units (English & Ukrainian: h/год/г, m/хв/х, s/сек/с)
    var unitMatch = s.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|год|г))?\s*(?:(\d+(?:\.\d+)?)\s*(?:m|хв|х))?\s*(?:(\d+(?:\.\d+)?)\s*(?:s|сек|с))?$/);
    if (unitMatch && (unitMatch[1] || unitMatch[2] || unitMatch[3])) {
      var uh = unitMatch[1] ? parseFloat(unitMatch[1]) : 0;
      var um = unitMatch[2] ? parseFloat(unitMatch[2]) : 0;
      var us = unitMatch[3] ? parseFloat(unitMatch[3]) : 0;
      var total = Math.round((uh * 3600 + um * 60 + us) * 1000);
      return total >= 0 ? total : null;
    }

    // Plain decimal hours e.g. "1.5"
    if (/^\d+(?:\.\d+)?$/.test(s)) {
      var dec = parseFloat(s);
      if (!isNaN(dec)) return Math.round(dec * 3600000);
    }

    return null;
  }

  function clipEntryToRange(entry, rangeStart, rangeEnd) {
    if (!entry) return 0;
    var s = Math.max(entry.startTime, rangeStart);
    var e = Math.min(entry.endTime, rangeEnd);
    return e > s ? e - s : 0;
  }

  function splitEntryByDay(entry) {
    if (!entry || entry.endTime <= entry.startTime) return [];
    var segments = [];
    var cursor = entry.startTime;
    while (cursor < entry.endTime) {
      var dayStart = startOfDay(cursor).getTime();
      var nextDayStart = addDays(dayStart, 1).getTime();
      var segEnd = Math.min(entry.endTime, nextDayStart);
      segments.push({
        dateKey: toDateKey(cursor),
        dayStart: dayStart,
        startTime: cursor,
        endTime: segEnd,
        duration: segEnd - cursor
      });
      cursor = segEnd;
    }
    return segments;
  }

  function getRangeForPreset(preset, anchorDate, weekStartsOn, customStartKey, customEndKey) {
    var anchor = anchorDate ? toDate(anchorDate) : new Date();
    if (preset === 'day') {
      return {
        startMs: startOfDay(anchor).getTime(),
        endMs: endOfDay(anchor).getTime()
      };
    }
    if (preset === 'week') {
      return {
        startMs: startOfWeek(anchor, weekStartsOn).getTime(),
        endMs: endOfWeek(anchor, weekStartsOn).getTime()
      };
    }
    if (preset === 'month') {
      return {
        startMs: startOfMonth(anchor).getTime(),
        endMs: endOfMonth(anchor).getTime()
      };
    }
    if (preset === 'year') {
      return {
        startMs: startOfYear(anchor).getTime(),
        endMs: endOfYear(anchor).getTime()
      };
    }
    if (preset === 'custom') {
      var s = customStartKey ? startOfDay(parseDateKey(customStartKey)).getTime() : startOfWeek(anchor, weekStartsOn).getTime();
      var e = customEndKey ? endOfDay(parseDateKey(customEndKey)).getTime() : endOfDay(anchor).getTime();
      if (e < s) {
        var tmp = s;
        s = startOfDay(e).getTime();
        e = endOfDay(tmp).getTime();
      }
      return { startMs: s, endMs: e };
    }
    return { startMs: 0, endMs: endOfDay(new Date()).getTime() };
  }

  function getPreviousRange(preset, startMs, endMs, weekStartsOn) {
    if (preset === 'all') return null;
    if (preset === 'day') {
      var prevDay = addDays(startMs, -1);
      return {
        startMs: startOfDay(prevDay).getTime(),
        endMs: endOfDay(prevDay).getTime()
      };
    }
    if (preset === 'week') {
      var prevWeek = addDays(startMs, -7);
      return {
        startMs: startOfWeek(prevWeek, weekStartsOn).getTime(),
        endMs: endOfWeek(prevWeek, weekStartsOn).getTime()
      };
    }
    if (preset === 'month') {
      var prevMonth = addMonths(startMs, -1);
      return {
        startMs: startOfMonth(prevMonth).getTime(),
        endMs: endOfMonth(prevMonth).getTime()
      };
    }
    if (preset === 'year') {
      var prevYear = new Date(new Date(startMs).getFullYear() - 1, 0, 1);
      return {
        startMs: startOfYear(prevYear).getTime(),
        endMs: endOfYear(prevYear).getTime()
      };
    }
    var span = endMs - startMs + 1;
    return {
      startMs: startMs - span,
      endMs: startMs - 1
    };
  }

  function csvEscape(val) {
    var s = val == null ? '' : String(val);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function entriesToCsv(entries, projectsMap, tagsMap, settings) {
    var headers = [
      csvEscape(App.i18n.t('common.date')),
      csvEscape(App.i18n.t('common.start')),
      csvEscape(App.i18n.t('common.end')),
      csvEscape(App.i18n.t('common.duration')),
      csvEscape(App.i18n.t('common.hours')),
      csvEscape(App.i18n.t('analytics.colTask')),
      csvEscape(App.i18n.t('common.project')),
      csvEscape(App.i18n.t('common.tags')),
      csvEscape(App.i18n.t('common.notes'))
    ];
    var lines = [headers.join(',')];
    var timeFmt = (settings && settings.timeFormat) || '24h';
    var durFmt = (settings && settings.durationFormat) || 'hms';

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var dur = Math.max(0, e.endTime - e.startTime);
      var proj = e.projectId && projectsMap[e.projectId] ? projectsMap[e.projectId].name : '';
      var tagNames = (e.tagIds || []).map(function (tid) {
        return tagsMap[tid] ? tagsMap[tid].name : '';
      }).filter(Boolean).join('; ');

      lines.push([
        csvEscape(toDateKey(e.startTime)),
        csvEscape(formatTimeOfDay(e.startTime, timeFmt)),
        csvEscape(formatTimeOfDay(e.endTime, timeFmt)),
        csvEscape(formatDuration(dur, durFmt)),
        csvEscape((dur / 3600000).toFixed(4)),
        csvEscape(e.description || ''),
        csvEscape(proj),
        csvEscape(tagNames),
        csvEscape(e.notes || '')
      ].join(','));
    }

    return lines.join('\r\n');
  }

  function downloadFile(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function formatDayHeading(dateKey) {
    var todayKey = toDateKey(new Date());
    var yesterdayKey = toDateKey(addDays(new Date(), -1));
    if (dateKey === todayKey) return App.i18n.t('common.today');
    if (dateKey === yesterdayKey) return App.i18n.t('common.yesterday');
    var dt = parseDateKey(dateKey);
    return App.i18n.formatDate(dt, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: dt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return 'rgba(100,116,139,' + alpha + ')';
    var clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length !== 6) return 'rgba(100,116,139,' + alpha + ')';
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(100,116,139,' + alpha + ')';
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  App.utils = {
    DAY_MS: DAY_MS,
    pad2: pad2,
    uid: uid,
    escapeHtml: escapeHtml,
    startOfDay: startOfDay,
    endOfDay: endOfDay,
    addDays: addDays,
    addMonths: addMonths,
    startOfWeek: startOfWeek,
    endOfWeek: endOfWeek,
    startOfMonth: startOfMonth,
    endOfMonth: endOfMonth,
    startOfYear: startOfYear,
    endOfYear: endOfYear,
    toDateKey: toDateKey,
    parseDateKey: parseDateKey,
    toTimeInput: toTimeInput,
    combineDateAndTime: combineDateAndTime,
    formatTimeOfDay: formatTimeOfDay,
    formatClockDuration: formatClockDuration,
    formatDuration: formatDuration,
    parseDurationInput: parseDurationInput,
    clipEntryToRange: clipEntryToRange,
    splitEntryByDay: splitEntryByDay,
    getRangeForPreset: getRangeForPreset,
    getPreviousRange: getPreviousRange,
    entriesToCsv: entriesToCsv,
    downloadFile: downloadFile,
    debounce: debounce,
    formatDayHeading: formatDayHeading,
    hexToRgba: hexToRgba
  };
})(window.TimApp);
