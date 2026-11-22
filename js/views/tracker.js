(function (App) {
  'use strict';

  var manualState = {
    dateKey: App.utils.toDateKey(new Date()),
    startStr: '09:00',
    endStr: '10:00'
  };

  function getTrackerValues() {
    var active = App.state.getActiveTimer();
    var draft = App.state.getUi().trackerDraft;
    return active || draft;
  }

  function buildAutocompleteItems(query) {
    var entries = App.state.getEntries();
    var q = (query || '').trim().toLowerCase();
    var seen = {};
    var out = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var desc = (e.description || '').trim();
      if (!desc) continue;
      var key = desc.toLowerCase() + '|' + (e.projectId || '');
      if (seen[key]) continue;
      if (!q || desc.toLowerCase().indexOf(q) >= 0) {
        seen[key] = true;
        out.push(e);
        if (out.length >= 8) break;
      }
    }
    return out;
  }

  function renderTrackerBar(container) {
    var ui = App.state.getUi();
    var active = App.state.getActiveTimer();
    var isRunning = Boolean(active);
    var mode = isRunning ? 'timer' : ui.trackerMode;
    var vals = getTrackerValues();
    var projectsMap = App.state.getProjectsMap();
    var tagsMap = App.state.getTagsMap();
    var proj = vals.projectId ? projectsMap[vals.projectId] : null;
    var selectedTags = (vals.tagIds || []).map(function (id) { return tagsMap[id]; }).filter(Boolean);

    var elapsedText = isRunning
      ? App.utils.formatClockDuration(Date.now() - active.startTime)
      : '00:00:00';

    var manualDurationMs = 3600000;
    if (mode === 'manual') {
      var msStart = App.utils.combineDateAndTime(manualState.dateKey, manualState.startStr);
      var msEnd = App.utils.combineDateAndTime(manualState.dateKey, manualState.endStr);
      if (!isNaN(msStart) && !isNaN(msEnd)) {
        if (msEnd < msStart) msEnd += App.utils.DAY_MS;
        manualDurationMs = msEnd - msStart;
      }
    }

    var tagsBarHtml = '';
    if (selectedTags.length) {
      var chipsHtml = selectedTags.map(function (t) {
        return '<span class="tag-pill">' + App.utils.escapeHtml(t.name) +
          '<button type="button" class="tag-pill-remove" data-remove-bar-tag="' + App.utils.escapeHtml(t.id) + '" aria-label="' + App.utils.escapeHtml(App.i18n.t('common.remove')) + '">' +
          App.icon('x', 'icon-sm') + '</button></span>';
      }).join('');
      tagsBarHtml = '<div class="tracker-bar-tags"><div class="tracker-selected-tags">' + chipsHtml + '</div></div>';
    }

    container.innerHTML =
      '<div class="tracker-bar' + (isRunning ? ' is-running' : '') + '">' +
      '<div class="tracker-bar-main">' +
      '<div class="tracker-task-wrap">' +
      '<input type="text" class="tracker-task-input" data-tracker-task value="' + App.utils.escapeHtml(vals.description || '') + '" placeholder="' + App.utils.escapeHtml(App.i18n.t('tracker.taskPlaceholder')) + '" autocomplete="off">' +
      '<div class="tracker-autocomplete" data-tracker-ac></div>' +
      '</div>' +

      '<button type="button" class="tracker-picker-btn' + (proj ? ' has-value' : '') + '" data-bar-proj>' +
      (proj
        ? '<span class="project-dot" style="background:' + App.utils.escapeHtml(proj.color) + '"></span><span class="tracker-picker-label">' + App.utils.escapeHtml(proj.name) + '</span>'
        : App.icon('folder', 'icon-sm') + '<span class="tracker-picker-label">' + App.utils.escapeHtml(App.i18n.t('tracker.selectProject')) + '</span>') +
      '</button>' +

      '<button type="button" class="tracker-picker-btn' + (selectedTags.length ? ' has-value' : '') + '" data-bar-tags>' +
      App.icon('tag', 'icon-sm') +
      '<span class="tracker-picker-label">' + App.utils.escapeHtml(App.i18n.t('tracker.selectTags')) + (selectedTags.length ? ' (' + selectedTags.length + ')' : '') + '</span>' +
      '</button>' +

      '<span class="tracker-divider"></span>' +

      (mode === 'timer'
        ? '<div class="tracker-clock mono' + (isRunning ? ' is-clickable' : '') + '" data-live-timer="bar" title="' + (isRunning ? App.utils.escapeHtml(App.i18n.t('tracker.adjustStartTime')) : '') + '">' + elapsedText + '</div>' +
          (isRunning
            ? '<button type="button" class="btn btn-danger" data-stop-timer>' + App.icon('stop', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('tracker.stopTimer')) + '</span></button>' +
              '<button type="button" class="btn btn-ghost btn-icon" data-discard-timer title="' + App.utils.escapeHtml(App.i18n.t('tracker.discardTimer')) + '">' + App.icon('x') + '</button>'
            : '<button type="button" class="btn btn-primary" data-start-timer>' + App.icon('play', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('tracker.startTimer')) + '</span></button>')
        : '<div class="tracker-manual-controls">' +
          '<input type="date" class="input mono tracker-manual-date" data-manual-date value="' + App.utils.escapeHtml(manualState.dateKey) + '">' +
          '<input type="time" class="input mono tracker-manual-time" data-manual-start value="' + App.utils.escapeHtml(manualState.startStr) + '">' +
          '<span class="muted">–</span>' +
          '<input type="time" class="input mono tracker-manual-time" data-manual-end value="' + App.utils.escapeHtml(manualState.endStr) + '">' +
          '<input type="text" class="input mono tracker-manual-dur" data-manual-dur value="' + App.utils.escapeHtml(App.utils.formatClockDuration(manualDurationMs)) + '">' +
          '<button type="button" class="btn btn-primary" data-manual-add>' + App.icon('plus', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('common.add')) + '</span></button>' +
          '</div>') +

      (!isRunning
        ? '<div class="segmented" role="tablist">' +
          '<button type="button" class="segmented-btn' + (mode === 'timer' ? ' is-active' : '') + '" data-mode="timer" title="' + App.utils.escapeHtml(App.i18n.t('tracker.modeTimer')) + '">' + App.icon('clock', 'icon-sm') + '</button>' +
          '<button type="button" class="segmented-btn' + (mode === 'manual' ? ' is-active' : '') + '" data-mode="manual" title="' + App.utils.escapeHtml(App.i18n.t('tracker.modeManual')) + '">' + App.icon('plus', 'icon-sm') + '</button>' +
          '</div>'
        : '') +
      '</div>' +
      tagsBarHtml +
      '</div>';

    wireTrackerBarEvents(container);
  }

  function wireTrackerBarEvents(container) {
    var ui = App.state.getUi();
    var taskInput = container.querySelector('[data-tracker-task]');
    var acBox = container.querySelector('[data-tracker-ac]');
    var projBtn = container.querySelector('[data-bar-proj]');
    var tagsBtn = container.querySelector('[data-bar-tags]');

    function updateDraftOrLive(patch) {
      if (App.state.getActiveTimer()) {
        App.state.updateActiveTimer(patch);
      } else {
        Object.assign(ui.trackerDraft, patch);
      }
    }

    function renderAutocomplete() {
      var items = buildAutocompleteItems(taskInput.value);
      if (!items.length) {
        acBox.classList.remove('is-open');
        acBox.innerHTML = '';
        return;
      }
      var pMap = App.state.getProjectsMap();
      var html = '<div class="muted" style="font-size:11px;padding:4px 8px;">' + App.utils.escapeHtml(App.i18n.t('tracker.recentTasksHeader')) + '</div>';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var p = it.projectId ? pMap[it.projectId] : null;
        html += '<button type="button" class="popover-item" data-ac-idx="' + i + '">' +
          '<span class="popover-item-left">' +
          (p ? '<span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span>' : '') +
          '<span class="popover-item-label">' + App.utils.escapeHtml(it.description) + '</span>' +
          '</span>' +
          (p ? '<span class="muted" style="font-size:11.5px;">' + App.utils.escapeHtml(p.name) + '</span>' : '') +
          '</button>';
      }
      acBox.innerHTML = html;
      acBox.classList.add('is-open');

      var btns = acBox.querySelectorAll('[data-ac-idx]');
      for (var j = 0; j < btns.length; j++) {
        btns[j].addEventListener('mousedown', function (e) {
          e.preventDefault();
          var idx = parseInt(this.getAttribute('data-ac-idx'), 10);
          var chosen = items[idx];
          if (!chosen) return;
          var patch = { description: chosen.description };
          var cur = getTrackerValues();
          if (!cur.projectId && chosen.projectId) patch.projectId = chosen.projectId;
          if ((!cur.tagIds || !cur.tagIds.length) && chosen.tagIds && chosen.tagIds.length) {
            patch.tagIds = chosen.tagIds.slice();
          }
          updateDraftOrLive(patch);
          acBox.classList.remove('is-open');
          renderTrackerBar(container);
        });
      }
    }

    var saveLiveDebounced = App.utils.debounce(function (val) {
      if (App.state.getActiveTimer()) {
        App.state.updateActiveTimer({ description: val });
      }
    }, 250);

    taskInput.addEventListener('input', function () {
      if (App.state.getActiveTimer()) {
        App.state.getActiveTimer().description = taskInput.value;
        saveLiveDebounced(taskInput.value);
      } else {
        ui.trackerDraft.description = taskInput.value;
      }
      renderAutocomplete();
    });

    taskInput.addEventListener('focus', renderAutocomplete);
    taskInput.addEventListener('blur', function () {
      setTimeout(function () { acBox.classList.remove('is-open'); }, 150);
    });

    taskInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        acBox.classList.remove('is-open');
        if (App.state.getActiveTimer()) {
          App.state.updateActiveTimer({ description: taskInput.value });
          taskInput.blur();
        } else if (ui.trackerMode === 'timer') {
          App.state.startTimer(ui.trackerDraft);
        } else {
          var addBtn = container.querySelector('[data-manual-add]');
          if (addBtn) addBtn.click();
        }
      } else if (e.key === 'Escape') {
        acBox.classList.remove('is-open');
      }
    });

    projBtn.addEventListener('click', function () {
      var vals = getTrackerValues();
      App.components.openProjectPicker(projBtn, vals.projectId, function (pid) {
        updateDraftOrLive({ projectId: pid });
        renderTrackerBar(container);
      });
    });

    tagsBtn.addEventListener('click', function () {
      var vals = getTrackerValues();
      App.components.openTagPicker(tagsBtn, vals.tagIds, function (ids) {
        updateDraftOrLive({ tagIds: ids });
        renderTrackerBar(container);
      });
    });

    var removeTagBtns = container.querySelectorAll('[data-remove-bar-tag]');
    for (var r = 0; r < removeTagBtns.length; r++) {
      removeTagBtns[r].addEventListener('click', function () {
        var tid = this.getAttribute('data-remove-bar-tag');
        var cur = getTrackerValues();
        var next = (cur.tagIds || []).filter(function (id) { return id !== tid; });
        updateDraftOrLive({ tagIds: next });
        renderTrackerBar(container);
      });
    }

    var startBtn = container.querySelector('[data-start-timer]');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        App.state.startTimer(ui.trackerDraft).then(function () {
          App.components.showToast(App.i18n.t('toasts.timerStarted'));
        });
      });
    }

    var stopBtn = container.querySelector('[data-stop-timer]');
    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        App.state.stopTimer();
      });
    }

    var discardBtn = container.querySelector('[data-discard-timer]');
    if (discardBtn) {
      discardBtn.addEventListener('click', function () {
        App.state.discardTimer().then(function () {
          App.components.showToast(App.i18n.t('toasts.timerDiscarded'));
        });
      });
    }

    var liveClock = container.querySelector('[data-live-timer="bar"]');
    if (liveClock && App.state.getActiveTimer()) {
      liveClock.addEventListener('click', function () {
        var active = App.state.getActiveTimer();
        App.components.openPopover(liveClock, function (pop, close) {
          var currentStart = App.utils.toTimeInput(active.startTime);
          pop.innerHTML =
            '<div class="field" style="padding:4px;">' +
            '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.startLabel')) + '</label>' +
            '<div style="display:flex;gap:6px;">' +
            '<input type="time" class="input input-sm mono" data-adjust-start value="' + App.utils.escapeHtml(currentStart) + '">' +
            '<button type="button" class="btn btn-primary btn-sm" data-save-start>' + App.utils.escapeHtml(App.i18n.t('common.save')) + '</button>' +
            '</div></div>';
          var inp = pop.querySelector('[data-adjust-start]');
          pop.querySelector('[data-save-start]').addEventListener('click', function () {
            var newTs = App.utils.combineDateAndTime(App.utils.toDateKey(active.startTime), inp.value);
            if (!isNaN(newTs) && newTs <= Date.now()) {
              App.state.updateActiveTimer({ startTime: newTs });
              close();
            }
          });
          setTimeout(function () { inp.focus(); }, 0);
        });
      });
    }

    var modeBtns = container.querySelectorAll('[data-mode]');
    for (var m = 0; m < modeBtns.length; m++) {
      modeBtns[m].addEventListener('click', function () {
        ui.trackerMode = this.getAttribute('data-mode');
        renderTrackerBar(container);
      });
    }

    // Manual mode inputs
    var mDate = container.querySelector('[data-manual-date]');
    var mStart = container.querySelector('[data-manual-start]');
    var mEnd = container.querySelector('[data-manual-end]');
    var mDur = container.querySelector('[data-manual-dur]');
    var mAdd = container.querySelector('[data-manual-add]');

    if (mAdd) {
      function syncManualDur() {
        var s = App.utils.combineDateAndTime(mDate.value, mStart.value);
        var e = App.utils.combineDateAndTime(mDate.value, mEnd.value);
        if (!isNaN(s) && !isNaN(e)) {
          if (e < s) e += App.utils.DAY_MS;
          mDur.value = App.utils.formatClockDuration(e - s);
        }
      }

      mDate.addEventListener('change', function () { manualState.dateKey = mDate.value; });
      mStart.addEventListener('change', function () { manualState.startStr = mStart.value; syncManualDur(); });
      mEnd.addEventListener('change', function () { manualState.endStr = mEnd.value; syncManualDur(); });
      mDur.addEventListener('change', function () {
        var parsed = App.utils.parseDurationInput(mDur.value);
        var s = App.utils.combineDateAndTime(mDate.value, mStart.value);
        if (parsed != null && !isNaN(s)) {
          manualState.endStr = App.utils.toTimeInput(s + parsed);
          mEnd.value = manualState.endStr;
          mDur.value = App.utils.formatClockDuration(parsed);
        }
      });

      mAdd.addEventListener('click', function () {
        var s = App.utils.combineDateAndTime(mDate.value, mStart.value);
        var e = App.utils.combineDateAndTime(mDate.value, mEnd.value);
        if (isNaN(s) || isNaN(e)) {
          App.components.showToast(App.i18n.t('entryModal.invalidTimeError'), { type: 'error' });
          return;
        }
        if (e < s) e += App.utils.DAY_MS;
        if (e === s) e = s + 60000;
        App.state.addEntry({
          description: ui.trackerDraft.description,
          projectId: ui.trackerDraft.projectId,
          tagIds: ui.trackerDraft.tagIds.slice(),
          startTime: s,
          endTime: e,
          notes: ''
        }).then(function () {
          ui.trackerDraft = { description: '', projectId: null, tagIds: [], notes: '' };
          App.components.showToast(App.i18n.t('toasts.entryAdded'));
          renderTrackerBar(container);
        });
      });
    }
  }

  function getFilteredEntries() {
    var entries = App.state.getEntries();
    var filter = App.state.getUi().trackerFilter;
    var pMap = App.state.getProjectsMap();
    var tMap = App.state.getTagsMap();
    var q = (filter.search || '').trim().toLowerCase();

    return entries.filter(function (e) {
      if (filter.projectId !== 'all') {
        if (filter.projectId === 'none' && e.projectId) return false;
        if (filter.projectId !== 'none' && e.projectId !== filter.projectId) return false;
      }
      if (filter.tagId !== 'all') {
        if (!e.tagIds || e.tagIds.indexOf(filter.tagId) < 0) return false;
      }
      if (q) {
        var projName = e.projectId && pMap[e.projectId] ? pMap[e.projectId].name.toLowerCase() : '';
        var tagText = (e.tagIds || []).map(function (id) { return tMap[id] ? tMap[id].name.toLowerCase() : ''; }).join(' ');
        var hay = (e.description || '').toLowerCase() + ' ' + (e.notes || '').toLowerCase() + ' ' + projName + ' ' + tagText;
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderTrackerList(listWrap) {
    var allEntries = App.state.getEntries();
    var filter = App.state.getUi().trackerFilter;
    var settings = App.state.getSettings();
    var projects = App.state.getProjects();
    var tags = App.state.getTags();
    var pMap = App.state.getProjectsMap();
    var tMap = App.state.getTagsMap();

    var filtered = getFilteredEntries();
    var hasActiveFilter = Boolean(filter.search || filter.projectId !== 'all' || filter.tagId !== 'all');

    // Week total
    var weekStart = App.utils.startOfWeek(new Date(), settings.weekStartsOn).getTime();
    var weekEnd = App.utils.endOfWeek(new Date(), settings.weekStartsOn).getTime();
    var weekTotalMs = 0;
    for (var w = 0; w < allEntries.length; w++) {
      weekTotalMs += App.utils.clipEntryToRange(allEntries[w], weekStart, weekEnd);
    }

    var filteredTotalMs = 0;
    for (var f = 0; f < filtered.length; f++) {
      filteredTotalMs += Math.max(0, filtered[f].endTime - filtered[f].startTime);
    }

    var projOptions = '<option value="all">' + App.utils.escapeHtml(App.i18n.t('tracker.filterAllProjects')) + '</option>' +
      '<option value="none"' + (filter.projectId === 'none' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('common.noProject')) + '</option>' +
      projects.map(function (p) {
        return '<option value="' + App.utils.escapeHtml(p.id) + '"' + (filter.projectId === p.id ? ' selected' : '') + '>' + App.utils.escapeHtml(p.name) + '</option>';
      }).join('');

    var tagOptions = '<option value="all">' + App.utils.escapeHtml(App.i18n.t('tracker.filterAllTags')) + '</option>' +
      tags.map(function (t) {
        return '<option value="' + App.utils.escapeHtml(t.id) + '"' + (filter.tagId === t.id ? ' selected' : '') + '>' + App.utils.escapeHtml(t.name) + '</option>';
      }).join('');

    var toolbarHtml =
      '<div class="tracker-toolbar">' +
      '<div class="tracker-filters">' +
      '<div class="search-input-wrap">' +
      App.icon('search', 'icon-sm') +
      '<input type="text" class="input" data-filter-search value="' + App.utils.escapeHtml(filter.search) + '" placeholder="' + App.utils.escapeHtml(App.i18n.t('tracker.filterSearchPlaceholder')) + '">' +
      '</div>' +
      '<select class="select select-sm" data-filter-proj>' + projOptions + '</select>' +
      '<select class="select select-sm" data-filter-tag>' + tagOptions + '</select>' +
      (hasActiveFilter ? '<button type="button" class="btn btn-ghost btn-sm" data-clear-filters>' + App.utils.escapeHtml(App.i18n.t('common.clearAll')) + '</button>' : '') +
      '</div>' +
      '<div class="tracker-summary">' +
      (hasActiveFilter
        ? '<span>' + App.utils.escapeHtml(App.i18n.t('tracker.filteredTotal')) + ': <strong class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(filteredTotalMs, settings.durationFormat)) + '</strong></span>'
        : '') +
      '<span>' + App.utils.escapeHtml(App.i18n.t('tracker.thisWeekTotal')) + ': <strong class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(weekTotalMs, settings.durationFormat)) + '</strong></span>' +
      '</div>' +
      '</div>';

    if (!filtered.length) {
      listWrap.innerHTML = toolbarHtml +
        '<div class="card empty-state">' +
        '<div class="empty-state-icon">' + App.icon(hasActiveFilter ? 'search' : 'clock', 'icon-lg') + '</div>' +
        '<div class="empty-state-title">' + App.utils.escapeHtml(App.i18n.t(hasActiveFilter ? 'tracker.emptyFilteredTitle' : 'tracker.emptyTitle')) + '</div>' +
        '<div class="empty-state-desc">' + App.utils.escapeHtml(App.i18n.t(hasActiveFilter ? 'tracker.emptyFilteredDesc' : 'tracker.emptyDesc')) + '</div>' +
        '</div>';
      wireFilterEvents(listWrap);
      return;
    }

    // Group entries by dateKey
    var dayKeys = [];
    var groupsMap = {};
    for (var i = 0; i < filtered.length; i++) {
      var entry = filtered[i];
      var dKey = App.utils.toDateKey(entry.startTime);
      if (!groupsMap[dKey]) {
        groupsMap[dKey] = { key: dKey, entries: [], totalMs: 0 };
        dayKeys.push(dKey);
      }
      groupsMap[dKey].entries.push(entry);
      groupsMap[dKey].totalMs += Math.max(0, entry.endTime - entry.startTime);
    }

    var visibleDayKeys = dayKeys.slice(0, filter.daysLimit);
    var groupsHtml = '<div class="day-groups">';

    for (var g = 0; g < visibleDayKeys.length; g++) {
      var grp = groupsMap[visibleDayKeys[g]];
      groupsHtml += '<div class="day-group">' +
        '<div class="day-group-header">' +
        '<span class="day-group-date">' + App.utils.escapeHtml(App.utils.formatDayHeading(grp.key)) + '</span>' +
        '<span class="day-group-total mono">' + App.utils.escapeHtml(App.utils.formatDuration(grp.totalMs, settings.durationFormat)) + '</span>' +
        '</div>';

      for (var r = 0; r < grp.entries.length; r++) {
        var e = grp.entries[r];
        var p = e.projectId ? pMap[e.projectId] : null;
        var entryTags = (e.tagIds || []).map(function (id) { return tMap[id]; }).filter(Boolean);
        var durMs = Math.max(0, e.endTime - e.startTime);
        var timeRangeText = App.utils.formatTimeOfDay(e.startTime, settings.timeFormat) + ' – ' + App.utils.formatTimeOfDay(e.endTime, settings.timeFormat);

        groupsHtml += '<div class="entry-row" data-entry-id="' + App.utils.escapeHtml(e.id) + '">' +
          '<div class="entry-main">' +
          '<button type="button" class="entry-title-btn' + (!e.description ? ' is-untitled' : '') + '" data-inline-title title="' + App.utils.escapeHtml(App.i18n.t('tracker.clickToEdit')) + '">' +
          App.utils.escapeHtml(e.description || App.i18n.t('common.untitledTask')) +
          '</button>' +
          (e.notes ? '<span class="entry-notes-indicator" title="' + App.utils.escapeHtml(e.notes) + '">' + App.icon('note', 'icon-sm') + '</span>' : '') +
          '</div>' +

          '<div class="entry-project-cell">' +
          '<button type="button" class="entry-project-trigger' + (p ? ' has-project' : '') + '" data-row-proj>' +
          (p
            ? '<span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span><span>' + App.utils.escapeHtml(p.name) + '</span>'
            : '<span class="muted">+ ' + App.utils.escapeHtml(App.i18n.t('common.project')) + '</span>') +
          '</button>' +
          '</div>' +

          '<div class="entry-tags-cell">' +
          entryTags.map(function (t) { return '<span class="tag-pill">' + App.utils.escapeHtml(t.name) + '</span>'; }).join('') +
          '<button type="button" class="entry-tags-trigger" data-row-tags title="' + App.utils.escapeHtml(App.i18n.t('common.tags')) + '">' +
          App.icon('tag', 'icon-sm') + (entryTags.length ? '' : '<span>+</span>') +
          '</button>' +
          '</div>' +

          '<div class="entry-time-cell">' +
          '<button type="button" class="entry-range-btn mono" data-row-edit>' + App.utils.escapeHtml(timeRangeText) + '</button>' +
          '<span class="entry-duration mono">' + App.utils.escapeHtml(App.utils.formatDuration(durMs, settings.durationFormat)) + '</span>' +
          '</div>' +

          '<div class="entry-actions">' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" data-row-continue title="' + App.utils.escapeHtml(App.i18n.t('tracker.continueTask')) + '">' + App.icon('play', 'icon-sm') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" data-row-edit title="' + App.utils.escapeHtml(App.i18n.t('common.edit')) + '">' + App.icon('edit', 'icon-sm') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-icon-sm" data-row-dup title="' + App.utils.escapeHtml(App.i18n.t('common.duplicate')) + '">' + App.icon('copy', 'icon-sm') + '</button>' +
          '<button type="button" class="btn btn-danger-ghost btn-icon-sm" data-row-del title="' + App.utils.escapeHtml(App.i18n.t('common.delete')) + '">' + App.icon('trash', 'icon-sm') + '</button>' +
          '</div>' +
          '</div>';
      }

      groupsHtml += '</div>';
    }

    groupsHtml += '</div>';

    if (dayKeys.length > visibleDayKeys.length) {
      groupsHtml += '<div style="display:flex;justify-content:center;padding-top:6px;">' +
        '<button type="button" class="btn btn-secondary" data-load-more>' + App.utils.escapeHtml(App.i18n.t('common.loadMore')) + '</button>' +
        '</div>';
    }

    listWrap.innerHTML = toolbarHtml + groupsHtml;
    wireFilterEvents(listWrap);
    wireRowEvents(listWrap);
  }

  function wireFilterEvents(listWrap) {
    var filter = App.state.getUi().trackerFilter;
    var searchInput = listWrap.querySelector('[data-filter-search]');
    var projSel = listWrap.querySelector('[data-filter-proj]');
    var tagSel = listWrap.querySelector('[data-filter-tag]');
    var clearBtn = listWrap.querySelector('[data-clear-filters]');
    var loadMoreBtn = listWrap.querySelector('[data-load-more]');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var pos = searchInput.selectionStart;
        filter.search = searchInput.value;
        renderTrackerList(listWrap);
        var nextInput = listWrap.querySelector('[data-filter-search]');
        if (nextInput) {
          nextInput.focus();
          try { nextInput.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
    if (projSel) {
      projSel.addEventListener('change', function () {
        filter.projectId = projSel.value;
        renderTrackerList(listWrap);
      });
    }
    if (tagSel) {
      tagSel.addEventListener('change', function () {
        filter.tagId = tagSel.value;
        renderTrackerList(listWrap);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        filter.search = '';
        filter.projectId = 'all';
        filter.tagId = 'all';
        renderTrackerList(listWrap);
      });
    }
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        filter.daysLimit += 30;
        renderTrackerList(listWrap);
      });
    }
  }

  function wireRowEvents(listWrap) {
    var entriesMap = {};
    var entries = App.state.getEntries();
    for (var i = 0; i < entries.length; i++) entriesMap[entries[i].id] = entries[i];

    var rows = listWrap.querySelectorAll('[data-entry-id]');
    for (var r = 0; r < rows.length; r++) {
      (function (rowEl) {
        var id = rowEl.getAttribute('data-entry-id');
        var entry = entriesMap[id];
        if (!entry) return;

        var titleBtn = rowEl.querySelector('[data-inline-title]');
        titleBtn.addEventListener('click', function () {
          var input = document.createElement('input');
          input.type = 'text';
          input.className = 'input entry-inline-input';
          input.value = entry.description || '';
          titleBtn.replaceWith(input);
          input.focus();
          input.select();

          var committed = false;
          function commit(save) {
            if (committed) return;
            committed = true;
            var nextVal = input.value.trim();
            if (save && nextVal !== (entry.description || '')) {
              App.state.updateEntry(id, { description: nextVal }).then(function () {
                App.components.showToast(App.i18n.t('toasts.entryUpdated'));
              });
            } else {
              renderTrackerList(listWrap);
            }
          }

          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); commit(true); }
            else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
          });
          input.addEventListener('blur', function () { commit(true); });
        });

        var projBtn = rowEl.querySelector('[data-row-proj]');
        projBtn.addEventListener('click', function () {
          App.components.openProjectPicker(projBtn, entry.projectId, function (pid) {
            App.state.updateEntry(id, { projectId: pid });
          });
        });

        var tagsBtn = rowEl.querySelector('[data-row-tags]');
        tagsBtn.addEventListener('click', function () {
          App.components.openTagPicker(tagsBtn, entry.tagIds, function (ids) {
            App.state.updateEntry(id, { tagIds: ids });
          });
        });

        var editBtns = rowEl.querySelectorAll('[data-row-edit]');
        for (var eIdx = 0; eIdx < editBtns.length; eIdx++) {
          editBtns[eIdx].addEventListener('click', function () {
            App.components.openEntryModal({ entry: entry });
          });
        }

        rowEl.querySelector('[data-row-continue]').addEventListener('click', function () {
          App.state.startTimer({
            description: entry.description,
            projectId: entry.projectId,
            tagIds: (entry.tagIds || []).slice(),
            notes: entry.notes || ''
          }).then(function () {
            App.components.showToast(App.i18n.t('toasts.timerStarted'));
          });
        });

        rowEl.querySelector('[data-row-dup]').addEventListener('click', function () {
          App.state.duplicateEntry(id).then(function () {
            App.components.showToast(App.i18n.t('toasts.entryDuplicated'));
          });
        });

        rowEl.querySelector('[data-row-del]').addEventListener('click', function () {
          var settings = App.state.getSettings();
          function performDelete() {
            App.state.deleteEntry(id).then(function (removed) {
              if (removed) {
                App.components.showToast(App.i18n.t('toasts.entryDeleted'), {
                  actionLabel: App.i18n.t('toasts.undo'),
                  onAction: function () {
                    App.state.restoreEntry(removed);
                    App.components.showToast(App.i18n.t('toasts.entryRestored'));
                  }
                });
              }
            });
          }

          if (settings.confirmDelete) {
            var durText = App.utils.formatDuration(entry.endTime - entry.startTime, settings.durationFormat);
            App.components.openConfirmModal({
              title: App.i18n.t('tracker.confirmDeleteTitle'),
              message: App.i18n.t('tracker.confirmDeleteMessage', {
                title: entry.description || App.i18n.t('common.untitledTask'),
                duration: durText
              }),
              confirmLabel: App.i18n.t('common.delete'),
              danger: true,
              onConfirm: performDelete
            });
          } else {
            performDelete();
          }
        });
      })(rows[r]);
    }
  }

  App.views.tracker = {
    render: function (root) {
      root.innerHTML =
        '<div class="view-container">' +
        '<div data-tracker-bar-host></div>' +
        '<div data-tracker-list-host style="display:flex;flex-direction:column;gap:14px;"></div>' +
        '</div>';

      var barHost = root.querySelector('[data-tracker-bar-host]');
      var listHost = root.querySelector('[data-tracker-list-host]');

      renderTrackerBar(barHost);
      renderTrackerList(listHost);

      var unsubs = [
        App.state.subscribe('timer:change', function () { renderTrackerBar(barHost); }),
        App.state.subscribe('entries:change', function () { renderTrackerList(listHost); }),
        App.state.subscribe('projects:change', function () {
          renderTrackerBar(barHost);
          renderTrackerList(listHost);
        }),
        App.state.subscribe('tags:change', function () {
          renderTrackerBar(barHost);
          renderTrackerList(listHost);
        }),
        App.state.subscribe('settings:change', function () {
          renderTrackerBar(barHost);
          renderTrackerList(listHost);
        })
      ];

      return function cleanup() {
        for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      };
    }
  };
})(window.TimApp);
