(function (App) {
  'use strict';

  function renderSettings(root) {
    var settings = App.state.getSettings();
    var locales = App.i18n.getAvailableLocales();
    var entriesCount = App.state.getEntries().length;
    var projectsCount = App.state.getProjects().length;
    var tagsCount = App.state.getTags().length;

    var localeOptions = locales.map(function (loc) {
      return '<option value="' + App.utils.escapeHtml(loc.code) + '"' + (settings.language === loc.code ? ' selected' : '') + '>' +
        App.utils.escapeHtml(loc.nativeName + (loc.name !== loc.nativeName ? ' (' + loc.name + ')' : '')) +
        '</option>';
    }).join('');

    root.innerHTML =
      '<div class="view-container">' +
      '<div class="view-header">' +
      '<div class="view-title-group">' +
      '<h1 class="view-title">' + App.utils.escapeHtml(App.i18n.t('settings.title')) + '</h1>' +
      '<p class="view-subtitle">' + App.utils.escapeHtml(App.i18n.t('settings.subtitle')) + '</p>' +
      '</div>' +
      '</div>' +

      '<div class="settings-wrap">' +

      // 1. Appearance & Language
      '<div class="card settings-card">' +
      '<div class="settings-card-header"><span class="settings-card-title">' + App.utils.escapeHtml(App.i18n.t('settings.sectionAppearance')) + '</span></div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.themeLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.themeDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<div class="segmented">' +
      '<button type="button" class="segmented-btn' + (settings.theme === 'system' ? ' is-active' : '') + '" data-set-theme="system">' + App.icon('monitor', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.themeSystem')) + '</span></button>' +
      '<button type="button" class="segmented-btn' + (settings.theme === 'light' ? ' is-active' : '') + '" data-set-theme="light">' + App.icon('sun', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.themeLight')) + '</span></button>' +
      '<button type="button" class="segmented-btn' + (settings.theme === 'dark' ? ' is-active' : '') + '" data-set-theme="dark">' + App.icon('moon', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.themeDark')) + '</span></button>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.languageLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.languageDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<select class="select" data-set-lang>' + localeOptions + '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 2. Time & Preferences
      '<div class="card settings-card">' +
      '<div class="settings-card-header"><span class="settings-card-title">' + App.utils.escapeHtml(App.i18n.t('settings.sectionTime')) + '</span></div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.timeFormatLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.timeFormatDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<select class="select" data-set-timefmt>' +
      '<option value="24h"' + (settings.timeFormat === '24h' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.time24h')) + '</option>' +
      '<option value="12h"' + (settings.timeFormat === '12h' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.time12h')) + '</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.weekStartLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.weekStartDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<select class="select" data-set-weekstart>' +
      '<option value="1"' + (settings.weekStartsOn === 1 ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.monday')) + '</option>' +
      '<option value="0"' + (settings.weekStartsOn === 0 ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.sunday')) + '</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.durationFormatLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.durationFormatDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<select class="select" data-set-durfmt>' +
      '<option value="hms"' + (settings.durationFormat === 'hms' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.durationHms')) + '</option>' +
      '<option value="hm"' + (settings.durationFormat === 'hm' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.durationHm')) + '</option>' +
      '<option value="decimal"' + (settings.durationFormat === 'decimal' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('settings.durationDecimal')) + '</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.defaultViewLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.defaultViewDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<select class="select" data-set-defview>' +
      '<option value="tracker"' + (settings.defaultView === 'tracker' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('nav.tracker')) + '</option>' +
      '<option value="calendar"' + (settings.defaultView === 'calendar' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('nav.calendar')) + '</option>' +
      '<option value="analytics"' + (settings.defaultView === 'analytics' ? ' selected' : '') + '>' + App.utils.escapeHtml(App.i18n.t('nav.analytics')) + '</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.tabTitleLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.tabTitleDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<label class="switch"><input type="checkbox" data-set-tabtitle' + (settings.showTimerInTitle ? ' checked' : '') + '><span class="switch-track"></span></label>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.confirmDeleteLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.confirmDeleteDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<label class="switch"><input type="checkbox" data-set-confirm' + (settings.confirmDelete ? ' checked' : '') + '><span class="switch-track"></span></label>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 3. Data & Backup
      '<div class="card settings-card">' +
      '<div class="settings-card-header">' +
      '<span class="settings-card-title">' + App.utils.escapeHtml(App.i18n.t('settings.sectionData')) + '</span>' +
      '<span class="tag-pill mono">' + App.utils.escapeHtml(App.db.getBackendName()) + '</span>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.storageStatusLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.storageStatusDesc', { entries: entriesCount, projects: projectsCount, tags: tagsCount })) + '</span>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.exportLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.exportDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<button type="button" class="btn btn-secondary" data-export-json>' + App.icon('download', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.exportBtn')) + '</span></button>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.importLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.importDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<input type="file" accept=".json,application/json" data-import-file style="display:none;">' +
      '<button type="button" class="btn btn-secondary" data-import-json>' + App.icon('upload', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.importBtn')) + '</span></button>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.sampleLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.sampleDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<button type="button" class="btn btn-secondary" data-load-sample>' + App.icon('sparkles', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.sampleBtn')) + '</span></button>' +
      '</div>' +
      '</div>' +

      '<div class="settings-row">' +
      '<div class="settings-row-info">' +
      '<span class="settings-row-label">' + App.utils.escapeHtml(App.i18n.t('settings.clearLabel')) + '</span>' +
      '<span class="settings-row-desc">' + App.utils.escapeHtml(App.i18n.t('settings.clearDesc')) + '</span>' +
      '</div>' +
      '<div class="settings-row-control">' +
      '<button type="button" class="btn btn-danger-ghost" data-clear-all>' + App.icon('trash', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('settings.clearBtn')) + '</span></button>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 4. Shortcuts
      '<div class="card settings-card">' +
      '<div class="settings-card-header"><span class="settings-card-title">' + App.utils.escapeHtml(App.i18n.t('settings.sectionShortcuts')) + '</span></div>' +
      '<div class="shortcuts-grid">' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutStartStop')) + '</span><span class="shortcut-keys"><span class="kbd">S</span></span></div>' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutFocusTask')) + '</span><span class="shortcut-keys"><span class="kbd">/</span></span></div>' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutNewEntry')) + '</span><span class="shortcut-keys"><span class="kbd">N</span></span></div>' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutTheme')) + '</span><span class="shortcut-keys"><span class="kbd">T</span></span></div>' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutViews')) + '</span><span class="shortcut-keys"><span class="kbd">1</span>–<span class="kbd">5</span></span></div>' +
      '<div class="shortcut-item"><span>' + App.utils.escapeHtml(App.i18n.t('settings.shortcutEscape')) + '</span><span class="shortcut-keys"><span class="kbd">Esc</span></span></div>' +
      '</div>' +
      '</div>' +

      '</div>' +
      '</div>';

    wireSettingsEvents(root);
  }

  function wireSettingsEvents(root) {
    var themeBtns = root.querySelectorAll('[data-set-theme]');
    for (var i = 0; i < themeBtns.length; i++) {
      themeBtns[i].addEventListener('click', function () {
        App.state.updateSettings({ theme: this.getAttribute('data-set-theme') });
      });
    }

    root.querySelector('[data-set-lang]').addEventListener('change', function () {
      App.state.updateSettings({ language: this.value });
    });
    root.querySelector('[data-set-timefmt]').addEventListener('change', function () {
      App.state.updateSettings({ timeFormat: this.value });
    });
    root.querySelector('[data-set-weekstart]').addEventListener('change', function () {
      App.state.updateSettings({ weekStartsOn: parseInt(this.value, 10) });
    });
    root.querySelector('[data-set-durfmt]').addEventListener('change', function () {
      App.state.updateSettings({ durationFormat: this.value });
    });
    root.querySelector('[data-set-defview]').addEventListener('change', function () {
      App.state.updateSettings({ defaultView: this.value });
    });
    root.querySelector('[data-set-tabtitle]').addEventListener('change', function () {
      App.state.updateSettings({ showTimerInTitle: this.checked });
    });
    root.querySelector('[data-set-confirm]').addEventListener('change', function () {
      App.state.updateSettings({ confirmDelete: this.checked });
    });

    root.querySelector('[data-export-json]').addEventListener('click', function () {
      var payload = App.state.exportJsonData();
      var fname = 'timapp-backup-' + App.utils.toDateKey(new Date()) + '.json';
      App.utils.downloadFile(fname, JSON.stringify(payload, null, 2), 'application/json');
      App.components.showToast(App.i18n.t('toasts.exportedJson'));
    });

    var fileInput = root.querySelector('[data-import-file]');
    root.querySelector('[data-import-json]').addEventListener('click', function () {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result || ''));
          var res = App.state.validateImportData(parsed);
          if (!res.valid) {
            App.components.showToast(App.i18n.t('toasts.invalidJson', { reason: res.error }), { type: 'error' });
            return;
          }
          App.components.openImportModal(res);
        } catch (err) {
          App.components.showToast(App.i18n.t('toasts.invalidJson', { reason: err.message }), { type: 'error' });
        }
      };
      reader.readAsText(file);
    });

    root.querySelector('[data-load-sample]').addEventListener('click', function () {
      App.components.openConfirmModal({
        title: App.i18n.t('settings.sampleConfirmTitle'),
        message: App.i18n.t('settings.sampleConfirmMessage'),
        confirmLabel: App.i18n.t('settings.sampleBtn'),
        onConfirm: function () {
          App.state.loadSampleData().then(function () {
            App.components.showToast(App.i18n.t('toasts.sampleLoaded'));
          });
        }
      });
    });

    root.querySelector('[data-clear-all]').addEventListener('click', function () {
      App.components.openConfirmModal({
        title: App.i18n.t('settings.clearConfirmTitle'),
        message: App.i18n.t('settings.clearConfirmMessage'),
        confirmLabel: App.i18n.t('settings.clearBtn'),
        danger: true,
        onConfirm: function () {
          App.state.clearAllData().then(function () {
            App.components.showToast(App.i18n.t('toasts.dataCleared'));
          });
        }
      });
    });
  }

  App.views.settings = {
    render: function (root) {
      renderSettings(root);

      var unsubs = [
        App.state.subscribe('settings:change', function () { renderSettings(root); }),
        App.state.subscribe('entries:change', function () { renderSettings(root); }),
        App.state.subscribe('projects:change', function () { renderSettings(root); }),
        App.state.subscribe('tags:change', function () { renderSettings(root); })
      ];

      return function cleanup() {
        for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      };
    }
  };
})(window.TimApp);
