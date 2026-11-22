(function (App) {
  'use strict';

  var currentCleanup = null;

  var NAV_ITEMS = [
    { id: 'tracker', icon: 'clock', labelKey: 'nav.tracker' },
    { id: 'calendar', icon: 'calendar', labelKey: 'nav.calendar' },
    { id: 'analytics', icon: 'chart', labelKey: 'nav.analytics' },
    { id: 'manage', icon: 'folder', labelKey: 'nav.manage' },
    { id: 'settings', icon: 'settings', labelKey: 'nav.settings' }
  ];

  function renderSidebar() {
    var sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    var ui = App.state.getUi();
    var active = App.state.getActiveTimer();
    var resolvedTheme = App.state.getResolvedTheme();
    var isDarkTheme = resolvedTheme === 'dark' || resolvedTheme === 'clockify-dark';

    var navHtml = NAV_ITEMS.map(function (item) {
      var isActive = ui.currentView === item.id;
      var showDot = item.id === 'tracker' && Boolean(active);
      return '<button type="button" class="nav-item' + (isActive ? ' is-active' : '') + '" data-nav="' + item.id + '" title="' + App.utils.escapeHtml(App.i18n.t(item.labelKey)) + '">' +
        '<span class="nav-item-left">' + App.icon(item.icon) + '<span class="nav-item-label">' + App.utils.escapeHtml(App.i18n.t(item.labelKey)) + '</span></span>' +
        (showDot ? '<span class="nav-live-dot" aria-label="' + App.utils.escapeHtml(App.i18n.t('nav.liveRunning')) + '"></span>' : '') +
        '</button>';
    }).join('');

    var miniTimerHtml = '';
    if (active && ui.currentView !== 'tracker') {
      var clock = App.utils.formatClockDuration(Date.now() - active.startTime);
      var proj = active.projectId ? App.state.getProjectById(active.projectId) : null;
      miniTimerHtml =
        '<div class="sidebar-live-card">' +
        '<div class="sidebar-live-top">' +
        '<span class="sidebar-live-status"><span class="nav-live-dot"></span><span>' + App.utils.escapeHtml(App.i18n.t('nav.liveRunning')) + '</span></span>' +
        '<span class="sidebar-live-clock mono" data-live-timer="sidebar">' + clock + '</span>' +
        '</div>' +
        '<div class="sidebar-live-task">' +
        (proj ? '<span class="project-dot" style="background:' + App.utils.escapeHtml(proj.color) + ';margin-right:5px;"></span>' : '') +
        App.utils.escapeHtml(active.description || App.i18n.t('common.untitledTask')) +
        '</div>' +
        '<div class="sidebar-live-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-sidebar-goto-tracker>' + App.utils.escapeHtml(App.i18n.t('nav.tracker')) + '</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-sidebar-stop>' + App.icon('stop', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('tracker.stopTimer')) + '</span></button>' +
        '</div>' +
        '</div>';
    }

    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
      '<div class="brand-lockup">' +
      '<span class="brand-mark">' + App.icons.logo + '</span>' +
      '<span class="brand-name">Timapp</span>' +
      '</div>' +
      '</div>' +
      '<nav class="sidebar-nav">' + navHtml + '</nav>' +
      miniTimerHtml +
      '<div class="sidebar-footer">' +
      '<span class="sidebar-footer-info" title="' + App.utils.escapeHtml(App.db.getBackendName()) + '">' + App.utils.escapeHtml(App.i18n.t('nav.localOnly')) + '</span>' +
      '<div class="sidebar-footer-actions">' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" data-quick-backup title="' + App.utils.escapeHtml(App.i18n.t('nav.quickBackup')) + '">' + App.icon('download', 'icon-sm') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-icon-sm" data-quick-theme title="' + App.utils.escapeHtml(App.i18n.t('nav.quickTheme')) + '">' + App.icon(isDarkTheme ? 'sun' : 'moon', 'icon-sm') + '</button>' +
      '</div>' +
      '</div>';

    var navBtns = sidebar.querySelectorAll('[data-nav]');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', function () {
        navigateTo(this.getAttribute('data-nav'));
      });
    }

    var gotoTracker = sidebar.querySelector('[data-sidebar-goto-tracker]');
    if (gotoTracker) {
      gotoTracker.addEventListener('click', function () { navigateTo('tracker'); });
    }

    var sidebarStop = sidebar.querySelector('[data-sidebar-stop]');
    if (sidebarStop) {
      sidebarStop.addEventListener('click', function () { App.state.stopTimer(); });
    }

    var quickThemeBtn = sidebar.querySelector('[data-quick-theme]');
    quickThemeBtn.addEventListener('click', function () {
      var curTheme = App.state.getSettings().theme;
      App.components.openPopover(quickThemeBtn, function (pop, close) {
        pop.innerHTML = '<div class="popover-list">' + (App.THEMES || []).map(function (th) {
          var isSel = th.id === curTheme;
          return '<button type="button" class="popover-item' + (isSel ? ' is-selected' : '') + '" data-theme-choice="' + App.utils.escapeHtml(th.id) + '">' +
            '<span class="popover-item-left">' +
            '<span class="theme-swatch" style="background:linear-gradient(135deg,' + App.utils.escapeHtml(th.bg) + ' 50%,' + App.utils.escapeHtml(th.accent) + ' 50%);"></span>' +
            '<span class="popover-item-label">' + App.utils.escapeHtml(App.i18n.t(th.labelKey)) + '</span>' +
            '</span>' +
            (isSel ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }).join('') + '</div>';

        var items = pop.querySelectorAll('[data-theme-choice]');
        for (var j = 0; j < items.length; j++) {
          items[j].addEventListener('click', function () {
            var id = this.getAttribute('data-theme-choice');
            close();
            App.state.updateSettings({ theme: id });
          });
        }
      });
    });

    sidebar.querySelector('[data-quick-backup]').addEventListener('click', function () {
      var payload = App.state.exportJsonData();
      App.utils.downloadFile('timapp-backup-' + App.utils.toDateKey(new Date()) + '.json', JSON.stringify(payload, null, 2), 'application/json');
      App.components.showToast(App.i18n.t('toasts.exportedJson'));
    });
  }

  function renderActiveView() {
    var main = document.getElementById('app-main');
    if (!main) return;
    App.components.closePopover();

    if (typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    var viewName = App.state.getUi().currentView;
    var viewMod = App.views[viewName] || App.views.tracker;
    currentCleanup = viewMod.render(main);
    main.scrollTop = 0;
    renderSidebar();
  }

  function navigateTo(viewName) {
    var valid = ['tracker', 'calendar', 'analytics', 'manage', 'settings'];
    var target = valid.indexOf(viewName) >= 0 ? viewName : 'tracker';
    if (window.location.hash !== '#' + target) {
      window.location.hash = '#' + target;
    }
    if (App.state.getUi().currentView !== target) {
      App.state.setView(target);
    } else {
      renderActiveView();
    }
  }

  function updateLiveTimerNodes() {
    var active = App.state.getActiveTimer();
    if (!active) return;
    var text = App.utils.formatClockDuration(Date.now() - active.startTime);
    var nodes = document.querySelectorAll('[data-live-timer]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = text;
    }
  }

  function isEditableElement(el) {
    if (!el) return false;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(el.isContentEditable);
  }

  function wireGlobalShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableElement(document.activeElement)) return;
      // Ignore shortcuts when modal is open
      var modalRoot = document.getElementById('modal-root');
      if (modalRoot && modalRoot.children.length > 0) return;

      var key = e.key.toLowerCase();
      if (key === '1') { e.preventDefault(); navigateTo('tracker'); }
      else if (key === '2') { e.preventDefault(); navigateTo('calendar'); }
      else if (key === '3') { e.preventDefault(); navigateTo('analytics'); }
      else if (key === '4') { e.preventDefault(); navigateTo('manage'); }
      else if (key === '5') { e.preventDefault(); navigateTo('settings'); }
      else if (key === 't') { e.preventDefault(); App.state.toggleLightDarkTheme(); }
      else if (key === 'n') { e.preventDefault(); App.components.openEntryModal(); }
      else if (key === 's') {
        e.preventDefault();
        if (App.state.getActiveTimer()) App.state.stopTimer();
        else {
          App.state.startTimer(App.state.getUi().trackerDraft).then(function () {
            App.components.showToast(App.i18n.t('toasts.timerStarted'));
          });
        }
      } else if (e.key === '/') {
        e.preventDefault();
        if (App.state.getUi().currentView !== 'tracker') navigateTo('tracker');
        setTimeout(function () {
          var inp = document.querySelector('[data-tracker-task]');
          if (inp) inp.focus();
        }, 20);
      }
    });
  }

  function bootstrap() {
    App.db.init().then(function () {
      return App.state.init();
    }).then(function () {
      App.state.subscribe('view:change', renderActiveView);
      App.state.subscribe('timer:change', renderSidebar);
      App.state.subscribe('timer:update', renderSidebar);
      App.state.subscribe('timer:tick', updateLiveTimerNodes);
      App.state.subscribe('settings:change', renderSidebar);

      var hashView = (window.location.hash || '').replace('#', '');
      var valid = ['tracker', 'calendar', 'analytics', 'manage', 'settings'];
      var initialView = valid.indexOf(hashView) >= 0 ? hashView : App.state.getSettings().defaultView;

      window.addEventListener('hashchange', function () {
        var hv = (window.location.hash || '').replace('#', '');
        if (valid.indexOf(hv) >= 0 && hv !== App.state.getUi().currentView) {
          App.state.setView(hv);
        }
      });

      wireGlobalShortcuts();
      navigateTo(initialView);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window.TimApp);
