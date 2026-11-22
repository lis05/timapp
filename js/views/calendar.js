(function (App) {
  'use strict';

  var HOUR_PX = 60;
  var savedScrollTop = 7 * HOUR_PX; // Default scroll to 07:00

  function layoutOverlaps(segments) {
    var sorted = segments.slice().sort(function (a, b) {
      return a.startTime - b.startTime || (b.endTime - b.startTime) - (a.endTime - a.startTime);
    });

    var columns = [];
    var clusters = [];
    var currentCluster = [];
    var clusterEnd = -1;

    for (var i = 0; i < sorted.length; i++) {
      var seg = sorted[i];
      if (seg.startTime >= clusterEnd) {
        if (currentCluster.length) clusters.push(currentCluster);
        currentCluster = [];
        columns = [];
        clusterEnd = seg.endTime;
      } else {
        clusterEnd = Math.max(clusterEnd, seg.endTime);
      }

      var placedCol = -1;
      for (var c = 0; c < columns.length; c++) {
        if (columns[c] <= seg.startTime) {
          placedCol = c;
          columns[c] = seg.endTime;
          break;
        }
      }
      if (placedCol < 0) {
        placedCol = columns.length;
        columns.push(seg.endTime);
      }

      seg._col = placedCol;
      seg._cluster = currentCluster;
      currentCluster.push(seg);
    }
    if (currentCluster.length) clusters.push(currentCluster);

    for (var cl = 0; cl < clusters.length; cl++) {
      var maxCols = 1;
      for (var k = 0; k < clusters[cl].length; k++) {
        if (clusters[cl][k]._col + 1 > maxCols) maxCols = clusters[cl][k]._col + 1;
      }
      for (var m = 0; m < clusters[cl].length; m++) {
        clusters[cl][m]._cols = maxCols;
      }
    }

    return sorted;
  }

  function renderCalendar(root) {
    var cal = App.state.getUi().calendar;
    var settings = App.state.getSettings();
    var entries = App.state.getEntries();
    var activeTimer = App.state.getActiveTimer();
    var pMap = App.state.getProjectsMap();

    var anchor = new Date(cal.anchorDate);
    var days = [];
    if (cal.mode === 'day') {
      days.push(App.utils.startOfDay(anchor));
    } else {
      var weekStart = App.utils.startOfWeek(anchor, settings.weekStartsOn);
      for (var d = 0; d < 7; d++) days.push(App.utils.addDays(weekStart, d));
    }

    var rangeStart = days[0].getTime();
    var rangeEnd = App.utils.endOfDay(days[days.length - 1]).getTime();

    // Split entries into daily segments
    var segmentsByDay = {};
    for (var k = 0; k < days.length; k++) segmentsByDay[App.utils.toDateKey(days[k])] = [];

    var visibleTotalMs = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.endTime <= rangeStart || e.startTime > rangeEnd) continue;
      var segs = App.utils.splitEntryByDay(e);
      for (var s = 0; s < segs.length; s++) {
        var sg = segs[s];
        if (segmentsByDay[sg.dateKey]) {
          segmentsByDay[sg.dateKey].push({
            entry: e,
            isLive: false,
            dateKey: sg.dateKey,
            dayStart: sg.dayStart,
            startTime: sg.startTime,
            endTime: sg.endTime,
            duration: sg.duration
          });
          visibleTotalMs += sg.duration;
        }
      }
    }

    if (activeTimer) {
      var liveEnd = Math.max(activeTimer.startTime + 60000, Date.now());
      var liveSegs = App.utils.splitEntryByDay({ startTime: activeTimer.startTime, endTime: liveEnd });
      for (var ls = 0; ls < liveSegs.length; ls++) {
        var lsg = liveSegs[ls];
        if (segmentsByDay[lsg.dateKey]) {
          segmentsByDay[lsg.dateKey].push({
            entry: activeTimer,
            isLive: true,
            dateKey: lsg.dateKey,
            dayStart: lsg.dayStart,
            startTime: lsg.startTime,
            endTime: lsg.endTime,
            duration: lsg.duration
          });
        }
      }
    }

    var rangeTitle = cal.mode === 'day'
      ? App.i18n.formatDate(days[0], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : App.i18n.formatDate(days[0], { month: 'short', day: 'numeric' }) + ' – ' + App.i18n.formatDate(days[days.length - 1], { month: 'short', day: 'numeric', year: 'numeric' });

    var gridCols = '56px repeat(' + days.length + ', minmax(0, 1fr))';
    var todayKey = App.utils.toDateKey(new Date());

    var headCells = days.map(function (dayDate) {
      var dKey = App.utils.toDateKey(dayDate);
      var daySegs = segmentsByDay[dKey] || [];
      var dayMs = 0;
      for (var x = 0; x < daySegs.length; x++) {
        if (!daySegs[x].isLive) dayMs += daySegs[x].duration;
      }
      var label = App.i18n.formatDate(dayDate, { weekday: 'short', day: 'numeric' });
      return '<div class="cal-day-head' + (dKey === todayKey ? ' is-today' : '') + '">' +
        '<span class="cal-day-name">' + App.utils.escapeHtml(label) + '</span>' +
        '<span class="cal-day-total mono">' + App.utils.escapeHtml(dayMs > 0 ? App.utils.formatDuration(dayMs, settings.durationFormat) : '') + '</span>' +
        '</div>';
    }).join('');

    var hourLabelsHtml = '';
    for (var h = 0; h < 24; h++) {
      var lbl = h === 0 ? '' : App.utils.formatTimeOfDay(new Date(2020, 0, 1, h, 0).getTime(), settings.timeFormat);
      hourLabelsHtml += '<div class="cal-hour-label mono" style="top:' + (h * HOUR_PX) + 'px;">' + App.utils.escapeHtml(lbl) + '</div>';
    }

    var linesHtml = '';
    for (var hl = 0; hl < 24; hl++) {
      linesHtml += '<div class="cal-hour-line" style="top:' + (hl * HOUR_PX) + 'px;"></div>';
      linesHtml += '<div class="cal-half-line" style="top:' + (hl * HOUR_PX + HOUR_PX / 2) + 'px;"></div>';
    }

    var now = new Date();
    var nowMins = now.getHours() * 60 + now.getMinutes();

    var colsHtml = days.map(function (dayDate) {
      var dKey = App.utils.toDateKey(dayDate);
      var placed = layoutOverlaps(segmentsByDay[dKey] || []);
      var blocksHtml = '';

      for (var b = 0; b < placed.length; b++) {
        var seg = placed[b];
        var startMin = (seg.startTime - seg.dayStart) / 60000;
        var durMin = Math.max(15, (seg.endTime - seg.startTime) / 60000);
        var topPx = (startMin / 60) * HOUR_PX;
        var heightPx = Math.max(18, (durMin / 60) * HOUR_PX);
        var widthPct = 100 / seg._cols;
        var leftPct = seg._col * widthPct;

        var proj = seg.entry.projectId ? pMap[seg.entry.projectId] : null;
        var color = proj ? proj.color : '#64748b';
        var bg = App.utils.hexToRgba(color, 0.14);
        var timeLabel = App.utils.formatTimeOfDay(seg.startTime, settings.timeFormat) + '–' + App.utils.formatTimeOfDay(seg.endTime, settings.timeFormat);

        blocksHtml += '<div class="cal-event' + (seg.isLive ? ' is-live' : '') + '" ' +
          (seg.isLive ? '' : 'data-cal-entry="' + App.utils.escapeHtml(seg.entry.id) + '" ') +
          'style="top:' + topPx.toFixed(1) + 'px;height:' + heightPx.toFixed(1) + 'px;left:calc(' + leftPct.toFixed(2) + '% + 2px);width:calc(' + widthPct.toFixed(2) + '% - 4px);background:' + bg + ';border-left-color:' + App.utils.escapeHtml(color) + ';">' +
          '<div class="cal-event-title">' + App.utils.escapeHtml(seg.entry.description || App.i18n.t('common.untitledTask')) + '</div>' +
          (heightPx >= 32 ? '<div class="cal-event-meta mono">' + App.utils.escapeHtml(timeLabel) + (proj ? ' · ' + App.utils.escapeHtml(proj.name) : '') + '</div>' : '') +
          '</div>';
      }

      var nowLine = dKey === todayKey
        ? '<div class="cal-now-line" style="top:' + ((nowMins / 60) * HOUR_PX).toFixed(1) + 'px;"></div>'
        : '';

      return '<div class="cal-day-col' + (dKey === todayKey ? ' is-today' : '') + '" data-cal-day="' + dKey + '">' +
        linesHtml + nowLine + blocksHtml +
        '</div>';
    }).join('');

    root.innerHTML =
      '<div class="view-container view-container-wide">' +
      '<div class="view-header">' +
      '<div class="view-title-group">' +
      '<h1 class="view-title">' + App.utils.escapeHtml(App.i18n.t('calendar.title')) + '</h1>' +
      '<p class="view-subtitle">' + App.utils.escapeHtml(App.i18n.t('calendar.subtitle')) + '</p>' +
      '</div>' +
      '<div class="view-header-actions">' +
      '<span class="muted" style="font-size:12.5px;">' + App.utils.escapeHtml(App.i18n.t('calendar.inViewTotal')) + ': <strong class="mono" style="color:var(--text-primary);">' + App.utils.escapeHtml(App.utils.formatDuration(visibleTotalMs, settings.durationFormat)) + '</strong></span>' +
      '<button type="button" class="btn btn-primary" data-cal-add>' + App.icon('plus', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('calendar.addEntry')) + '</span></button>' +
      '</div>' +
      '</div>' +

      '<div class="cal-toolbar">' +
      '<div class="cal-nav">' +
      '<button type="button" class="btn btn-secondary btn-icon" data-cal-prev>' + App.icon('chevronLeft') + '</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cal-today>' + App.utils.escapeHtml(App.i18n.t('common.today')) + '</button>' +
      '<button type="button" class="btn btn-secondary btn-icon" data-cal-next>' + App.icon('chevronRight') + '</button>' +
      '<span class="cal-range-title">' + App.utils.escapeHtml(rangeTitle) + '</span>' +
      '</div>' +
      '<div class="segmented">' +
      '<button type="button" class="segmented-btn' + (cal.mode === 'week' ? ' is-active' : '') + '" data-cal-mode="week">' + App.utils.escapeHtml(App.i18n.t('calendar.weekView')) + '</button>' +
      '<button type="button" class="segmented-btn' + (cal.mode === 'day' ? ' is-active' : '') + '" data-cal-mode="day">' + App.utils.escapeHtml(App.i18n.t('calendar.dayView')) + '</button>' +
      '</div>' +
      '</div>' +

      '<div class="cal-card">' +
      '<div class="cal-header-row" style="grid-template-columns:' + gridCols + ';">' +
      '<div class="cal-gutter-head"></div>' +
      headCells +
      '</div>' +
      '<div class="cal-scroll" data-cal-scroll>' +
      '<div class="cal-body" style="grid-template-columns:' + gridCols + ';">' +
      '<div class="cal-time-gutter">' + hourLabelsHtml + '</div>' +
      colsHtml +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    wireCalendarEvents(root);
  }

  function wireCalendarEvents(root) {
    var cal = App.state.getUi().calendar;
    var scrollEl = root.querySelector('[data-cal-scroll]');
    if (scrollEl) {
      scrollEl.scrollTop = savedScrollTop;
      scrollEl.addEventListener('scroll', function () {
        savedScrollTop = scrollEl.scrollTop;
      });
    }

    root.querySelector('[data-cal-prev]').addEventListener('click', function () {
      var step = cal.mode === 'day' ? -1 : -7;
      cal.anchorDate = App.utils.addDays(cal.anchorDate, step).getTime();
      renderCalendar(root);
    });
    root.querySelector('[data-cal-next]').addEventListener('click', function () {
      var step = cal.mode === 'day' ? 1 : 7;
      cal.anchorDate = App.utils.addDays(cal.anchorDate, step).getTime();
      renderCalendar(root);
    });
    root.querySelector('[data-cal-today]').addEventListener('click', function () {
      cal.anchorDate = Date.now();
      renderCalendar(root);
    });
    root.querySelector('[data-cal-add]').addEventListener('click', function () {
      App.components.openEntryModal();
    });

    var modeBtns = root.querySelectorAll('[data-cal-mode]');
    for (var m = 0; m < modeBtns.length; m++) {
      modeBtns[m].addEventListener('click', function () {
        cal.mode = this.getAttribute('data-cal-mode');
        renderCalendar(root);
      });
    }

    var entriesMap = {};
    var entries = App.state.getEntries();
    for (var i = 0; i < entries.length; i++) entriesMap[entries[i].id] = entries[i];

    var eventEls = root.querySelectorAll('[data-cal-entry]');
    for (var j = 0; j < eventEls.length; j++) {
      eventEls[j].addEventListener('click', function (evt) {
        evt.stopPropagation();
        var id = this.getAttribute('data-cal-entry');
        if (entriesMap[id]) App.components.openEntryModal({ entry: entriesMap[id] });
      });
    }

    // Click or drag on empty day column to create entry
    var dayCols = root.querySelectorAll('[data-cal-day]');
    for (var c = 0; c < dayCols.length; c++) {
      (function (colEl) {
        colEl.addEventListener('mousedown', function (evt) {
          if (evt.button !== 0 || evt.target.closest('.cal-event')) return;
          var dateKey = colEl.getAttribute('data-cal-day');
          var dayStart = App.utils.parseDateKey(dateKey).getTime();
          var rect = colEl.getBoundingClientRect();

          function yToSnapMin(clientY) {
            var y = Math.max(0, Math.min(rect.height, clientY - rect.top));
            var rawMin = (y / HOUR_PX) * 60;
            return Math.min(1440, Math.max(0, Math.round(rawMin / 15) * 15));
          }

          var startMin = yToSnapMin(evt.clientY);
          var endMin = Math.min(1440, startMin + 60);
          var dragged = false;

          var preview = document.createElement('div');
          preview.className = 'cal-drag-preview mono';
          colEl.appendChild(preview);

          function updatePreview(sM, eM) {
            var top = (sM / 60) * HOUR_PX;
            var h = Math.max(15, ((eM - sM) / 60) * HOUR_PX);
            preview.style.top = top + 'px';
            preview.style.height = h + 'px';
            var fmt = App.state.getSettings().timeFormat;
            preview.textContent = App.utils.formatTimeOfDay(dayStart + sM * 60000, fmt) + ' – ' + App.utils.formatTimeOfDay(dayStart + eM * 60000, fmt);
          }

          updatePreview(startMin, startMin + 15);

          function onMove(moveEvt) {
            var curMin = yToSnapMin(moveEvt.clientY);
            if (Math.abs(curMin - startMin) >= 15) dragged = true;
            var sM = Math.min(startMin, curMin);
            var eM = Math.max(startMin, curMin);
            if (eM - sM < 15) eM = Math.min(1440, sM + 15);
            updatePreview(sM, eM);
          }

          function onUp(upEvt) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (preview.parentNode) preview.parentNode.removeChild(preview);

            var sM = startMin;
            var eM = endMin;
            if (dragged) {
              var curMin = yToSnapMin(upEvt.clientY);
              sM = Math.min(startMin, curMin);
              eM = Math.max(startMin, curMin);
              if (eM - sM < 15) eM = Math.min(1440, sM + 15);
            } else {
              // Snap click to whole or half hour + 1 hour
              sM = Math.floor(startMin / 30) * 30;
              eM = Math.min(1440, sM + 60);
            }

            App.components.openEntryModal({
              startTime: dayStart + sM * 60000,
              endTime: dayStart + eM * 60000
            });
          }

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      })(dayCols[c]);
    }
  }

  App.views.calendar = {
    render: function (root) {
      renderCalendar(root);

      var unsubs = [
        App.state.subscribe('entries:change', function () { renderCalendar(root); }),
        App.state.subscribe('projects:change', function () { renderCalendar(root); }),
        App.state.subscribe('timer:change', function () { renderCalendar(root); }),
        App.state.subscribe('settings:change', function () { renderCalendar(root); })
      ];

      return function cleanup() {
        for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      };
    }
  };
})(window.TimApp);
