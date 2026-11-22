(function (App) {
  'use strict';

  function getTooltipEl() {
    return document.getElementById('chart-tooltip');
  }

  function showTooltip(evt, html) {
    var tip = getTooltipEl();
    if (!tip) return;
    tip.innerHTML = html;
    tip.style.display = 'block';
    var rect = tip.getBoundingClientRect();
    var left = evt.clientX + 14;
    var top = evt.clientY - rect.height / 2;
    if (left + rect.width > window.innerWidth - 10) {
      left = evt.clientX - rect.width - 14;
    }
    if (top < 10) top = 10;
    if (top + rect.height > window.innerHeight - 10) {
      top = window.innerHeight - rect.height - 10;
    }
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTooltip() {
    var tip = getTooltipEl();
    if (tip) tip.style.display = 'none';
  }

  function niceAxisMax(maxHours) {
    if (maxHours <= 0) return 4;
    var candidates = [0.5, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 50, 60, 80, 100, 150, 200, 300, 500];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] >= maxHours * 1.1) return candidates[i];
    }
    return Math.ceil(maxHours / 100) * 100;
  }

  function renderStackedBarChart(container, buckets, options) {
    var opts = options || {};
    var durationFormat = opts.durationFormat || 'hm';
    if (!buckets || !buckets.length) {
      container.innerHTML = '<div class="empty-state" style="padding:36px 16px;"><div class="muted">' +
        App.utils.escapeHtml(App.i18n.t('analytics.noDataPeriod')) + '</div></div>';
      return;
    }

    var width = 820;
    var height = 240;
    var padL = 54;
    var padR = 14;
    var padT = 16;
    var padB = 30;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;

    var maxMs = 0;
    for (var i = 0; i < buckets.length; i++) {
      if (buckets[i].totalMs > maxMs) maxMs = buckets[i].totalMs;
    }
    var maxHours = niceAxisMax(maxMs / 3600000);
    var maxCapMs = maxHours * 3600000;
    var uHour = App.i18n.t('common.unitHour');
    var unitSep = (uHour.length > 1 || /[^\x00-\x7f]/.test(uHour)) ? ' ' : '';

    var svgParts = [
      '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + App.utils.escapeHtml(App.i18n.t('analytics.chartTimeline')) + '">'
    ];

    // Grid lines & Y labels
    var tickCount = 4;
    for (var t = 0; t <= tickCount; t++) {
      var ratio = t / tickCount;
      var y = padT + plotH - ratio * plotH;
      var tickVal = maxHours * ratio;
      var label = (tickVal >= 10 || tickVal === 0 ? Math.round(tickVal) : tickVal.toFixed(1).replace(/\.0$/, '')) + unitSep + uHour;
      svgParts.push(
        '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (width - padR) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-dasharray="' + (t === 0 ? 'none' : '3 3') + '" stroke-width="1"/>'
      );
      svgParts.push(
        '<text x="' + (padL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="var(--text-muted)" class="mono">' + label + '</text>'
      );
    }

    var slotW = plotW / buckets.length;
    var barW = Math.min(34, Math.max(4, slotW * 0.62));
    var labelEvery = buckets.length > 26 ? Math.ceil(buckets.length / 12) : (buckets.length > 14 ? 2 : 1);

    for (var b = 0; b < buckets.length; b++) {
      var bucket = buckets[b];
      var x = padL + b * slotW + (slotW - barW) / 2;
      var curY = padT + plotH;

      // Invisible hover column
      svgParts.push(
        '<rect data-bar-idx="' + b + '" x="' + (padL + b * slotW).toFixed(1) + '" y="' + padT + '" width="' + slotW.toFixed(1) + '" height="' + plotH + '" fill="transparent" style="cursor:pointer;"/>'
      );

      for (var s = 0; s < bucket.segments.length; s++) {
        var seg = bucket.segments[s];
        if (seg.ms <= 0) continue;
        var segH = (seg.ms / maxCapMs) * plotH;
        if (segH < 1.5 && seg.ms > 0) segH = 1.5;
        curY -= segH;
        var isTop = s === bucket.segments.length - 1;
        var rx = isTop && segH >= 4 ? 3 : 0;
        svgParts.push(
          '<rect pointer-events="none" x="' + x.toFixed(1) + '" y="' + curY.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + segH.toFixed(1) + '" rx="' + rx + '" fill="' + App.utils.escapeHtml(seg.color) + '"/>'
        );
      }

      if (b % labelEvery === 0 || b === buckets.length - 1) {
        svgParts.push(
          '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle" font-size="10.5" fill="var(--text-muted)">' + App.utils.escapeHtml(bucket.label) + '</text>'
        );
      }
    }

    svgParts.push('</svg>');
    container.innerHTML = svgParts.join('');

    var hitCols = container.querySelectorAll('[data-bar-idx]');
    for (var h = 0; h < hitCols.length; h++) {
      hitCols[h].addEventListener('mouseenter', function (evt) {
        this.setAttribute('fill', 'var(--bg-hover)');
        this.setAttribute('opacity', '0.55');
        var idx = parseInt(this.getAttribute('data-bar-idx'), 10);
        var bkt = buckets[idx];
        var rows = '';
        for (var k = bkt.segments.length - 1; k >= 0; k--) {
          var sg = bkt.segments[k];
          rows += '<div class="chart-tooltip-row">' +
            '<span class="chart-tooltip-label"><span class="project-dot" style="background:' + App.utils.escapeHtml(sg.color) + '"></span>' +
            '<span>' + App.utils.escapeHtml(sg.name) + '</span></span>' +
            '<span class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(sg.ms, durationFormat)) + '</span>' +
            '</div>';
        }
        showTooltip(evt,
          '<div class="chart-tooltip-title"><span>' + App.utils.escapeHtml(bkt.fullLabel || bkt.label) + '</span>' +
          '<span class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(bkt.totalMs, durationFormat)) + '</span></div>' +
          rows
        );
      });
      hitCols[h].addEventListener('mousemove', function (evt) {
        var idx = parseInt(this.getAttribute('data-bar-idx'), 10);
        var bkt = buckets[idx];
        var tip = getTooltipEl();
        if (tip && tip.style.display === 'block') {
          showTooltip(evt, tip.innerHTML);
        } else if (bkt) {
          this.dispatchEvent(new MouseEvent('mouseenter', evt));
        }
      });
      hitCols[h].addEventListener('mouseleave', function () {
        this.setAttribute('fill', 'transparent');
        this.removeAttribute('opacity');
        hideTooltip();
      });
    }
  }

  function renderDonutChart(container, items, totalMs, options) {
    var opts = options || {};
    var durationFormat = opts.durationFormat || 'hm';
    var size = 160;
    var cx = size / 2;
    var cy = size / 2;
    var r = 58;
    var strokeW = 20;
    var circ = 2 * Math.PI * r;

    if (!items.length || totalMs <= 0) {
      container.innerHTML =
        '<svg viewBox="0 0 ' + size + ' ' + size + '">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg-subtle)" stroke-width="' + strokeW + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="12" fill="var(--text-muted)" class="mono">' + App.utils.escapeHtml(App.i18n.t('common.zeroDuration')) + '</text>' +
        '</svg>';
      return;
    }

    var offset = 0;
    var parts = ['<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + App.utils.escapeHtml(App.i18n.t('analytics.chartProjects')) + '">'];
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg-subtle)" stroke-width="' + strokeW + '"/>');

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var frac = item.ms / totalMs;
      var dashLen = Math.max(2, frac * circ - (items.length > 1 ? 2 : 0));
      var gapLen = circ - dashLen;
      parts.push(
        '<circle data-slice-idx="' + i + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
        'stroke="' + App.utils.escapeHtml(item.color) + '" stroke-width="' + strokeW + '" ' +
        'stroke-dasharray="' + dashLen.toFixed(2) + ' ' + gapLen.toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-offset).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')" style="cursor:pointer;transition:opacity 120ms ease;"/>'
      );
      offset += frac * circ;
    }

    parts.push(
      '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="14" font-weight="600" fill="var(--text-primary)" class="mono">' +
      App.utils.escapeHtml(App.utils.formatDuration(totalMs, durationFormat)) +
      '</text>'
    );
    parts.push('</svg>');
    container.innerHTML = parts.join('');

    var slices = container.querySelectorAll('[data-slice-idx]');
    for (var j = 0; j < slices.length; j++) {
      slices[j].addEventListener('mouseenter', function (evt) {
        var idx = parseInt(this.getAttribute('data-slice-idx'), 10);
        var it = items[idx];
        this.setAttribute('stroke-width', String(strokeW + 3));
        showTooltip(evt,
          '<div class="chart-tooltip-title">' +
          '<span class="chart-tooltip-label"><span class="project-dot" style="background:' + App.utils.escapeHtml(it.color) + '"></span>' +
          '<span>' + App.utils.escapeHtml(it.name) + '</span></span>' +
          '</div>' +
          '<div class="chart-tooltip-row"><span>' + App.utils.escapeHtml(App.utils.formatDuration(it.ms, durationFormat)) + '</span>' +
          '<span class="mono">' + it.percent.toFixed(1) + '%</span></div>'
        );
      });
      slices[j].addEventListener('mousemove', function (evt) {
        var tip = getTooltipEl();
        if (tip && tip.style.display === 'block') showTooltip(evt, tip.innerHTML);
      });
      slices[j].addEventListener('mouseleave', function () {
        this.setAttribute('stroke-width', String(strokeW));
        hideTooltip();
      });
      slices[j].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-slice-idx'), 10);
        if (typeof opts.onSelect === 'function') opts.onSelect(items[idx]);
      });
    }
  }

  function renderActivityHeatmap(container, dailyTotalsMap, options) {
    var opts = options || {};
    var weekStartsOn = opts.weekStartsOn === 0 ? 0 : 1;
    var durationFormat = opts.durationFormat || 'hm';
    var endDate = App.utils.startOfDay(opts.endDate || new Date());
    var startDate = opts.startDate ? App.utils.startOfDay(opts.startDate) : App.utils.addDays(endDate, -364);

    // Align grid start to week boundary
    var gridStart = App.utils.startOfWeek(startDate, weekStartsOn);
    var gridEnd = App.utils.endOfWeek(endDate, weekStartsOn);

    var weeks = [];
    var cursor = new Date(gridStart.getTime());
    var maxDaily = 0;

    while (cursor.getTime() <= gridEnd.getTime()) {
      var weekDays = [];
      for (var d = 0; d < 7; d++) {
        var key = App.utils.toDateKey(cursor);
        var inBounds = cursor.getTime() >= startDate.getTime() && cursor.getTime() <= endDate.getTime();
        var ms = inBounds ? (dailyTotalsMap[key] || 0) : -1;
        if (ms > maxDaily) maxDaily = ms;
        weekDays.push({
          key: key,
          date: new Date(cursor.getTime()),
          ms: ms
        });
        cursor = App.utils.addDays(cursor, 1);
      }
      weeks.push(weekDays);
    }

    var cellSize = 12;
    var gap = 3;
    var step = cellSize + gap;
    var padL = 30;
    var padT = 18;
    var width = padL + weeks.length * step + 4;
    var height = padT + 7 * step + 4;

    var parts = ['<svg viewBox="0 0 ' + width + ' ' + height + '" style="min-width:660px;" role="img" aria-label="' + App.utils.escapeHtml(App.i18n.t('analytics.chartHeatmap')) + '">'];

    // Weekday labels (rows 1, 3, 5)
    for (var row = 0; row < 7; row++) {
      if (row === 1 || row === 3 || row === 5) {
        var sampleDay = weeks[0][row].date;
        parts.push(
          '<text x="' + (padL - 6) + '" y="' + (padT + row * step + 9.5) + '" text-anchor="end" font-size="9.5" fill="var(--text-muted)">' +
          App.utils.escapeHtml(App.i18n.formatDate(sampleDay, { weekday: 'short' }).slice(0, 3)) +
          '</text>'
        );
      }
    }

    // Month labels
    var lastMonth = -1;
    for (var w = 0; w < weeks.length; w++) {
      var firstDay = weeks[w][0].date;
      var m = firstDay.getMonth();
      if (m !== lastMonth && w < weeks.length - 1) {
        lastMonth = m;
        parts.push(
          '<text x="' + (padL + w * step) + '" y="11" font-size="10" fill="var(--text-muted)">' +
          App.utils.escapeHtml(App.i18n.formatDate(firstDay, { month: 'short' })) +
          '</text>'
        );
      }
    }

    function levelColor(ms) {
      if (ms <= 0) return 'var(--heat-0)';
      var ref = Math.max(maxDaily, 3600000);
      var ratio = ms / ref;
      if (ratio <= 0.25) return 'var(--heat-1)';
      if (ratio <= 0.5) return 'var(--heat-2)';
      if (ratio <= 0.75) return 'var(--heat-3)';
      return 'var(--heat-4)';
    }

    for (var wIdx = 0; wIdx < weeks.length; wIdx++) {
      for (var dIdx = 0; dIdx < 7; dIdx++) {
        var cell = weeks[wIdx][dIdx];
        if (cell.ms < 0) continue;
        var x = padL + wIdx * step;
        var y = padT + dIdx * step;
        parts.push(
          '<rect data-heat-key="' + cell.key + '" data-heat-ms="' + cell.ms + '" x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" rx="2.5" fill="' + levelColor(cell.ms) + '" style="cursor:pointer;"/>'
        );
      }
    }

    parts.push('</svg>');
    container.innerHTML = parts.join('');

    var cells = container.querySelectorAll('[data-heat-key]');
    for (var c = 0; c < cells.length; c++) {
      cells[c].addEventListener('mouseenter', function (evt) {
        var key = this.getAttribute('data-heat-key');
        var ms = parseInt(this.getAttribute('data-heat-ms'), 10);
        var label = App.i18n.formatDate(App.utils.parseDateKey(key), { dateStyle: 'medium' });
        showTooltip(evt,
          '<div class="chart-tooltip-title"><span>' + App.utils.escapeHtml(label) + '</span></div>' +
          '<div class="chart-tooltip-row"><span>' + App.utils.escapeHtml(App.i18n.t('common.total')) + '</span>' +
          '<span class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(ms, durationFormat)) + '</span></div>'
        );
      });
      cells[c].addEventListener('mousemove', function (evt) {
        var tip = getTooltipEl();
        if (tip && tip.style.display === 'block') showTooltip(evt, tip.innerHTML);
      });
      cells[c].addEventListener('mouseleave', hideTooltip);
    }
  }

  App.charts = {
    renderStackedBarChart: renderStackedBarChart,
    renderDonutChart: renderDonutChart,
    renderActivityHeatmap: renderActivityHeatmap
  };
})(window.TimApp);
