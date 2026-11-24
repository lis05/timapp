(function (App) {
  'use strict';

  var activePopoverClose = null;
  var activeModalClose = null;

  function showToast(message, options) {
    var opts = options || {};
    var root = document.getElementById('toast-root');
    if (!root) return;

    var el = document.createElement('div');
    el.className = 'toast' + (opts.type === 'error' ? ' toast-error' : '');
    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    el.appendChild(msgSpan);

    if (opts.actionLabel && typeof opts.onAction === 'function') {
      var actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'toast-action';
      actionBtn.textContent = opts.actionLabel;
      actionBtn.addEventListener('click', function () {
        opts.onAction();
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      el.appendChild(actionBtn);
    }

    root.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, opts.duration || 3800);
  }

  function closePopover() {
    if (activePopoverClose) {
      var fn = activePopoverClose;
      activePopoverClose = null;
      fn();
    }
  }

  function openPopover(anchorEl, renderFn) {
    closePopover();
    var root = document.getElementById('popover-root');
    if (!root || !anchorEl) return;

    var pop = document.createElement('div');
    pop.className = 'popover';
    root.appendChild(pop);

    function position() {
      var rect = anchorEl.getBoundingClientRect();
      var popRect = pop.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      var top = rect.bottom + 6;
      if (top + popRect.height > vh - 12 && rect.top - popRect.height - 6 > 12) {
        top = rect.top - popRect.height - 6;
      }
      var left = rect.left;
      if (left + popRect.width > vw - 12) {
        left = Math.max(12, vw - popRect.width - 12);
      }
      pop.style.top = Math.max(8, top) + 'px';
      pop.style.left = Math.max(8, left) + 'px';
    }

    function onDocMouseDown(e) {
      if (!pop.contains(e.target) && !anchorEl.contains(e.target)) {
        closePopover();
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePopover();
      }
    }

    activePopoverClose = function () {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      if (pop.parentNode) pop.parentNode.removeChild(pop);
    };

    renderFn(pop, closePopover, position);
    position();

    setTimeout(function () {
      document.addEventListener('mousedown', onDocMouseDown, true);
      document.addEventListener('keydown', onKeyDown, true);
    }, 0);
  }

  function openProjectPicker(anchorEl, selectedId, onSelect) {
    openPopover(anchorEl, function (pop, close, reposition) {
      var query = '';
      var search = document.createElement('input');
      search.type = 'text';
      search.className = 'input popover-search';
      search.placeholder = App.i18n.t('tracker.searchProjects');
      pop.appendChild(search);

      var list = document.createElement('div');
      list.className = 'popover-list';
      pop.appendChild(list);

      function draw() {
        var projects = App.state.getProjects().filter(function (p) { return !p.archived; });
        var q = query.trim().toLowerCase();
        var filtered = projects.filter(function (p) {
          return !q || p.name.toLowerCase().indexOf(q) >= 0;
        });

        var html = '';
        if (!q) {
          html += '<button type="button" class="popover-item' + (!selectedId ? ' is-selected' : '') + '" data-proj-id="">' +
            '<span class="popover-item-left"><span class="project-dot" style="background:var(--border-strong)"></span>' +
            '<span class="popover-item-label muted">' + App.utils.escapeHtml(App.i18n.t('common.noProject')) + '</span></span>' +
            (!selectedId ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }

        for (var i = 0; i < filtered.length; i++) {
          var p = filtered[i];
          var isSel = p.id === selectedId;
          html += '<button type="button" class="popover-item' + (isSel ? ' is-selected' : '') + '" data-proj-id="' + App.utils.escapeHtml(p.id) + '">' +
            '<span class="popover-item-left"><span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span>' +
            '<span class="popover-item-label" style="color:' + App.utils.escapeHtml(p.color) + ';">' + App.utils.escapeHtml(p.name) + '</span></span>' +
            (isSel ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }

        if (!filtered.length && !q) {
          html += '<div class="popover-empty">' + App.utils.escapeHtml(App.i18n.t('tracker.noProjectsFound')) + '</div>';
        }

        var exactMatch = projects.some(function (p) { return p.name.toLowerCase() === q; });
        if (q && !exactMatch) {
          html += '<button type="button" class="popover-item popover-create" data-create-proj="1">' +
            '<span class="popover-item-left">' + App.icon('plus', 'icon-sm') +
            '<span class="popover-item-label">' + App.utils.escapeHtml(App.i18n.t('tracker.createProjectInline', { name: query.trim() })) + '</span></span>' +
            '</button>';
        }

        list.innerHTML = html;

        var items = list.querySelectorAll('[data-proj-id]');
        for (var j = 0; j < items.length; j++) {
          items[j].addEventListener('click', function () {
            var id = this.getAttribute('data-proj-id') || null;
            onSelect(id);
            close();
          });
        }

        var createBtn = list.querySelector('[data-create-proj]');
        if (createBtn) {
          createBtn.addEventListener('click', function () {
            App.state.addProject({ name: query.trim() }).then(function (proj) {
              if (proj) onSelect(proj.id);
              close();
            });
          });
        }

        reposition();
      }

      search.addEventListener('input', function () {
        query = search.value;
        draw();
      });

      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && query.trim()) {
          e.preventDefault();
          var createBtn = list.querySelector('[data-create-proj]');
          var first = list.querySelector('[data-proj-id]');
          if (first) first.click();
          else if (createBtn) createBtn.click();
        }
      });

      draw();
      setTimeout(function () { search.focus(); }, 0);
    });
  }

  function openTagPicker(anchorEl, selectedIds, onChange) {
    var currentIds = (selectedIds || []).slice();

    openPopover(anchorEl, function (pop, close, reposition) {
      var query = '';
      var search = document.createElement('input');
      search.type = 'text';
      search.className = 'input popover-search';
      search.placeholder = App.i18n.t('tracker.searchTags');
      pop.appendChild(search);

      var list = document.createElement('div');
      list.className = 'popover-list';
      pop.appendChild(list);

      function toggleTag(id) {
        var idx = currentIds.indexOf(id);
        if (idx >= 0) currentIds.splice(idx, 1);
        else currentIds.push(id);
        onChange(currentIds.slice());
        draw();
      }

      function draw() {
        var tags = App.state.getTags();
        var q = query.trim().toLowerCase();
        var filtered = tags.filter(function (t) {
          return !q || t.name.toLowerCase().indexOf(q) >= 0;
        });

        var html = '';
        for (var i = 0; i < filtered.length; i++) {
          var t = filtered[i];
          var isSel = currentIds.indexOf(t.id) >= 0;
          html += '<button type="button" class="popover-item' + (isSel ? ' is-selected' : '') + '" data-tag-id="' + App.utils.escapeHtml(t.id) + '">' +
            '<span class="popover-item-left">' + App.icon('tag', 'icon-sm') +
            '<span class="popover-item-label">' + App.utils.escapeHtml(t.name) + '</span></span>' +
            (isSel ? App.icon('check', 'icon-sm') : '') +
            '</button>';
        }

        if (!filtered.length && !q) {
          html += '<div class="popover-empty">' + App.utils.escapeHtml(App.i18n.t('tracker.noTagsFound')) + '</div>';
        }

        var exactMatch = tags.some(function (t) { return t.name.toLowerCase() === q; });
        if (q && !exactMatch) {
          html += '<button type="button" class="popover-item popover-create" data-create-tag="1">' +
            '<span class="popover-item-left">' + App.icon('plus', 'icon-sm') +
            '<span class="popover-item-label">' + App.utils.escapeHtml(App.i18n.t('tracker.createTagInline', { name: query.trim() })) + '</span></span>' +
            '</button>';
        }

        list.innerHTML = html;

        var items = list.querySelectorAll('[data-tag-id]');
        for (var j = 0; j < items.length; j++) {
          items[j].addEventListener('click', function () {
            toggleTag(this.getAttribute('data-tag-id'));
          });
        }

        var createBtn = list.querySelector('[data-create-tag]');
        if (createBtn) {
          createBtn.addEventListener('click', function () {
            var name = query.trim();
            App.state.addTag({ name: name }).then(function (tag) {
              if (tag && currentIds.indexOf(tag.id) < 0) {
                currentIds.push(tag.id);
                onChange(currentIds.slice());
              }
              query = '';
              search.value = '';
              draw();
              search.focus();
            });
          });
        }

        reposition();
      }

      search.addEventListener('input', function () {
        query = search.value;
        draw();
      });

      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && query.trim()) {
          e.preventDefault();
          var q = query.trim().toLowerCase();
          var existing = App.state.getTags().find(function (t) { return t.name.toLowerCase() === q; });
          if (existing) {
            toggleTag(existing.id);
            query = '';
            search.value = '';
            draw();
          } else {
            var createBtn = list.querySelector('[data-create-tag]');
            if (createBtn) createBtn.click();
          }
        }
      });

      draw();
      setTimeout(function () { search.focus(); }, 0);
    });
  }

  function closeModal() {
    if (activeModalClose) {
      var fn = activeModalClose;
      activeModalClose = null;
      fn();
    }
  }

  function openModal(options) {
    closePopover();
    closeModal();
    var root = document.getElementById('modal-root');
    if (!root) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    var modal = document.createElement('div');
    modal.className = 'modal' + (options.small ? ' modal-sm' : '');
    backdrop.appendChild(modal);
    root.appendChild(backdrop);

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    }

    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', onKeyDown, true);

    activeModalClose = function () {
      document.removeEventListener('keydown', onKeyDown, true);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    };

    if (typeof options.render === 'function') {
      options.render(modal, closeModal);
    }
  }

  function openConfirmModal(opts) {
    openModal({
      small: true,
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(opts.title || '') + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p class="secondary">' + App.utils.escapeHtml(opts.message || '') + '</p>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' +
          App.utils.escapeHtml(opts.confirmLabel || App.i18n.t('common.confirm')) +
          '</button>' +
          '</div>' +
          '</div>';

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);

        var confirmBtn = modal.querySelector('[data-confirm]');
        confirmBtn.addEventListener('click', function () {
          close();
          if (typeof opts.onConfirm === 'function') opts.onConfirm();
        });
        setTimeout(function () { confirmBtn.focus(); }, 0);
      }
    });
  }

  function openEntryModal(opts) {
    var options = opts || {};
    var existing = options.entry || null;
    var isEdit = Boolean(existing);
    var now = Date.now();
    var defaultStart = existing ? existing.startTime : (options.startTime || now - 3600000);
    var defaultEnd = existing ? existing.endTime : (options.endTime || now);
    if (defaultEnd <= defaultStart) defaultEnd = defaultStart + 1800000;

    var state = {
      description: existing ? existing.description : (options.description || ''),
      projectId: existing ? existing.projectId : (options.projectId || null),
      tagIds: existing ? (existing.tagIds || []).slice() : ((options.tagIds || []).slice()),
      dateKey: App.utils.toDateKey(defaultStart),
      startStr: App.utils.toTimeInput(defaultStart),
      endStr: App.utils.toTimeInput(defaultEnd),
      durationMs: defaultEnd - defaultStart,
      notes: existing ? (existing.notes || '') : ''
    };

    openModal({
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(App.i18n.t(isEdit ? 'entryModal.editTitle' : 'entryModal.addTitle')) + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<form data-entry-form>' +
          '<div class="modal-body">' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.taskLabel')) + '</label>' +
          '<input type="text" class="input" name="description" value="' + App.utils.escapeHtml(state.description) + '" placeholder="' + App.utils.escapeHtml(App.i18n.t('entryModal.taskPlaceholder')) + '">' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;">' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('common.project')) + '</label>' +
          '<button type="button" class="btn btn-secondary" style="justify-content:flex-start;width:100%;min-width:0;" data-modal-proj></button>' +
          '</div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('common.tags')) + '</label>' +
          '<button type="button" class="btn btn-secondary" style="justify-content:flex-start;width:100%;min-width:0;" data-modal-tags></button>' +
          '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.95fr);gap:10px;">' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.dateLabel')) + '</label>' +
          '<input type="date" class="input mono" name="date" value="' + App.utils.escapeHtml(state.dateKey) + '">' +
          '</div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.startLabel')) + '</label>' +
          '<input type="time" class="input mono" name="start" value="' + App.utils.escapeHtml(state.startStr) + '">' +
          '</div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.endLabel')) + '</label>' +
          '<input type="time" class="input mono" name="end" value="' + App.utils.escapeHtml(state.endStr) + '">' +
          '</div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('entryModal.durationLabel')) + '</label>' +
          '<input type="text" class="input mono" name="duration" size="8" value="' + App.utils.escapeHtml(App.utils.formatClockDuration(state.durationMs)) + '">' +
          '</div>' +
          '</div>' +
          '<div class="muted" style="font-size:12px;min-height:16px;" data-cross-hint></div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('common.notes')) + ' <span class="muted">(' + App.utils.escapeHtml(App.i18n.t('common.optional')) + ')</span></label>' +
          '<textarea class="textarea" name="notes" placeholder="' + App.utils.escapeHtml(App.i18n.t('entryModal.notesPlaceholder')) + '">' + App.utils.escapeHtml(state.notes) + '</textarea>' +
          '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
          (isEdit ? '<button type="button" class="btn btn-danger-ghost" data-delete-entry>' + App.icon('trash', 'icon-sm') + ' ' + App.utils.escapeHtml(App.i18n.t('common.delete')) + '</button>' : '') +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="submit" class="btn btn-primary">' + App.utils.escapeHtml(App.i18n.t('common.save')) + '</button>' +
          '</div>' +
          '</div>' +
          '</form>';

        var form = modal.querySelector('[data-entry-form]');
        var descInput = form.querySelector('[name="description"]');
        var dateInput = form.querySelector('[name="date"]');
        var startInput = form.querySelector('[name="start"]');
        var endInput = form.querySelector('[name="end"]');
        var durInput = form.querySelector('[name="duration"]');
        var notesInput = form.querySelector('[name="notes"]');
        var projBtn = modal.querySelector('[data-modal-proj]');
        var tagsBtn = modal.querySelector('[data-modal-tags]');
        var crossHint = modal.querySelector('[data-cross-hint]');

        function refreshPickers() {
          var proj = state.projectId ? App.state.getProjectById(state.projectId) : null;
          if (proj) {
            projBtn.innerHTML = '<span class="project-dot" style="background:' + App.utils.escapeHtml(proj.color) + '"></span>' +
              '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + App.utils.escapeHtml(proj.color) + ';">' + App.utils.escapeHtml(proj.name) + '</span>';
          } else {
            projBtn.innerHTML = App.icon('folder', 'icon-sm') + ' <span class="muted">' + App.utils.escapeHtml(App.i18n.t('common.noProject')) + '</span>';
          }

          var tagsMap = App.state.getTagsMap();
          var names = state.tagIds.map(function (id) { return tagsMap[id] ? tagsMap[id].name : null; }).filter(Boolean);
          if (names.length) {
            tagsBtn.innerHTML = App.icon('tag', 'icon-sm') + ' <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.utils.escapeHtml(names.join(', ')) + '</span>';
          } else {
            tagsBtn.innerHTML = App.icon('tag', 'icon-sm') + ' <span class="muted">' + App.utils.escapeHtml(App.i18n.t('tracker.selectTags')) + '</span>';
          }
        }

        function computeTimestamps() {
          var s = App.utils.combineDateAndTime(dateInput.value, startInput.value);
          var e = App.utils.combineDateAndTime(dateInput.value, endInput.value);
          if (isNaN(s) || isNaN(e)) return null;
          var crosses = false;
          if (e < s) {
            e += App.utils.DAY_MS;
            crosses = true;
          }
          return { startTime: s, endTime: e, crosses: crosses };
        }

        function syncDurationFromTimes() {
          var res = computeTimestamps();
          if (!res) return;
          durInput.value = App.utils.formatClockDuration(res.endTime - res.startTime);
          crossHint.textContent = res.crosses ? App.i18n.t('entryModal.crossMidnightHint') : '';
        }

        function syncEndFromDuration() {
          var parsedDur = App.utils.parseDurationInput(durInput.value);
          var s = App.utils.combineDateAndTime(dateInput.value, startInput.value);
          if (parsedDur == null || isNaN(s)) return;
          var e = s + parsedDur;
          endInput.value = App.utils.toTimeInput(e);
          crossHint.textContent = App.utils.toDateKey(e) !== dateInput.value ? App.i18n.t('entryModal.crossMidnightHint') : '';
        }

        startInput.addEventListener('change', syncDurationFromTimes);
        endInput.addEventListener('change', syncDurationFromTimes);
        dateInput.addEventListener('change', syncDurationFromTimes);
        durInput.addEventListener('change', syncEndFromDuration);

        projBtn.addEventListener('click', function () {
          openProjectPicker(projBtn, state.projectId, function (pid) {
            state.projectId = pid;
            refreshPickers();
          });
        });

        tagsBtn.addEventListener('click', function () {
          openTagPicker(tagsBtn, state.tagIds, function (ids) {
            state.tagIds = ids;
            refreshPickers();
          });
        });

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);

        var delBtn = modal.querySelector('[data-delete-entry]');
        if (delBtn) {
          delBtn.addEventListener('click', function () {
            App.state.deleteEntry(existing.id).then(function (removed) {
              close();
              if (removed) {
                showToast(App.i18n.t('toasts.entryDeleted'), {
                  actionLabel: App.i18n.t('toasts.undo'),
                  onAction: function () {
                    App.state.restoreEntry(removed);
                    showToast(App.i18n.t('toasts.entryRestored'));
                  }
                });
              }
            });
          });
        }

        form.addEventListener('submit', function (evt) {
          evt.preventDefault();
          var res = computeTimestamps();
          if (!res) {
            showToast(App.i18n.t('entryModal.invalidTimeError'), { type: 'error' });
            return;
          }
          var payload = {
            description: descInput.value.trim(),
            projectId: state.projectId,
            tagIds: state.tagIds,
            startTime: res.startTime,
            endTime: res.endTime,
            notes: notesInput.value.trim()
          };
          var op = isEdit ? App.state.updateEntry(existing.id, payload) : App.state.addEntry(payload);
          op.then(function () {
            close();
            showToast(App.i18n.t(isEdit ? 'toasts.entryUpdated' : 'toasts.entryAdded'));
          });
        });

        refreshPickers();
        syncDurationFromTimes();
        setTimeout(function () { descInput.focus(); }, 0);
      }
    });
  }

  function openImportModal(validated) {
    var summary = validated.summary;
    var exportedLabel = summary.exportedAt
      ? App.i18n.t('importModal.exportedOn', { date: App.i18n.formatDate(new Date(summary.exportedAt), { dateStyle: 'medium', timeStyle: 'short' }) })
      : '';

    openModal({
      small: false,
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(App.i18n.t('importModal.title')) + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<div class="modal-body">' +
          (exportedLabel ? '<div class="muted" style="font-size:12px;">' + App.utils.escapeHtml(exportedLabel) + '</div>' : '') +
          '<div class="import-summary-grid">' +
          '<div class="import-summary-box"><div class="import-summary-num tabular">' + summary.entries + '</div><div class="import-summary-lbl">' + App.utils.escapeHtml(App.i18n.t('importModal.summaryEntries')) + '</div></div>' +
          '<div class="import-summary-box"><div class="import-summary-num tabular">' + summary.projects + '</div><div class="import-summary-lbl">' + App.utils.escapeHtml(App.i18n.t('importModal.summaryProjects')) + '</div></div>' +
          '<div class="import-summary-box"><div class="import-summary-num tabular">' + summary.tags + '</div><div class="import-summary-lbl">' + App.utils.escapeHtml(App.i18n.t('importModal.summaryTags')) + '</div></div>' +
          '</div>' +
          '<div class="import-mode-options">' +
          '<label class="import-mode-card">' +
          '<input type="radio" name="importMode" value="merge" checked>' +
          '<div><div style="font-weight:600;font-size:13px;">' + App.utils.escapeHtml(App.i18n.t('importModal.modeMergeTitle')) + '</div>' +
          '<div class="secondary" style="font-size:12px;">' + App.utils.escapeHtml(App.i18n.t('importModal.modeMergeDesc')) + '</div></div>' +
          '</label>' +
          '<label class="import-mode-card">' +
          '<input type="radio" name="importMode" value="replace">' +
          '<div><div style="font-weight:600;font-size:13px;">' + App.utils.escapeHtml(App.i18n.t('importModal.modeReplaceTitle')) + '</div>' +
          '<div class="secondary" style="font-size:12px;">' + App.utils.escapeHtml(App.i18n.t('importModal.modeReplaceDesc')) + '</div></div>' +
          '</label>' +
          '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="button" class="btn btn-primary" data-confirm-import>' + App.utils.escapeHtml(App.i18n.t('importModal.confirmImport')) + '</button>' +
          '</div>' +
          '</div>';

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);

        modal.querySelector('[data-confirm-import]').addEventListener('click', function () {
          var selected = modal.querySelector('input[name="importMode"]:checked');
          var mode = selected ? selected.value : 'merge';
          App.state.importJsonData(validated.data, mode).then(function (counts) {
            close();
            showToast(App.i18n.t('toasts.importedJson', counts));
          });
        });
      }
    });
  }

  App.components = {
    showToast: showToast,
    openPopover: openPopover,
    closePopover: closePopover,
    openProjectPicker: openProjectPicker,
    openTagPicker: openTagPicker,
    openModal: openModal,
    closeModal: closeModal,
    openConfirmModal: openConfirmModal,
    openEntryModal: openEntryModal,
    openImportModal: openImportModal
  };
})(window.TimApp);
