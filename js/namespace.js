(function (global) {
  'use strict';

  var App = global.TimApp = global.TimApp || {};
  App.version = '1.0.0';
  App.schemaVersion = 1;
  App.locales = App.locales || {};
  App.views = App.views || {};

  App.THEMES = [
    { id: 'system', labelKey: 'settings.themeSystem', bg: '#e4e4e7', accent: '#18181b' },
    { id: 'light', labelKey: 'settings.themeLight', bg: '#fafafa', accent: '#18181b' },
    { id: 'dark', labelKey: 'settings.themeDark', bg: '#111113', accent: '#fafafa' },
    { id: 'clockify', labelKey: 'settings.themeClockify', bg: '#f2f6f8', accent: '#03a9f4' },
    { id: 'clockify-dark', labelKey: 'settings.themeClockifyDark', bg: '#1d272c', accent: '#03a9f4' }
  ];

  App.PROJECT_COLORS = [
    '#2563eb', // Royal Blue
    '#f97316', // Vivid Orange
    '#10b981', // Emerald
    '#e11d48', // Crimson Rose
    '#8b5cf6', // Vivid Violet
    '#eab308', // Warm Gold
    '#06b6d4', // Bright Cyan
    '#ec4899', // Magenta
    '#84cc16', // Lime
    '#dc2626', // Signal Red
    '#14b8a6', // Deep Teal
    '#d97706', // Deep Amber
    '#7c3aed', // Deep Purple
    '#64748b'  // Slate
  ];

  var SVG_BASE = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"';

  App.icons = {
    logo: '<svg ' + SVG_BASE + '><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
    play: '<svg ' + SVG_BASE + '><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>',
    stop: '<svg ' + SVG_BASE + '><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/></svg>',
    plus: '<svg ' + SVG_BASE + '><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    clock: '<svg ' + SVG_BASE + '><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>',
    calendar: '<svg ' + SVG_BASE + '><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    chart: '<svg ' + SVG_BASE + '><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    folder: '<svg ' + SVG_BASE + '><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    tag: '<svg ' + SVG_BASE + '><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    settings: '<svg ' + SVG_BASE + '><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    sun: '<svg ' + SVG_BASE + '><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>',
    moon: '<svg ' + SVG_BASE + '><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    monitor: '<svg ' + SVG_BASE + '><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    search: '<svg ' + SVG_BASE + '><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter: '<svg ' + SVG_BASE + '><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    edit: '<svg ' + SVG_BASE + '><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg ' + SVG_BASE + '><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    copy: '<svg ' + SVG_BASE + '><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg ' + SVG_BASE + '><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg ' + SVG_BASE + '><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevronLeft: '<svg ' + SVG_BASE + '><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg ' + SVG_BASE + '><polyline points="9 18 15 12 9 6"/></svg>',
    chevronDown: '<svg ' + SVG_BASE + '><polyline points="6 9 12 15 18 9"/></svg>',
    download: '<svg ' + SVG_BASE + '><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg ' + SVG_BASE + '><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    archive: '<svg ' + SVG_BASE + '><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    merge: '<svg ' + SVG_BASE + '><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>',
    sparkles: '<svg ' + SVG_BASE + '><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>',
    note: '<svg ' + SVG_BASE + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
  };

  App.icon = function (name, extraClass) {
    var svg = App.icons[name] || '';
    return '<span class="icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">' + svg + '</span>';
  };
})(window);
