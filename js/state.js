(function (App) {
  'use strict';

  var DEFAULT_SETTINGS = {
    theme: 'system',
    language: 'en',
    timeFormat: '24h',
    weekStartsOn: 1,
    durationFormat: 'hms',
    showTimerInTitle: true,
    confirmDelete: true,
    defaultView: 'tracker'
  };

  var listeners = {};
  var tickInterval = null;
  var mediaQuery = null;

  var data = {
    entries: [],
    projects: [],
    tags: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
    activeTimer: null
  };

  var ui = {
    currentView: 'tracker',
    trackerMode: 'timer',
    trackerDraft: {
      description: '',
      projectId: null,
      tagIds: [],
      notes: ''
    },
    trackerFilter: {
      search: '',
      projectId: 'all',
      tagId: 'all',
      daysLimit: 30
    },
    calendar: {
      mode: 'week',
      anchorDate: new Date().getTime()
    },
    analytics: {
      preset: 'week',
      anchorDate: new Date().getTime(),
      customStart: App.utils.toDateKey(App.utils.addDays(new Date(), -13)),
      customEnd: App.utils.toDateKey(new Date()),
      projectIds: [],
      tagIds: [],
      sortKey: 'startTime',
      sortDir: 'desc'
    },
    manage: {
      tab: 'projects',
      showArchived: false
    }
  };

  function emit(event, payload) {
    var list = listeners[event] || [];
    for (var i = 0; i < list.length; i++) {
      list[i](payload);
    }
    if (event !== 'change' && event !== 'timer:tick') {
      var all = listeners.change || [];
      for (var j = 0; j < all.length; j++) {
        all[j]({ event: event, payload: payload });
      }
    }
  }

  function resolveTheme(themePref) {
    if (themePref === 'dark' || themePref === 'light' || themePref === 'clockify' || themePref === 'clockify-dark') {
      return themePref;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  function applyTheme(themePref) {
    var resolved = resolveTheme(themePref);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', resolved);
    }
    try {
      window.localStorage.setItem('timapp_theme_cache', themePref);
    } catch (e) {
      // ignore
    }
  }

  function updateDocumentTitle() {
    if (typeof document === 'undefined') return;
    if (data.activeTimer && data.settings.showTimerInTitle) {
      var elapsed = Date.now() - data.activeTimer.startTime;
      var clock = App.utils.formatClockDuration(elapsed);
      var task = data.activeTimer.description ? data.activeTimer.description : App.i18n.t('common.untitledTask');
      document.title = clock + ' — ' + task + ' | Timapp';
    } else {
      document.title = App.i18n.t('common.appTitle');
    }
  }

  function ensureTicker() {
    if (data.activeTimer && !tickInterval) {
      tickInterval = setInterval(function () {
        updateDocumentTitle();
        emit('timer:tick', data.activeTimer);
      }, 1000);
    } else if (!data.activeTimer && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    updateDocumentTitle();
  }

  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var start = Number(raw.startTime);
    var end = Number(raw.endTime);
    if (!isFinite(start) || !isFinite(end)) return null;
    if (end < start) end = start;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : App.utils.uid('ent'),
      description: typeof raw.description === 'string' ? raw.description : '',
      projectId: typeof raw.projectId === 'string' && raw.projectId ? raw.projectId : null,
      tagIds: Array.isArray(raw.tagIds) ? uniqueStrings(raw.tagIds) : [],
      startTime: start,
      endTime: end,
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      createdAt: Number(raw.createdAt) || start,
      updatedAt: Number(raw.updatedAt) || end
    };
  }

  function sanitizeProject(raw, idx) {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') return null;
    var name = raw.name.trim();
    if (!name) return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : App.utils.uid('prj'),
      name: name,
      color: typeof raw.color === 'string' && /^#[0-9a-fA-F]{3,6}$/.test(raw.color)
        ? raw.color
        : App.PROJECT_COLORS[(idx || 0) % App.PROJECT_COLORS.length],
      archived: Boolean(raw.archived),
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now()
    };
  }

  function sanitizeTag(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') return null;
    var name = raw.name.trim();
    if (!name) return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : App.utils.uid('tag'),
      name: name,
      createdAt: Number(raw.createdAt) || Date.now()
    };
  }

  function uniqueStrings(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (typeof v === 'string' && v && !seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    }
    return out;
  }

  function sortEntriesDesc() {
    data.entries.sort(function (a, b) {
      return b.startTime - a.startTime;
    });
  }

  App.state = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,

    subscribe: function (event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return function () {
        listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
      };
    },

    init: function () {
      return App.db.getAllData().then(function (loaded) {
        data.entries = (loaded.entries || []).map(sanitizeEntry).filter(Boolean);
        data.projects = (loaded.projects || []).map(sanitizeProject).filter(Boolean);
        data.tags = (loaded.tags || []).map(sanitizeTag).filter(Boolean);
        data.settings = Object.assign({}, DEFAULT_SETTINGS, loaded.settings || {});
        data.activeTimer = loaded.activeTimer && loaded.activeTimer.startTime ? loaded.activeTimer : null;
        sortEntriesDesc();

        App.i18n.setLocale(data.settings.language);
        applyTheme(data.settings.theme);

        if (typeof window !== 'undefined' && window.matchMedia && !mediaQuery) {
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          var onMediaChange = function () {
            if (data.settings.theme === 'system') applyTheme('system');
          };
          if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onMediaChange);
          else if (mediaQuery.addListener) mediaQuery.addListener(onMediaChange);
        }

        ensureTicker();
        return data;
      });
    },

    getEntries: function () { return data.entries; },
    getProjects: function () { return data.projects; },
    getTags: function () { return data.tags; },
    getSettings: function () { return data.settings; },
    getActiveTimer: function () { return data.activeTimer; },
    getUi: function () { return ui; },

    getProjectsMap: function () {
      var map = {};
      for (var i = 0; i < data.projects.length; i++) map[data.projects[i].id] = data.projects[i];
      return map;
    },

    getTagsMap: function () {
      var map = {};
      for (var i = 0; i < data.tags.length; i++) map[data.tags[i].id] = data.tags[i];
      return map;
    },

    getProjectById: function (id) {
      for (var i = 0; i < data.projects.length; i++) {
        if (data.projects[i].id === id) return data.projects[i];
      }
      return null;
    },

    getTagById: function (id) {
      for (var i = 0; i < data.tags.length; i++) {
        if (data.tags[i].id === id) return data.tags[i];
      }
      return null;
    },

    getResolvedTheme: function () {
      return resolveTheme(data.settings.theme);
    },

    setView: function (viewName) {
      var valid = ['tracker', 'calendar', 'analytics', 'manage', 'settings'];
      ui.currentView = valid.indexOf(viewName) >= 0 ? viewName : 'tracker';
      emit('view:change', ui.currentView);
    },

    startTimer: function (input) {
      var payload = input || {};
      var prev = Promise.resolve();
      if (data.activeTimer) {
        prev = App.state.stopTimer(true);
      }
      return prev.then(function () {
        var now = Date.now();
        data.activeTimer = {
          id: App.utils.uid('tmr'),
          description: typeof payload.description === 'string' ? payload.description : '',
          projectId: payload.projectId || null,
          tagIds: Array.isArray(payload.tagIds) ? uniqueStrings(payload.tagIds) : [],
          notes: typeof payload.notes === 'string' ? payload.notes : '',
          startTime: now
        };
        ui.trackerDraft = {
          description: data.activeTimer.description,
          projectId: data.activeTimer.projectId,
          tagIds: data.activeTimer.tagIds.slice(),
          notes: data.activeTimer.notes
        };
        return App.db.putMeta('activeTimer', data.activeTimer).then(function () {
          ensureTicker();
          emit('timer:change', data.activeTimer);
          return data.activeTimer;
        });
      });
    },

    updateActiveTimer: function (patch) {
      if (!data.activeTimer) return Promise.resolve(null);
      data.activeTimer = Object.assign({}, data.activeTimer, patch);
      if (Array.isArray(data.activeTimer.tagIds)) {
        data.activeTimer.tagIds = uniqueStrings(data.activeTimer.tagIds);
      }
      updateDocumentTitle();
      return App.db.putMeta('activeTimer', data.activeTimer).then(function () {
        emit('timer:update', data.activeTimer);
        return data.activeTimer;
      });
    },

    stopTimer: function (silent) {
      if (!data.activeTimer) return Promise.resolve(null);
      var tmr = data.activeTimer;
      var now = Date.now();
      var end = now <= tmr.startTime ? tmr.startTime + 1000 : now;
      var entry = {
        id: App.utils.uid('ent'),
        description: (tmr.description || '').trim(),
        projectId: tmr.projectId || null,
        tagIds: uniqueStrings(tmr.tagIds || []),
        startTime: tmr.startTime,
        endTime: end,
        notes: tmr.notes || '',
        createdAt: now,
        updatedAt: now
      };
      data.activeTimer = null;
      ui.trackerDraft = { description: '', projectId: null, tagIds: [], notes: '' };
      data.entries.unshift(entry);
      sortEntriesDesc();
      ensureTicker();

      return Promise.all([
        App.db.deleteMeta('activeTimer'),
        App.db.putEntry(entry)
      ]).then(function () {
        emit('timer:change', null);
        emit('entries:change', data.entries);
        if (!silent) {
          var durText = App.utils.formatDuration(entry.endTime - entry.startTime, data.settings.durationFormat);
          App.components.showToast(App.i18n.t('toasts.timerStopped', { duration: durText }));
        }
        return entry;
      });
    },

    discardTimer: function () {
      if (!data.activeTimer) return Promise.resolve();
      data.activeTimer = null;
      ui.trackerDraft = { description: '', projectId: null, tagIds: [], notes: '' };
      ensureTicker();
      return App.db.deleteMeta('activeTimer').then(function () {
        emit('timer:change', null);
      });
    },

    addEntry: function (raw) {
      var now = Date.now();
      var entry = sanitizeEntry({
        id: App.utils.uid('ent'),
        description: (raw.description || '').trim(),
        projectId: raw.projectId || null,
        tagIds: raw.tagIds || [],
        startTime: raw.startTime,
        endTime: raw.endTime,
        notes: raw.notes || '',
        createdAt: now,
        updatedAt: now
      });
      data.entries.unshift(entry);
      sortEntriesDesc();
      return App.db.putEntry(entry).then(function () {
        emit('entries:change', data.entries);
        return entry;
      });
    },

    updateEntry: function (id, patch) {
      var target = null;
      var idx = -1;
      for (var i = 0; i < data.entries.length; i++) {
        if (data.entries[i].id === id) {
          target = data.entries[i];
          idx = i;
          break;
        }
      }
      if (!target) return Promise.resolve(null);
      var updated = sanitizeEntry(Object.assign({}, target, patch, { updatedAt: Date.now() }));
      data.entries[idx] = updated;
      sortEntriesDesc();
      return App.db.putEntry(updated).then(function () {
        emit('entries:change', data.entries);
        return updated;
      });
    },

    deleteEntry: function (id) {
      var removed = null;
      data.entries = data.entries.filter(function (e) {
        if (e.id === id) {
          removed = e;
          return false;
        }
        return true;
      });
      if (!removed) return Promise.resolve(null);
      return App.db.deleteEntry(id).then(function () {
        emit('entries:change', data.entries);
        return removed;
      });
    },

    restoreEntry: function (entry) {
      if (!entry) return Promise.resolve(null);
      var restored = sanitizeEntry(entry);
      data.entries.unshift(restored);
      sortEntriesDesc();
      return App.db.putEntry(restored).then(function () {
        emit('entries:change', data.entries);
        return restored;
      });
    },

    duplicateEntry: function (id) {
      var found = null;
      for (var i = 0; i < data.entries.length; i++) {
        if (data.entries[i].id === id) {
          found = data.entries[i];
          break;
        }
      }
      if (!found) return Promise.resolve(null);
      return App.state.addEntry({
        description: found.description,
        projectId: found.projectId,
        tagIds: found.tagIds.slice(),
        startTime: found.startTime,
        endTime: found.endTime,
        notes: found.notes
      });
    },

    getNextProjectColor: function () {
      var used = {};
      for (var i = 0; i < data.projects.length; i++) {
        if (data.projects[i].color) {
          used[data.projects[i].color.toLowerCase()] = true;
        }
      }
      for (var j = 0; j < App.PROJECT_COLORS.length; j++) {
        var c = App.PROJECT_COLORS[j];
        if (!used[c.toLowerCase()]) return c;
      }
      return App.PROJECT_COLORS[data.projects.length % App.PROJECT_COLORS.length];
    },

    addProject: function (input) {
      var name = (input.name || '').trim();
      if (!name) return Promise.resolve(null);
      var now = Date.now();
      var color = input.color || App.state.getNextProjectColor();
      var project = sanitizeProject({
        id: App.utils.uid('prj'),
        name: name,
        color: color,
        archived: false,
        createdAt: now,
        updatedAt: now
      }, data.projects.length);
      data.projects.push(project);
      data.projects.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return App.db.putProject(project).then(function () {
        emit('projects:change', data.projects);
        return project;
      });
    },

    updateProject: function (id, patch) {
      var idx = -1;
      for (var i = 0; i < data.projects.length; i++) {
        if (data.projects[i].id === id) { idx = i; break; }
      }
      if (idx < 0) return Promise.resolve(null);
      var updated = sanitizeProject(Object.assign({}, data.projects[idx], patch, { updatedAt: Date.now() }), idx);
      if (!updated) return Promise.resolve(null);
      data.projects[idx] = updated;
      data.projects.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return App.db.putProject(updated).then(function () {
        emit('projects:change', data.projects);
        return updated;
      });
    },

    deleteProject: function (id) {
      data.projects = data.projects.filter(function (p) { return p.id !== id; });
      var promises = [App.db.deleteProject(id)];
      var entriesChanged = false;
      for (var i = 0; i < data.entries.length; i++) {
        if (data.entries[i].projectId === id) {
          data.entries[i] = Object.assign({}, data.entries[i], { projectId: null, updatedAt: Date.now() });
          promises.push(App.db.putEntry(data.entries[i]));
          entriesChanged = true;
        }
      }
      if (data.activeTimer && data.activeTimer.projectId === id) {
        data.activeTimer = Object.assign({}, data.activeTimer, { projectId: null });
        promises.push(App.db.putMeta('activeTimer', data.activeTimer));
      }
      if (ui.trackerDraft.projectId === id) ui.trackerDraft.projectId = null;
      return Promise.all(promises).then(function () {
        emit('projects:change', data.projects);
        if (entriesChanged) emit('entries:change', data.entries);
      });
    },

    mergeProjects: function (sourceId, targetId) {
      if (!sourceId || !targetId || sourceId === targetId) return Promise.resolve();
      if (!App.state.getProjectById(targetId)) return Promise.resolve();
      data.projects = data.projects.filter(function (p) { return p.id !== sourceId; });
      var promises = [App.db.deleteProject(sourceId)];
      var entriesChanged = false;
      var timerChanged = false;
      var now = Date.now();
      for (var i = 0; i < data.entries.length; i++) {
        if (data.entries[i].projectId === sourceId) {
          data.entries[i] = Object.assign({}, data.entries[i], { projectId: targetId, updatedAt: now });
          promises.push(App.db.putEntry(data.entries[i]));
          entriesChanged = true;
        }
      }
      if (data.activeTimer && data.activeTimer.projectId === sourceId) {
        data.activeTimer = Object.assign({}, data.activeTimer, { projectId: targetId });
        promises.push(App.db.putMeta('activeTimer', data.activeTimer));
        timerChanged = true;
      }
      if (ui.trackerDraft.projectId === sourceId) ui.trackerDraft.projectId = targetId;
      if (ui.trackerFilter.projectId === sourceId) ui.trackerFilter.projectId = targetId;
      if (ui.analytics.projectIds.indexOf(sourceId) >= 0) {
        ui.analytics.projectIds = uniqueStrings(ui.analytics.projectIds.map(function (pid) {
          return pid === sourceId ? targetId : pid;
        }));
      }
      return Promise.all(promises).then(function () {
        emit('projects:change', data.projects);
        if (entriesChanged) emit('entries:change', data.entries);
        if (timerChanged) emit('timer:update', data.activeTimer);
      });
    },

    addTag: function (input) {
      var name = (input.name || '').trim();
      if (!name) return Promise.resolve(null);
      var lower = name.toLowerCase();
      for (var i = 0; i < data.tags.length; i++) {
        if (data.tags[i].name.toLowerCase() === lower) {
          return Promise.resolve(data.tags[i]);
        }
      }
      var tag = sanitizeTag({
        id: App.utils.uid('tag'),
        name: name,
        createdAt: Date.now()
      });
      data.tags.push(tag);
      data.tags.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return App.db.putTag(tag).then(function () {
        emit('tags:change', data.tags);
        return tag;
      });
    },

    renameTag: function (id, newName) {
      var trimmed = (newName || '').trim();
      if (!trimmed) return Promise.resolve(null);
      var idx = -1;
      for (var i = 0; i < data.tags.length; i++) {
        if (data.tags[i].id === id) idx = i;
        else if (data.tags[i].name.toLowerCase() === trimmed.toLowerCase()) {
          return App.state.mergeTags(id, data.tags[i].id);
        }
      }
      if (idx < 0) return Promise.resolve(null);
      var updated = Object.assign({}, data.tags[idx], { name: trimmed });
      data.tags[idx] = updated;
      data.tags.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return App.db.putTag(updated).then(function () {
        emit('tags:change', data.tags);
        return updated;
      });
    },

    mergeTags: function (sourceId, targetId) {
      if (!sourceId || !targetId || sourceId === targetId) return Promise.resolve();
      data.tags = data.tags.filter(function (t) { return t.id !== sourceId; });
      var promises = [App.db.deleteTag(sourceId)];
      var entriesChanged = false;
      for (var i = 0; i < data.entries.length; i++) {
        var e = data.entries[i];
        if (e.tagIds && e.tagIds.indexOf(sourceId) >= 0) {
          var nextIds = uniqueStrings(e.tagIds.map(function (tid) {
            return tid === sourceId ? targetId : tid;
          }));
          data.entries[i] = Object.assign({}, e, { tagIds: nextIds, updatedAt: Date.now() });
          promises.push(App.db.putEntry(data.entries[i]));
          entriesChanged = true;
        }
      }
      if (data.activeTimer && data.activeTimer.tagIds && data.activeTimer.tagIds.indexOf(sourceId) >= 0) {
        data.activeTimer.tagIds = uniqueStrings(data.activeTimer.tagIds.map(function (tid) {
          return tid === sourceId ? targetId : tid;
        }));
        promises.push(App.db.putMeta('activeTimer', data.activeTimer));
      }
      return Promise.all(promises).then(function () {
        emit('tags:change', data.tags);
        if (entriesChanged) emit('entries:change', data.entries);
      });
    },

    deleteTag: function (id) {
      data.tags = data.tags.filter(function (t) { return t.id !== id; });
      var promises = [App.db.deleteTag(id)];
      var entriesChanged = false;
      for (var i = 0; i < data.entries.length; i++) {
        var e = data.entries[i];
        if (e.tagIds && e.tagIds.indexOf(id) >= 0) {
          data.entries[i] = Object.assign({}, e, {
            tagIds: e.tagIds.filter(function (tid) { return tid !== id; }),
            updatedAt: Date.now()
          });
          promises.push(App.db.putEntry(data.entries[i]));
          entriesChanged = true;
        }
      }
      if (data.activeTimer && data.activeTimer.tagIds) {
        data.activeTimer.tagIds = data.activeTimer.tagIds.filter(function (tid) { return tid !== id; });
        promises.push(App.db.putMeta('activeTimer', data.activeTimer));
      }
      ui.trackerDraft.tagIds = ui.trackerDraft.tagIds.filter(function (tid) { return tid !== id; });
      return Promise.all(promises).then(function () {
        emit('tags:change', data.tags);
        if (entriesChanged) emit('entries:change', data.entries);
      });
    },

    updateSettings: function (patch) {
      data.settings = Object.assign({}, data.settings, patch);
      App.i18n.setLocale(data.settings.language);
      applyTheme(data.settings.theme);
      updateDocumentTitle();
      return App.db.putMeta('settings', data.settings).then(function () {
        emit('settings:change', data.settings);
        return data.settings;
      });
    },

    toggleLightDarkTheme: function () {
      var resolved = resolveTheme(data.settings.theme);
      var next;
      if (resolved === 'clockify') next = 'clockify-dark';
      else if (resolved === 'clockify-dark') next = 'clockify';
      else next = resolved === 'dark' ? 'light' : 'dark';
      return App.state.updateSettings({ theme: next });
    },

    exportJsonData: function () {
      return {
        app: 'timapp',
        schemaVersion: App.schemaVersion,
        exportedAt: new Date().toISOString(),
        settings: data.settings,
        projects: data.projects,
        tags: data.tags,
        entries: data.entries
      };
    },

    validateImportData: function (raw) {
      if (!raw || typeof raw !== 'object') {
        return { valid: false, error: App.i18n.t('importModal.errRootObject') };
      }
      if (!Array.isArray(raw.entries) && !Array.isArray(raw.projects) && !Array.isArray(raw.tags)) {
        return { valid: false, error: App.i18n.t('importModal.errMissingArrays') };
      }
      var projects = (raw.projects || []).map(sanitizeProject).filter(Boolean);
      var tags = (raw.tags || []).map(sanitizeTag).filter(Boolean);
      var entries = (raw.entries || []).map(sanitizeEntry).filter(Boolean);
      var settings = raw.settings && typeof raw.settings === 'object'
        ? Object.assign({}, DEFAULT_SETTINGS, raw.settings)
        : null;

      return {
        valid: true,
        summary: {
          projects: projects.length,
          tags: tags.length,
          entries: entries.length,
          exportedAt: raw.exportedAt || null
        },
        data: {
          projects: projects,
          tags: tags,
          entries: entries,
          settings: settings
        }
      };
    },

    importJsonData: function (parsedData, mode) {
      if (mode === 'replace') {
        data.projects = parsedData.projects.slice();
        data.tags = parsedData.tags.slice();
        data.entries = parsedData.entries.slice();
        if (parsedData.settings) {
          data.settings = Object.assign({}, DEFAULT_SETTINGS, parsedData.settings);
        }
        data.activeTimer = null;
        sortEntriesDesc();
        ensureTicker();
        App.i18n.setLocale(data.settings.language);
        applyTheme(data.settings.theme);

        return App.db.replaceAllData({
          entries: data.entries,
          projects: data.projects,
          tags: data.tags,
          settings: data.settings,
          activeTimer: null
        }).then(function () {
          emit('settings:change', data.settings);
          emit('projects:change', data.projects);
          emit('tags:change', data.tags);
          emit('entries:change', data.entries);
          return {
            entries: data.entries.length,
            projects: data.projects.length,
            tags: data.tags.length
          };
        });
      }

      // Merge mode
      var projById = {};
      var projByName = {};
      data.projects.forEach(function (p) {
        projById[p.id] = p;
        projByName[p.name.toLowerCase()] = p;
      });
      var projRemap = {};
      parsedData.projects.forEach(function (p) {
        if (projById[p.id]) {
          if ((p.updatedAt || 0) > (projById[p.id].updatedAt || 0)) {
            projById[p.id] = p;
          }
        } else if (projByName[p.name.toLowerCase()]) {
          projRemap[p.id] = projByName[p.name.toLowerCase()].id;
        } else {
          projById[p.id] = p;
          projByName[p.name.toLowerCase()] = p;
        }
      });

      var tagById = {};
      var tagByName = {};
      data.tags.forEach(function (t) {
        tagById[t.id] = t;
        tagByName[t.name.toLowerCase()] = t;
      });
      var tagRemap = {};
      parsedData.tags.forEach(function (t) {
        if (tagById[t.id]) {
          tagById[t.id] = t;
        } else if (tagByName[t.name.toLowerCase()]) {
          tagRemap[t.id] = tagByName[t.name.toLowerCase()].id;
        } else {
          tagById[t.id] = t;
          tagByName[t.name.toLowerCase()] = t;
        }
      });

      var entryById = {};
      data.entries.forEach(function (e) { entryById[e.id] = e; });
      parsedData.entries.forEach(function (e) {
        var remapped = Object.assign({}, e, {
          projectId: e.projectId && projRemap[e.projectId] ? projRemap[e.projectId] : e.projectId,
          tagIds: uniqueStrings((e.tagIds || []).map(function (tid) { return tagRemap[tid] || tid; }))
        });
        if (!entryById[remapped.id] || (remapped.updatedAt || 0) > (entryById[remapped.id].updatedAt || 0)) {
          entryById[remapped.id] = remapped;
        }
      });

      data.projects = Object.keys(projById).map(function (k) { return projById[k]; });
      data.tags = Object.keys(tagById).map(function (k) { return tagById[k]; });
      data.entries = Object.keys(entryById).map(function (k) { return entryById[k]; });
      sortEntriesDesc();

      return App.db.replaceAllData({
        entries: data.entries,
        projects: data.projects,
        tags: data.tags,
        settings: data.settings,
        activeTimer: data.activeTimer
      }).then(function () {
        emit('projects:change', data.projects);
        emit('tags:change', data.tags);
        emit('entries:change', data.entries);
        return {
          entries: parsedData.entries.length,
          projects: parsedData.projects.length,
          tags: parsedData.tags.length
        };
      });
    },

    loadSampleData: function () {
      var now = new Date();
      var sampleProjects = [
        { id: 'prj_demo_webapp', name: 'Web App v2', color: '#2563eb', archived: false, createdAt: now.getTime(), updatedAt: now.getTime() },
        { id: 'prj_demo_design', name: 'Design System', color: '#f97316', archived: false, createdAt: now.getTime(), updatedAt: now.getTime() },
        { id: 'prj_demo_learn', name: 'Learning & Docs', color: '#10b981', archived: false, createdAt: now.getTime(), updatedAt: now.getTime() },
        { id: 'prj_demo_research', name: 'Architecture', color: '#e11d48', archived: false, createdAt: now.getTime(), updatedAt: now.getTime() },
        { id: 'prj_demo_admin', name: 'Planning & Admin', color: '#8b5cf6', archived: false, createdAt: now.getTime(), updatedAt: now.getTime() }
      ];
      var sampleTags = [
        { id: 'tag_demo_deep', name: 'deep-work', createdAt: now.getTime() },
        { id: 'tag_demo_code', name: 'coding', createdAt: now.getTime() },
        { id: 'tag_demo_review', name: 'review', createdAt: now.getTime() },
        { id: 'tag_demo_bugfix', name: 'bugfix', createdAt: now.getTime() },
        { id: 'tag_demo_docs', name: 'docs', createdAt: now.getTime() },
        { id: 'tag_demo_plan', name: 'planning', createdAt: now.getTime() }
      ];

      var templates = [
        { desc: 'Implement analytics chart components', p: 'prj_demo_webapp', tags: ['tag_demo_deep', 'tag_demo_code'] },
        { desc: 'Refine token spacing & dark mode contrast', p: 'prj_demo_design', tags: ['tag_demo_deep'] },
        { desc: 'Fix timezone clipping at midnight boundary', p: 'prj_demo_webapp', tags: ['tag_demo_bugfix', 'tag_demo_code'] },
        { desc: 'Pull request reviews & feedback', p: 'prj_demo_webapp', tags: ['tag_demo_review'] },
        { desc: 'Weekly sprint planning & triage', p: 'prj_demo_admin', tags: ['tag_demo_plan'] },
        { desc: 'Study IndexedDB transaction patterns', p: 'prj_demo_learn', tags: ['tag_demo_docs'] },
        { desc: 'Draft local-first storage architecture spec', p: 'prj_demo_research', tags: ['tag_demo_deep', 'tag_demo_docs'] },
        { desc: 'Build keyboard shortcut navigation', p: 'prj_demo_webapp', tags: ['tag_demo_code'] },
        { desc: 'Component accessibility audit', p: 'prj_demo_design', tags: ['tag_demo_review'] }
      ];

      var entries = [];
      for (var d = 0; d < 92; d++) {
        var day = App.utils.addDays(App.utils.startOfDay(now), -d);
        var dow = day.getDay();
        // Lighter weekends, occasional rest days
        if ((dow === 0 || dow === 6) && (d % 3 !== 0)) continue;
        if (d % 11 === 4) continue;

        var blocks = (dow === 0 || dow === 6) ? 1 : (2 + (d % 3));
        var hourCursor = 9 + (d % 2);
        for (var b = 0; b < blocks; b++) {
          var tpl = templates[(d * 3 + b * 2) % templates.length];
          var durMin = 45 + ((d * 17 + b * 25) % 95);
          var start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hourCursor, (b * 15) % 45, 0, 0).getTime();
          var end = start + durMin * 60000;
          if (d === 0 && end > now.getTime()) continue;
          entries.push({
            id: App.utils.uid('ent'),
            description: tpl.desc,
            projectId: tpl.p,
            tagIds: tpl.tags.slice(),
            startTime: start,
            endTime: end,
            notes: '',
            createdAt: start,
            updatedAt: end
          });
          hourCursor += Math.ceil(durMin / 60) + 1;
          if (hourCursor >= 20) break;
        }
      }

      return App.state.importJsonData({
        projects: sampleProjects,
        tags: sampleTags,
        entries: entries,
        settings: null
      }, 'merge');
    },

    clearAllData: function () {
      data.entries = [];
      data.projects = [];
      data.tags = [];
      data.activeTimer = null;
      ui.trackerDraft = { description: '', projectId: null, tagIds: [], notes: '' };
      ensureTicker();
      return App.db.clearAllData().then(function () {
        return App.db.putMeta('settings', data.settings);
      }).then(function () {
        emit('timer:change', null);
        emit('projects:change', data.projects);
        emit('tags:change', data.tags);
        emit('entries:change', data.entries);
      });
    }
  };
})(window.TimApp);
