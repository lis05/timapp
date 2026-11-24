(function (App) {
  'use strict';

  function computeAnalyticsData() {
    var an = App.state.getUi().analytics;
    var settings = App.state.getSettings();
    var allEntries = App.state.getEntries();
    var pMap = App.state.getProjectsMap();
    var tMap = App.state.getTagsMap();

    var range = App.utils.getRangeForPreset(
      an.preset,
      an.anchorDate,
      settings.weekStartsOn,
      an.customStart,
      an.customEnd
    );

    if (an.preset === 'all') {
      if (allEntries.length) {
        var minTs = allEntries[allEntries.length - 1].startTime;
        var maxTs = allEntries[0].endTime;
        for (var x = 0; x < allEntries.length; x++) {
          if (allEntries[x].startTime < minTs) minTs = allEntries[x].startTime;
          if (allEntries[x].endTime > maxTs) maxTs = allEntries[x].endTime;
        }
        range.startMs = App.utils.startOfDay(minTs).getTime();
        range.endMs = App.utils.endOfDay(Math.max(maxTs, Date.now())).getTime();
      } else {
        range.startMs = App.utils.startOfMonth(new Date()).getTime();
        range.endMs = App.utils.endOfDay(new Date()).getTime();
      }
    }

    function matchesFilters(entry) {
      if (an.projectIds.length) {
        var pidKey = entry.projectId || '__none__';
        if (an.projectIds.indexOf(pidKey) < 0) return false;
      }
      if (an.tagIds.length) {
        var matched = false;
        var eTags = entry.tagIds || [];
        for (var i = 0; i < an.tagIds.length; i++) {
          if (eTags.indexOf(an.tagIds[i]) >= 0) {
            matched = true;
            break;
          }
        }
        if (!matched) return false;
      }
      return true;
    }

    var filteredEntries = allEntries.filter(matchesFilters);

    function aggregatePeriod(startMs, endMs) {
      var totalMs = 0;
      var matchedEntries = [];
      var byProject = {};
      var byTag = {};
      var dailyTotals = {};

      for (var i = 0; i < filteredEntries.length; i++) {
        var e = filteredEntries[i];
        var clipped = App.utils.clipEntryToRange(e, startMs, endMs);
        if (clipped <= 0) continue;

        totalMs += clipped;
        matchedEntries.push({ entry: e, clippedMs: clipped });

        var pid = e.projectId && pMap[e.projectId] ? e.projectId : '__none__';
        byProject[pid] = (byProject[pid] || 0) + clipped;

        var eTags = e.tagIds || [];
        for (var t = 0; t < eTags.length; t++) {
          if (tMap[eTags[t]]) {
            byTag[eTags[t]] = (byTag[eTags[t]] || 0) + clipped;
          }
        }

        // Daily split inside clipped window
        var segs = App.utils.splitEntryByDay({
          startTime: Math.max(e.startTime, startMs),
          endTime: Math.min(e.endTime, endMs)
        });
        for (var s = 0; s < segs.length; s++) {
          dailyTotals[segs[s].dateKey] = (dailyTotals[segs[s].dateKey] || 0) + segs[s].duration;
        }
      }

      var activeDays = Object.keys(dailyTotals).filter(function (k) { return dailyTotals[k] > 0; }).length;
      return {
        totalMs: totalMs,
        entries: matchedEntries,
        byProject: byProject,
        byTag: byTag,
        dailyTotals: dailyTotals,
        activeDays: activeDays
      };
    }

    var current = aggregatePeriod(range.startMs, range.endMs);
    var prevRange = App.utils.getPreviousRange(an.preset, range.startMs, range.endMs, settings.weekStartsOn);
    var previous = prevRange ? aggregatePeriod(prevRange.startMs, prevRange.endMs) : null;

    // Total calendar days in span
    var spanDays = Math.max(1, Math.round((App.utils.startOfDay(range.endMs).getTime() - App.utils.startOfDay(range.startMs).getTime()) / App.utils.DAY_MS) + 1);

    // Longest consecutive active-day streak within period
    var longestStreak = 0;
    var curStreak = 0;
    var streakCursor = App.utils.startOfDay(range.startMs);
    var endDayTs = App.utils.startOfDay(range.endMs).getTime();
    while (streakCursor.getTime() <= endDayTs) {
      var k = App.utils.toDateKey(streakCursor);
      if ((current.dailyTotals[k] || 0) > 0) {
        curStreak++;
        if (curStreak > longestStreak) longestStreak = curStreak;
      } else {
        curStreak = 0;
      }
      streakCursor = App.utils.addDays(streakCursor, 1);
    }

    // Build stacked bar buckets
    var buckets = buildBuckets(an.preset, range.startMs, range.endMs, spanDays, current.entries, pMap, settings);

    // Project breakdown list
    var projectItems = Object.keys(current.byProject).map(function (pid) {
      var p = pid === '__none__' ? null : pMap[pid];
      var ms = current.byProject[pid];
      return {
        id: pid,
        name: p ? p.name : App.i18n.t('common.noProject'),
        color: p ? p.color : '#64748b',
        ms: ms,
        percent: current.totalMs > 0 ? (ms / current.totalMs) * 100 : 0
      };
    }).sort(function (a, b) { return b.ms - a.ms; });

    // Tag breakdown list
    var tagItems = Object.keys(current.byTag).map(function (tid) {
      var t = tMap[tid];
      var ms = current.byTag[tid];
      return {
        id: tid,
        name: t ? t.name : '',
        ms: ms,
        percent: current.totalMs > 0 ? (ms / current.totalMs) * 100 : 0
      };
    }).sort(function (a, b) { return b.ms - a.ms; });

    // Heatmap totals (all filtered entries over trailing 365 days or selected year)
    var heatEnd = an.preset === 'year' ? App.utils.endOfYear(range.startMs) : new Date();
    var heatStart = an.preset === 'year' ? App.utils.startOfYear(range.startMs) : App.utils.addDays(heatEnd, -364);
    var heatData = aggregatePeriod(heatStart.getTime(), heatEnd.getTime());

    return {
      range: range,
      spanDays: spanDays,
      current: current,
      previous: previous,
      longestStreak: longestStreak,
      buckets: buckets,
      projectItems: projectItems,
      tagItems: tagItems,
      heatStart: heatStart,
      heatEnd: heatEnd,
      heatDailyTotals: heatData.dailyTotals
    };
  }

  function buildBuckets(preset, startMs, endMs, spanDays, matchedEntries, pMap, settings) {
    var mode = 'day';
    if (preset === 'day') mode = 'hour';
    else if (preset === 'year' || preset === 'all' || spanDays > 180) mode = 'month';
    else if (spanDays > 45) mode = 'week';

    var buckets = [];
    var bucketMap = {};

    if (mode === 'hour') {
      var dayBase = App.utils.startOfDay(startMs).getTime();
      for (var h = 0; h < 24; h++) {
        var bStart = dayBase + h * 3600000;
        var bEnd = bStart + 3599999;
        var hLbl = settings.timeFormat === '12h' ? ((h % 12 || 12) + (h >= 12 ? 'p' : 'a')) : App.utils.pad2(h);
        var bObj = { key: String(h), label: hLbl, fullLabel: App.utils.formatTimeOfDay(bStart, settings.timeFormat), startMs: bStart, endMs: bEnd, totalMs: 0, byProj: {}, segments: [] };
        buckets.push(bObj);
        bucketMap[bObj.key] = bObj;
      }
    } else if (mode === 'day') {
      var dCur = App.utils.startOfDay(startMs);
      var dEnd = App.utils.startOfDay(endMs).getTime();
      while (dCur.getTime() <= dEnd) {
        var dKey = App.utils.toDateKey(dCur);
        var shortLbl = spanDays <= 7
          ? App.i18n.formatDate(dCur, { weekday: 'short' })
          : String(dCur.getDate());
        var dObj = {
          key: dKey,
          label: shortLbl,
          fullLabel: App.i18n.formatDate(dCur, { weekday: 'short', month: 'short', day: 'numeric' }),
          startMs: dCur.getTime(),
          endMs: App.utils.endOfDay(dCur).getTime(),
          totalMs: 0,
          byProj: {},
          segments: []
        };
        buckets.push(dObj);
        bucketMap[dKey] = dObj;
        dCur = App.utils.addDays(dCur, 1);
      }
    } else if (mode === 'week') {
      var wCur = App.utils.startOfWeek(startMs, settings.weekStartsOn);
      while (wCur.getTime() <= endMs) {
        var wEnd = App.utils.endOfWeek(wCur, settings.weekStartsOn);
        var wKey = App.utils.toDateKey(wCur);
        var wLbl = App.i18n.formatDate(wCur, { month: 'short', day: 'numeric' });
        var wObj = {
          key: wKey,
          label: wLbl,
          fullLabel: wLbl + ' – ' + App.i18n.formatDate(wEnd, { month: 'short', day: 'numeric' }),
          startMs: Math.max(startMs, wCur.getTime()),
          endMs: Math.min(endMs, wEnd.getTime()),
          totalMs: 0,
          byProj: {},
          segments: []
        };
        buckets.push(wObj);
        bucketMap[wKey] = wObj;
        wCur = App.utils.addDays(wCur, 7);
      }
    } else {
      var mCur = App.utils.startOfMonth(startMs);
      while (mCur.getTime() <= endMs) {
        var mEnd = App.utils.endOfMonth(mCur);
        var mKey = mCur.getFullYear() + '-' + App.utils.pad2(mCur.getMonth() + 1);
        var mLbl = App.i18n.formatDate(mCur, { month: 'short' });
        var mObj = {
          key: mKey,
          label: mLbl,
          fullLabel: App.i18n.formatDate(mCur, { month: 'long', year: 'numeric' }),
          startMs: Math.max(startMs, mCur.getTime()),
          endMs: Math.min(endMs, mEnd.getTime()),
          totalMs: 0,
          byProj: {},
          segments: []
        };
        buckets.push(mObj);
        bucketMap[mKey] = mObj;
        mCur = App.utils.addMonths(mCur, 1);
      }
    }

    for (var i = 0; i < matchedEntries.length; i++) {
      var entry = matchedEntries[i].entry;
      var pid = entry.projectId && pMap[entry.projectId] ? entry.projectId : '__none__';
      for (var b = 0; b < buckets.length; b++) {
        var bkt = buckets[b];
        if (entry.endTime <= bkt.startMs || entry.startTime > bkt.endMs) continue;
        var clip = App.utils.clipEntryToRange(entry, bkt.startMs, bkt.endMs);
        if (clip > 0) {
          bkt.totalMs += clip;
          bkt.byProj[pid] = (bkt.byProj[pid] || 0) + clip;
        }
      }
    }

    for (var k = 0; k < buckets.length; k++) {
      var bk = buckets[k];
      var pids = Object.keys(bk.byProj);
      pids.sort(function (a, b) { return bk.byProj[b] - bk.byProj[a]; });
      bk.segments = pids.map(function (pid) {
        var p = pid === '__none__' ? null : pMap[pid];
        return {
          projectId: pid,
          name: p ? p.name : App.i18n.t('common.noProject'),
          color: p ? p.color : '#64748b',
          ms: bk.byProj[pid]
        };
      });
    }

    return buckets;
  }

  function formatDeltaPill(curVal, prevVal) {
    if (prevVal === null || prevVal === undefined) return '';
    if (prevVal === 0 && curVal === 0) return '<span class="delta-pill delta-flat">0%</span>';
    if (prevVal === 0) return '<span class="delta-pill delta-up">+100%</span>';
    var pct = Math.round(((curVal - prevVal) / prevVal) * 100);
    if (pct > 0) return '<span class="delta-pill delta-up">+' + pct + '%</span>';
    if (pct < 0) return '<span class="delta-pill delta-down">' + pct + '%</span>';
    return '<span class="delta-pill delta-flat">0%</span>';
  }

  function renderAnalytics(root) {
    var an = App.state.getUi().analytics;
    var settings = App.state.getSettings();
    var pMap = App.state.getProjectsMap();
    var tMap = App.state.getTagsMap();
    var data = computeAnalyticsData();

    var rangeLabel = '';
    if (an.preset === 'day') {
      rangeLabel = App.i18n.formatDate(data.range.startMs, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } else if (an.preset === 'month') {
      rangeLabel = App.i18n.formatDate(data.range.startMs, { month: 'long', year: 'numeric' });
    } else if (an.preset === 'year') {
      rangeLabel = String(new Date(data.range.startMs).getFullYear());
    } else if (an.preset === 'all') {
      rangeLabel = App.i18n.t('analytics.presetAll');
    } else {
      rangeLabel = App.i18n.formatDate(data.range.startMs, { month: 'short', day: 'numeric' }) + ' – ' +
        App.i18n.formatDate(data.range.endMs, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    var dailyAvgMs = data.current.totalMs / data.spanDays;
    var prevAvgMs = data.previous ? (data.previous.totalMs / data.spanDays) : null;
    var topProj = data.projectItems.length ? data.projectItems[0] : null;
    var hasFilters = an.projectIds.length > 0 || an.tagIds.length > 0;

    var presets = [
      { id: 'day', label: App.i18n.t('analytics.presetDay') },
      { id: 'week', label: App.i18n.t('analytics.presetWeek') },
      { id: 'month', label: App.i18n.t('analytics.presetMonth') },
      { id: 'year', label: App.i18n.t('analytics.presetYear') },
      { id: 'all', label: App.i18n.t('analytics.presetAll') },
      { id: 'custom', label: App.i18n.t('analytics.presetCustom') }
    ];

    var projBreakdownHtml = data.projectItems.length
      ? data.projectItems.map(function (it) {
        var isFiltered = an.projectIds.indexOf(it.id) >= 0;
        return '<div class="breakdown-item' + (isFiltered ? ' is-filtered' : '') + '" data-toggle-proj="' + App.utils.escapeHtml(it.id) + '">' +
          '<div class="breakdown-top">' +
          '<span class="breakdown-name"><span class="project-dot" style="background:' + App.utils.escapeHtml(it.color) + '"></span><span style="color:' + App.utils.escapeHtml(it.color) + ';">' + App.utils.escapeHtml(it.name) + '</span></span>' +
          '<span class="breakdown-metrics mono"><span>' + App.utils.escapeHtml(App.utils.formatDuration(it.ms, settings.durationFormat)) + '</span><span class="muted">' + it.percent.toFixed(0) + '%</span></span>' +
          '</div>' +
          '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:' + it.percent.toFixed(1) + '%;background:' + App.utils.escapeHtml(it.color) + ';"></div></div>' +
          '</div>';
      }).join('')
      : '<div class="muted" style="font-size:13px;">' + App.utils.escapeHtml(App.i18n.t('analytics.noDataPeriod')) + '</div>';

    var tagBreakdownHtml = data.tagItems.length
      ? data.tagItems.map(function (it) {
        var isFiltered = an.tagIds.indexOf(it.id) >= 0;
        return '<div class="breakdown-item' + (isFiltered ? ' is-filtered' : '') + '" data-toggle-tag="' + App.utils.escapeHtml(it.id) + '">' +
          '<div class="breakdown-top">' +
          '<span class="breakdown-name">' + App.icon('tag', 'icon-sm') + '<span>' + App.utils.escapeHtml(it.name) + '</span></span>' +
          '<span class="breakdown-metrics mono"><span>' + App.utils.escapeHtml(App.utils.formatDuration(it.ms, settings.durationFormat)) + '</span><span class="muted">' + it.percent.toFixed(0) + '%</span></span>' +
          '</div>' +
          '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:' + it.percent.toFixed(1) + '%;background:var(--accent);"></div></div>' +
          '</div>';
      }).join('')
      : '<div class="muted" style="font-size:13px;padding:24px 0;text-align:center;">' + App.utils.escapeHtml(App.i18n.t('analytics.noTagsPeriod')) + '</div>';

    // Sort report rows
    var sortedRows = data.current.entries.slice().sort(function (a, b) {
      var mul = an.sortDir === 'asc' ? 1 : -1;
      if (an.sortKey === 'duration') return (a.clippedMs - b.clippedMs) * mul;
      if (an.sortKey === 'description') return (a.entry.description || '').localeCompare(b.entry.description || '') * mul;
      if (an.sortKey === 'project') {
        var pa = a.entry.projectId && pMap[a.entry.projectId] ? pMap[a.entry.projectId].name : '';
        var pb = b.entry.projectId && pMap[b.entry.projectId] ? pMap[b.entry.projectId].name : '';
        return pa.localeCompare(pb) * mul;
      }
      return (a.entry.startTime - b.entry.startTime) * mul;
    });

    var tableBodyHtml = sortedRows.length
      ? sortedRows.map(function (item) {
        var e = item.entry;
        var p = e.projectId ? pMap[e.projectId] : null;
        var tagNames = (e.tagIds || []).map(function (id) { return tMap[id] ? tMap[id].name : null; }).filter(Boolean);
        return '<tr data-report-entry="' + App.utils.escapeHtml(e.id) + '">' +
          '<td class="mono">' + App.utils.escapeHtml(App.utils.toDateKey(e.startTime)) + '</td>' +
          '<td>' + App.utils.escapeHtml(e.description || App.i18n.t('common.untitledTask')) + '</td>' +
          '<td>' + (p ? '<span class="project-badge" style="color:' + App.utils.escapeHtml(p.color) + ';"><span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span>' + App.utils.escapeHtml(p.name) + '</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td>' + (tagNames.length ? tagNames.map(function (n) { return '<span class="tag-pill">' + App.utils.escapeHtml(n) + '</span>'; }).join(' ') : '<span class="muted">—</span>') + '</td>' +
          '<td class="mono muted">' + App.utils.escapeHtml(App.utils.formatTimeOfDay(e.startTime, settings.timeFormat) + '–' + App.utils.formatTimeOfDay(e.endTime, settings.timeFormat)) + '</td>' +
          '<td class="mono" style="text-align:right;font-weight:600;">' + App.utils.escapeHtml(App.utils.formatDuration(item.clippedMs, settings.durationFormat)) + '</td>' +
          '</tr>';
      }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:28px;" class="muted">' + App.utils.escapeHtml(App.i18n.t('analytics.noDataPeriod')) + '</td></tr>';

    root.innerHTML =
      '<div class="view-container view-container-wide">' +
      '<div class="view-header">' +
      '<div class="view-title-group">' +
      '<h1 class="view-title">' + App.utils.escapeHtml(App.i18n.t('analytics.title')) + '</h1>' +
      '<p class="view-subtitle">' + App.utils.escapeHtml(App.i18n.t('analytics.subtitle')) + '</p>' +
      '</div>' +
      '<div class="view-header-actions">' +
      '<button type="button" class="btn btn-secondary" data-export-csv>' + App.icon('download', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('analytics.exportCsv')) + '</span></button>' +
      '</div>' +
      '</div>' +

      '<div class="analytics-controls">' +
      '<div class="analytics-controls-left">' +
      '<div class="segmented">' +
      presets.map(function (pr) {
        return '<button type="button" class="segmented-btn' + (an.preset === pr.id ? ' is-active' : '') + '" data-an-preset="' + pr.id + '">' + App.utils.escapeHtml(pr.label) + '</button>';
      }).join('') +
      '</div>' +
      (an.preset === 'custom'
        ? '<input type="date" class="input input-sm mono" data-custom-start value="' + App.utils.escapeHtml(an.customStart) + '">' +
          '<span class="muted">–</span>' +
          '<input type="date" class="input input-sm mono" data-custom-end value="' + App.utils.escapeHtml(an.customEnd) + '">'
        : (an.preset !== 'all'
          ? '<button type="button" class="btn btn-secondary btn-icon btn-sm" data-an-prev>' + App.icon('chevronLeft', 'icon-sm') + '</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-an-today>' + App.utils.escapeHtml(App.i18n.t('common.today')) + '</button>' +
            '<button type="button" class="btn btn-secondary btn-icon btn-sm" data-an-next>' + App.icon('chevronRight', 'icon-sm') + '</button>'
          : '') +
          '<span class="analytics-date-badge">' + App.utils.escapeHtml(rangeLabel) + '</span>') +
      '</div>' +

      '<div class="analytics-controls-right">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-an-filter-proj>' + App.icon('filter', 'icon-sm') + '<span>' + App.utils.escapeHtml(an.projectIds.length ? App.i18n.t('analytics.filterProjectsCount', { count: an.projectIds.length }) : App.i18n.t('common.projects')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-an-filter-tag>' + App.icon('tag', 'icon-sm') + '<span>' + App.utils.escapeHtml(an.tagIds.length ? App.i18n.t('analytics.filterTagsCount', { count: an.tagIds.length }) : App.i18n.t('common.tags')) + '</span></button>' +
      (hasFilters ? '<button type="button" class="btn btn-ghost btn-sm" data-an-clear-filters>' + App.utils.escapeHtml(App.i18n.t('common.clearAll')) + '</button>' : '') +
      '</div>' +
      '</div>' +

      '<div class="kpi-grid">' +
      '<div class="card kpi-card">' +
      '<span class="kpi-label">' + App.utils.escapeHtml(App.i18n.t('analytics.kpiTotalTime')) + '</span>' +
      '<div class="kpi-value-row"><span class="kpi-value mono">' + App.utils.escapeHtml(App.utils.formatDuration(data.current.totalMs, settings.durationFormat)) + '</span>' + formatDeltaPill(data.current.totalMs, data.previous ? data.previous.totalMs : null) + '</div>' +
      '<span class="kpi-sub">' + (data.previous ? App.utils.escapeHtml(App.i18n.t('analytics.vsPrevious') + ': ' + App.utils.formatDuration(data.previous.totalMs, settings.durationFormat)) : '&nbsp;') + '</span>' +
      '</div>' +

      '<div class="card kpi-card">' +
      '<span class="kpi-label">' + App.utils.escapeHtml(App.i18n.t('analytics.kpiDailyAvg')) + '</span>' +
      '<div class="kpi-value-row"><span class="kpi-value mono">' + App.utils.escapeHtml(App.utils.formatDuration(dailyAvgMs, settings.durationFormat)) + '</span>' + formatDeltaPill(dailyAvgMs, prevAvgMs) + '</div>' +
      '<span class="kpi-sub">' + App.utils.escapeHtml(App.i18n.t('analytics.daysUnit', { count: data.spanDays })) + '</span>' +
      '</div>' +

      '<div class="card kpi-card">' +
      '<span class="kpi-label">' + App.utils.escapeHtml(App.i18n.t('analytics.kpiEntries')) + '</span>' +
      '<div class="kpi-value-row"><span class="kpi-value mono">' + data.current.entries.length + '</span>' + formatDeltaPill(data.current.entries.length, data.previous ? data.previous.entries.length : null) + '</div>' +
      '<span class="kpi-sub">' + App.utils.escapeHtml(App.i18n.t('analytics.activeDaysSub', { days: data.current.activeDays })) + '</span>' +
      '</div>' +

      '<div class="card kpi-card">' +
      '<span class="kpi-label">' + App.utils.escapeHtml(App.i18n.t('analytics.kpiTopProject')) + '</span>' +
      '<div class="kpi-value-row"><span class="kpi-value" style="font-size:17px;">' + (topProj ? '<span class="project-dot" style="background:' + App.utils.escapeHtml(topProj.color) + ';margin-right:6px;"></span><span style="color:' + App.utils.escapeHtml(topProj.color) + ';">' + App.utils.escapeHtml(topProj.name) + '</span>' : '—') + '</span></div>' +
      '<span class="kpi-sub mono">' + (topProj ? App.utils.escapeHtml(App.utils.formatDuration(topProj.ms, settings.durationFormat) + ' (' + topProj.percent.toFixed(0) + '%)') : '&nbsp;') + '</span>' +
      '</div>' +

      '<div class="card kpi-card">' +
      '<span class="kpi-label">' + App.utils.escapeHtml(App.i18n.t('analytics.kpiStreak')) + '</span>' +
      '<div class="kpi-value-row"><span class="kpi-value mono">' + App.utils.escapeHtml(App.i18n.t('analytics.daysUnit', { count: data.longestStreak })) + '</span></div>' +
      '<span class="kpi-sub">&nbsp;</span>' +
      '</div>' +
      '</div>' +

      '<div class="charts-grid">' +
      '<div class="card chart-card chart-card-full">' +
      '<div class="chart-header">' +
      '<div><div class="chart-title">' + App.utils.escapeHtml(App.i18n.t('analytics.chartTimeline')) + '</div><div class="chart-subtitle">' + App.utils.escapeHtml(App.i18n.t('analytics.chartTimelineSub')) + '</div></div>' +
      '</div>' +
      '<div class="chart-svg-wrap" data-chart-bar></div>' +
      '</div>' +

      '<div class="card chart-card">' +
      '<div class="chart-header"><div class="chart-title">' + App.utils.escapeHtml(App.i18n.t('analytics.chartProjects')) + '</div></div>' +
      '<div class="donut-layout">' +
      '<div class="chart-svg-wrap" data-chart-donut></div>' +
      '<div class="breakdown-list">' + projBreakdownHtml + '</div>' +
      '</div>' +
      '</div>' +

      '<div class="card chart-card">' +
      '<div class="chart-header"><div class="chart-title">' + App.utils.escapeHtml(App.i18n.t('analytics.chartTags')) + '</div></div>' +
      '<div class="breakdown-list">' + tagBreakdownHtml + '</div>' +
      '</div>' +

      '<div class="card chart-card chart-card-full">' +
      '<div class="chart-header">' +
      '<div><div class="chart-title">' + App.utils.escapeHtml(App.i18n.t('analytics.chartHeatmap')) + '</div><div class="chart-subtitle">' + App.utils.escapeHtml(App.i18n.t('analytics.chartHeatmapSub')) + '</div></div>' +
      '<div class="heatmap-legend">' +
      '<span>' + App.utils.escapeHtml(App.i18n.t('analytics.heatmapLess')) + '</span>' +
      '<span class="heatmap-legend-cell" style="background:var(--heat-0);"></span>' +
      '<span class="heatmap-legend-cell" style="background:var(--heat-1);"></span>' +
      '<span class="heatmap-legend-cell" style="background:var(--heat-2);"></span>' +
      '<span class="heatmap-legend-cell" style="background:var(--heat-3);"></span>' +
      '<span class="heatmap-legend-cell" style="background:var(--heat-4);"></span>' +
      '<span>' + App.utils.escapeHtml(App.i18n.t('analytics.heatmapMore')) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="chart-svg-wrap" data-chart-heatmap></div>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="settings-card-header">' +
      '<span class="settings-card-title">' + App.utils.escapeHtml(App.i18n.t('analytics.reportTitle')) + '</span>' +
      '<span class="muted" style="font-size:12px;">' + App.utils.escapeHtml(App.i18n.t('analytics.reportCount', { count: sortedRows.length })) + '</span>' +
      '</div>' +
      '<div class="table-wrap">' +
      '<table class="data-table">' +
      '<thead><tr>' +
      '<th class="is-sortable" data-sort="startTime">' + App.utils.escapeHtml(App.i18n.t('analytics.colDate')) + '</th>' +
      '<th class="is-sortable" data-sort="description">' + App.utils.escapeHtml(App.i18n.t('analytics.colTask')) + '</th>' +
      '<th class="is-sortable" data-sort="project">' + App.utils.escapeHtml(App.i18n.t('analytics.colProject')) + '</th>' +
      '<th>' + App.utils.escapeHtml(App.i18n.t('analytics.colTags')) + '</th>' +
      '<th>' + App.utils.escapeHtml(App.i18n.t('analytics.colTime')) + '</th>' +
      '<th class="is-sortable" data-sort="duration" style="text-align:right;">' + App.utils.escapeHtml(App.i18n.t('analytics.colDuration')) + '</th>' +
      '</tr></thead>' +
      '<tbody>' + tableBodyHtml + '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>' +
      '</div>';

    // Render SVG Charts
    App.charts.renderStackedBarChart(root.querySelector('[data-chart-bar]'), data.buckets, { durationFormat: settings.durationFormat });
    App.charts.renderDonutChart(root.querySelector('[data-chart-donut]'), data.projectItems, data.current.totalMs, {
      durationFormat: settings.durationFormat,
      onSelect: function (item) {
        toggleArrayFilter(an.projectIds, item.id);
        renderAnalytics(root);
      }
    });
    App.charts.renderActivityHeatmap(root.querySelector('[data-chart-heatmap]'), data.heatDailyTotals, {
      startDate: data.heatStart,
      endDate: data.heatEnd,
      weekStartsOn: settings.weekStartsOn,
      durationFormat: settings.durationFormat
    });

    wireAnalyticsEvents(root, data);
  }

  function toggleArrayFilter(arr, id) {
    var idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
  }

  function wireAnalyticsEvents(root, data) {
    var an = App.state.getUi().analytics;
    var settings = App.state.getSettings();

    var presetBtns = root.querySelectorAll('[data-an-preset]');
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].addEventListener('click', function () {
        an.preset = this.getAttribute('data-an-preset');
        renderAnalytics(root);
      });
    }

    var prevBtn = root.querySelector('[data-an-prev]');
    var nextBtn = root.querySelector('[data-an-next]');
    var todayBtn = root.querySelector('[data-an-today]');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () { stepAnchor(-1); renderAnalytics(root); });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () { stepAnchor(1); renderAnalytics(root); });
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', function () { an.anchorDate = Date.now(); renderAnalytics(root); });
    }

    function stepAnchor(dir) {
      var d = new Date(an.anchorDate);
      if (an.preset === 'day') an.anchorDate = App.utils.addDays(d, dir).getTime();
      else if (an.preset === 'week') an.anchorDate = App.utils.addDays(d, dir * 7).getTime();
      else if (an.preset === 'month') an.anchorDate = App.utils.addMonths(d, dir).getTime();
      else if (an.preset === 'year') {
        d.setFullYear(d.getFullYear() + dir);
        an.anchorDate = d.getTime();
      }
    }

    var cs = root.querySelector('[data-custom-start]');
    var ce = root.querySelector('[data-custom-end]');
    if (cs) cs.addEventListener('change', function () { an.customStart = cs.value; renderAnalytics(root); });
    if (ce) ce.addEventListener('change', function () { an.customEnd = ce.value; renderAnalytics(root); });

    var projFilterBtn = root.querySelector('[data-an-filter-proj]');
    projFilterBtn.addEventListener('click', function () {
      App.components.openPopover(projFilterBtn, function (pop) {
        var projs = App.state.getProjects();
        var items = [{ id: '__none__', name: App.i18n.t('common.noProject'), color: '#64748b' }].concat(projs);
        pop.innerHTML = '<div class="popover-list">' + items.map(function (p) {
          var sel = an.projectIds.indexOf(p.id) >= 0;
          return '<button type="button" class="popover-item' + (sel ? ' is-selected' : '') + '" data-pop-pid="' + App.utils.escapeHtml(p.id) + '">' +
            '<span class="popover-item-left"><span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span><span class="popover-item-label">' + App.utils.escapeHtml(p.name) + '</span></span>' +
            (sel ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }).join('') + '</div>';

        var btns = pop.querySelectorAll('[data-pop-pid]');
        for (var k = 0; k < btns.length; k++) {
          btns[k].addEventListener('click', function () {
            toggleArrayFilter(an.projectIds, this.getAttribute('data-pop-pid'));
            App.components.closePopover();
            renderAnalytics(root);
          });
        }
      });
    });

    var tagFilterBtn = root.querySelector('[data-an-filter-tag]');
    tagFilterBtn.addEventListener('click', function () {
      App.components.openPopover(tagFilterBtn, function (pop) {
        var tags = App.state.getTags();
        if (!tags.length) {
          pop.innerHTML = '<div class="popover-empty">' + App.utils.escapeHtml(App.i18n.t('manage.noTagsTitle')) + '</div>';
          return;
        }
        pop.innerHTML = '<div class="popover-list">' + tags.map(function (t) {
          var sel = an.tagIds.indexOf(t.id) >= 0;
          return '<button type="button" class="popover-item' + (sel ? ' is-selected' : '') + '" data-pop-tid="' + App.utils.escapeHtml(t.id) + '">' +
            '<span class="popover-item-left">' + App.icon('tag', 'icon-sm') + '<span class="popover-item-label">' + App.utils.escapeHtml(t.name) + '</span></span>' +
            (sel ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }).join('') + '</div>';

        var btns = pop.querySelectorAll('[data-pop-tid]');
        for (var k = 0; k < btns.length; k++) {
          btns[k].addEventListener('click', function () {
            toggleArrayFilter(an.tagIds, this.getAttribute('data-pop-tid'));
            App.components.closePopover();
            renderAnalytics(root);
          });
        }
      });
    });

    var clearBtn = root.querySelector('[data-an-clear-filters]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        an.projectIds = [];
        an.tagIds = [];
        renderAnalytics(root);
      });
    }

    var toggleProjs = root.querySelectorAll('[data-toggle-proj]');
    for (var tp = 0; tp < toggleProjs.length; tp++) {
      toggleProjs[tp].addEventListener('click', function () {
        toggleArrayFilter(an.projectIds, this.getAttribute('data-toggle-proj'));
        renderAnalytics(root);
      });
    }

    var toggleTags = root.querySelectorAll('[data-toggle-tag]');
    for (var tt = 0; tt < toggleTags.length; tt++) {
      toggleTags[tt].addEventListener('click', function () {
        toggleArrayFilter(an.tagIds, this.getAttribute('data-toggle-tag'));
        renderAnalytics(root);
      });
    }

    var sortHeaders = root.querySelectorAll('[data-sort]');
    for (var sh = 0; sh < sortHeaders.length; sh++) {
      sortHeaders[sh].addEventListener('click', function () {
        var key = this.getAttribute('data-sort');
        if (an.sortKey === key) an.sortDir = an.sortDir === 'asc' ? 'desc' : 'asc';
        else {
          an.sortKey = key;
          an.sortDir = 'desc';
        }
        renderAnalytics(root);
      });
    }

    var entriesMap = {};
    var allEntries = App.state.getEntries();
    for (var e = 0; e < allEntries.length; e++) entriesMap[allEntries[e].id] = allEntries[e];

    var rowEls = root.querySelectorAll('[data-report-entry]');
    for (var r = 0; r < rowEls.length; r++) {
      rowEls[r].addEventListener('click', function () {
        var id = this.getAttribute('data-report-entry');
        if (entriesMap[id]) App.components.openEntryModal({ entry: entriesMap[id] });
      });
    }

    root.querySelector('[data-export-csv]').addEventListener('click', function () {
      var list = data.current.entries.map(function (item) { return item.entry; });
      var csv = App.utils.entriesToCsv(list, App.state.getProjectsMap(), App.state.getTagsMap(), settings);
      var fname = 'timapp-report-' + App.utils.toDateKey(new Date()) + '.csv';
      App.utils.downloadFile(fname, csv, 'text/csv;charset=utf-8');
      App.components.showToast(App.i18n.t('toasts.exportedCsv'));
    });
  }

  App.views.analytics = {
    render: function (root) {
      renderAnalytics(root);

      var unsubs = [
        App.state.subscribe('entries:change', function () { renderAnalytics(root); }),
        App.state.subscribe('projects:change', function () { renderAnalytics(root); }),
        App.state.subscribe('tags:change', function () { renderAnalytics(root); }),
        App.state.subscribe('settings:change', function () { renderAnalytics(root); })
      ];

      return function cleanup() {
        for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      };
    }
  };
})(window.TimApp);
