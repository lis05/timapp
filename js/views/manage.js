(function (App) {
  'use strict';

  var selectedNewColor = null;

  function openEditProjectModal(project) {
    var colorChoice = project.color;
    App.components.openModal({
      small: true,
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(App.i18n.t('manage.editProjectTitle')) + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<form data-edit-proj-form>' +
          '<div class="modal-body">' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('manage.projectNameLabel')) + '</label>' +
          '<input type="text" class="input" name="name" value="' + App.utils.escapeHtml(project.name) + '" required>' +
          '</div>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('manage.projectColorLabel')) + '</label>' +
          '<div class="color-palette" data-modal-palette></div>' +
          '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="submit" class="btn btn-primary">' + App.utils.escapeHtml(App.i18n.t('common.save')) + '</button>' +
          '</div></div></form>';

        var paletteEl = modal.querySelector('[data-modal-palette]');
        function renderPalette() {
          paletteEl.innerHTML = App.PROJECT_COLORS.map(function (c) {
            return '<button type="button" class="color-swatch' + (c.toLowerCase() === colorChoice.toLowerCase() ? ' is-selected' : '') + '" data-swatch="' + c + '" style="background:' + c + ';"></button>';
          }).join('') +
          '<input type="color" class="color-custom-input" data-custom-color value="' + App.utils.escapeHtml(colorChoice) + '">';

          var sw = paletteEl.querySelectorAll('[data-swatch]');
          for (var i = 0; i < sw.length; i++) {
            sw[i].addEventListener('click', function () {
              colorChoice = this.getAttribute('data-swatch');
              renderPalette();
            });
          }
          paletteEl.querySelector('[data-custom-color]').addEventListener('input', function () {
            colorChoice = this.value;
          });
        }
        renderPalette();

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var j = 0; j < closeBtns.length; j++) closeBtns[j].addEventListener('click', close);

        modal.querySelector('[data-edit-proj-form]').addEventListener('submit', function (e) {
          e.preventDefault();
          var name = this.querySelector('[name="name"]').value.trim();
          if (!name) return;
          App.state.updateProject(project.id, { name: name, color: colorChoice }).then(function () {
            close();
            App.components.showToast(App.i18n.t('toasts.projectUpdated'));
          });
        });
      }
    });
  }

  function openMergeProjectModal(sourceProject, allProjects) {
    var candidates = allProjects.filter(function (p) { return p.id !== sourceProject.id; });
    if (!candidates.length) return;

    App.components.openModal({
      small: true,
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(App.i18n.t('manage.mergeProjectTitle', { name: sourceProject.name })) + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p class="secondary" style="font-size:13px;">' + App.utils.escapeHtml(App.i18n.t('manage.mergeProjectDesc', { name: sourceProject.name })) + '</p>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('manage.mergeProjectTargetLabel')) + '</label>' +
          '<select class="select" data-merge-target>' +
          candidates.map(function (p) {
            var label = p.name + (p.archived ? ' (' + App.i18n.t('common.archived') + ')' : '');
            return '<option value="' + App.utils.escapeHtml(p.id) + '">' + App.utils.escapeHtml(label) + '</option>';
          }).join('') +
          '</select>' +
          '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="button" class="btn btn-primary" data-confirm-merge>' + App.utils.escapeHtml(App.i18n.t('manage.mergeProject')) + '</button>' +
          '</div></div>';

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);

        modal.querySelector('[data-confirm-merge]').addEventListener('click', function () {
          var targetId = modal.querySelector('[data-merge-target]').value;
          App.state.mergeProjects(sourceProject.id, targetId).then(function () {
            close();
            App.components.showToast(App.i18n.t('toasts.projectMerged'));
          });
        });
      }
    });
  }

  function openMergeTagModal(sourceTag, allTags) {
    var candidates = allTags.filter(function (t) { return t.id !== sourceTag.id; });
    if (!candidates.length) return;

    App.components.openModal({
      small: true,
      render: function (modal, close) {
        modal.innerHTML =
          '<div class="modal-header">' +
          '<h3 class="modal-title">' + App.utils.escapeHtml(App.i18n.t('manage.mergeTagTitle', { name: sourceTag.name })) + '</h3>' +
          '<button type="button" class="btn btn-ghost btn-icon" data-close>' + App.icon('x') + '</button>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p class="secondary" style="font-size:13px;">' + App.utils.escapeHtml(App.i18n.t('manage.mergeTagDesc', { name: sourceTag.name })) + '</p>' +
          '<div class="field">' +
          '<label class="field-label">' + App.utils.escapeHtml(App.i18n.t('manage.mergeTargetLabel')) + '</label>' +
          '<select class="select" data-merge-target>' +
          candidates.map(function (t) {
            return '<option value="' + App.utils.escapeHtml(t.id) + '">' + App.utils.escapeHtml(t.name) + '</option>';
          }).join('') +
          '</select>' +
          '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<div class="modal-footer-right">' +
          '<button type="button" class="btn btn-secondary" data-close>' + App.utils.escapeHtml(App.i18n.t('common.cancel')) + '</button>' +
          '<button type="button" class="btn btn-primary" data-confirm-merge>' + App.utils.escapeHtml(App.i18n.t('manage.mergeTag')) + '</button>' +
          '</div></div>';

        var closeBtns = modal.querySelectorAll('[data-close]');
        for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);

        modal.querySelector('[data-confirm-merge]').addEventListener('click', function () {
          var targetId = modal.querySelector('[data-merge-target]').value;
          App.state.mergeTags(sourceTag.id, targetId).then(function () {
            close();
            App.components.showToast(App.i18n.t('toasts.tagMerged'));
          });
        });
      }
    });
  }

  function renderManage(root) {
    var ui = App.state.getUi().manage;
    var settings = App.state.getSettings();
    var projects = App.state.getProjects();
    var tags = App.state.getTags();
    var entries = App.state.getEntries();

    // Compute stats
    var projStats = {};
    var tagStats = {};
    var totalAllMs = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var dur = Math.max(0, e.endTime - e.startTime);
      totalAllMs += dur;
      if (e.projectId) {
        if (!projStats[e.projectId]) projStats[e.projectId] = { count: 0, ms: 0 };
        projStats[e.projectId].count++;
        projStats[e.projectId].ms += dur;
      }
      var tIds = e.tagIds || [];
      for (var j = 0; j < tIds.length; j++) {
        if (!tagStats[tIds[j]]) tagStats[tIds[j]] = { count: 0, ms: 0 };
        tagStats[tIds[j]].count++;
        tagStats[tIds[j]].ms += dur;
      }
    }

    var bodyHtml = '';
    if (ui.tab === 'projects') {
      if (!selectedNewColor) {
        selectedNewColor = App.state.getNextProjectColor();
      }
      var visibleProjects = projects.filter(function (p) { return ui.showArchived || !p.archived; });
      var swatchesHtml = App.PROJECT_COLORS.map(function (c) {
        return '<button type="button" class="color-swatch' + (c.toLowerCase() === selectedNewColor.toLowerCase() ? ' is-selected' : '') + '" data-new-swatch="' + c + '" style="background:' + c + ';"></button>';
      }).join('') + '<input type="color" class="color-custom-input" data-new-custom-color value="' + App.utils.escapeHtml(selectedNewColor) + '">';

      var tableHtml = visibleProjects.length
        ? '<div class="card table-wrap"><table class="data-table"><thead><tr>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colName')) + '</th>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colEntries')) + '</th>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colTotalTime')) + '</th>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colShare')) + '</th>' +
          '<th style="text-align:right;">' + App.utils.escapeHtml(App.i18n.t('common.actions')) + '</th>' +
          '</tr></thead><tbody>' +
          visibleProjects.map(function (p) {
            var st = projStats[p.id] || { count: 0, ms: 0 };
            var pct = totalAllMs > 0 ? (st.ms / totalAllMs) * 100 : 0;
            return '<tr data-proj-row="' + App.utils.escapeHtml(p.id) + '">' +
              '<td><div style="display:flex;align-items:center;gap:8px;font-weight:500;">' +
              '<span class="project-dot" style="background:' + App.utils.escapeHtml(p.color) + '"></span>' +
              '<span style="color:' + App.utils.escapeHtml(p.color) + ';">' + App.utils.escapeHtml(p.name) + '</span>' +
              (p.archived ? '<span class="archived-badge">' + App.utils.escapeHtml(App.i18n.t('common.archived')) + '</span>' : '') +
              '</div></td>' +
              '<td class="mono">' + st.count + '</td>' +
              '<td class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(st.ms, settings.durationFormat)) + '</td>' +
              '<td style="min-width:120px;"><div style="display:flex;align-items:center;gap:8px;"><div class="breakdown-bar-track" style="flex:1;"><div class="breakdown-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + App.utils.escapeHtml(p.color) + ';"></div></div><span class="mono muted" style="font-size:11.5px;width:36px;text-align:right;">' + pct.toFixed(0) + '%</span></div></td>' +
              '<td><div class="manage-row-actions">' +
              '<button type="button" class="btn btn-ghost btn-icon-sm" data-proj-edit title="' + App.utils.escapeHtml(App.i18n.t('common.edit')) + '">' + App.icon('edit', 'icon-sm') + '</button>' +
              (projects.length > 1 ? '<button type="button" class="btn btn-ghost btn-icon-sm" data-proj-merge title="' + App.utils.escapeHtml(App.i18n.t('manage.mergeProject')) + '">' + App.icon('merge', 'icon-sm') + '</button>' : '') +
              '<button type="button" class="btn btn-ghost btn-icon-sm" data-proj-archive title="' + App.utils.escapeHtml(App.i18n.t(p.archived ? 'manage.restoreProject' : 'manage.archiveProject')) + '">' + App.icon('archive', 'icon-sm') + '</button>' +
              '<button type="button" class="btn btn-danger-ghost btn-icon-sm" data-proj-del title="' + App.utils.escapeHtml(App.i18n.t('common.delete')) + '">' + App.icon('trash', 'icon-sm') + '</button>' +
              '</div></td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<div class="card empty-state">' +
          '<div class="empty-state-icon">' + App.icon('folder', 'icon-lg') + '</div>' +
          '<div class="empty-state-title">' + App.utils.escapeHtml(App.i18n.t('manage.noProjectsTitle')) + '</div>' +
          '<div class="empty-state-desc">' + App.utils.escapeHtml(App.i18n.t('manage.noProjectsDesc')) + '</div>' +
          '</div>';

      bodyHtml =
        '<form class="card manage-create-bar" data-create-project-form>' +
        '<input type="text" class="input" style="flex:1 1 200px;" data-new-proj-name placeholder="' + App.utils.escapeHtml(App.i18n.t('manage.newProjectPlaceholder')) + '">' +
        '<div class="color-palette">' + swatchesHtml + '</div>' +
        '<button type="submit" class="btn btn-primary">' + App.icon('plus', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('manage.createProject')) + '</span></button>' +
        '</form>' +
        '<div style="display:flex;justify-content:flex-end;">' +
        '<label style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-secondary);cursor:pointer;">' +
        '<input type="checkbox" data-toggle-archived' + (ui.showArchived ? ' checked' : '') + '> ' + App.utils.escapeHtml(App.i18n.t('manage.showArchived')) +
        '</label>' +
        '</div>' +
        tableHtml;
    } else {
      var tagsTableHtml = tags.length
        ? '<div class="card table-wrap"><table class="data-table"><thead><tr>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colName')) + '</th>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colEntries')) + '</th>' +
          '<th>' + App.utils.escapeHtml(App.i18n.t('manage.colTotalTime')) + '</th>' +
          '<th style="text-align:right;">' + App.utils.escapeHtml(App.i18n.t('common.actions')) + '</th>' +
          '</tr></thead><tbody>' +
          tags.map(function (t) {
            var st = tagStats[t.id] || { count: 0, ms: 0 };
            return '<tr data-tag-row="' + App.utils.escapeHtml(t.id) + '">' +
              '<td><span class="tag-pill">' + App.icon('tag', 'icon-sm') + '<span>' + App.utils.escapeHtml(t.name) + '</span></span></td>' +
              '<td class="mono">' + st.count + '</td>' +
              '<td class="mono">' + App.utils.escapeHtml(App.utils.formatDuration(st.ms, settings.durationFormat)) + '</td>' +
              '<td><div class="manage-row-actions">' +
              '<button type="button" class="btn btn-ghost btn-icon-sm" data-tag-rename title="' + App.utils.escapeHtml(App.i18n.t('common.edit')) + '">' + App.icon('edit', 'icon-sm') + '</button>' +
              (tags.length > 1 ? '<button type="button" class="btn btn-ghost btn-icon-sm" data-tag-merge title="' + App.utils.escapeHtml(App.i18n.t('manage.mergeTag')) + '">' + App.icon('merge', 'icon-sm') + '</button>' : '') +
              '<button type="button" class="btn btn-danger-ghost btn-icon-sm" data-tag-del title="' + App.utils.escapeHtml(App.i18n.t('common.delete')) + '">' + App.icon('trash', 'icon-sm') + '</button>' +
              '</div></td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<div class="card empty-state">' +
          '<div class="empty-state-icon">' + App.icon('tag', 'icon-lg') + '</div>' +
          '<div class="empty-state-title">' + App.utils.escapeHtml(App.i18n.t('manage.noTagsTitle')) + '</div>' +
          '<div class="empty-state-desc">' + App.utils.escapeHtml(App.i18n.t('manage.noTagsDesc')) + '</div>' +
          '</div>';

      bodyHtml =
        '<form class="card manage-create-bar" data-create-tag-form>' +
        '<input type="text" class="input" style="flex:1 1 240px;" data-new-tag-name placeholder="' + App.utils.escapeHtml(App.i18n.t('manage.newTagPlaceholder')) + '">' +
        '<button type="submit" class="btn btn-primary">' + App.icon('plus', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('manage.createTag')) + '</span></button>' +
        '</form>' +
        tagsTableHtml;
    }

    root.innerHTML =
      '<div class="view-container">' +
      '<div class="view-header">' +
      '<div class="view-title-group">' +
      '<h1 class="view-title">' + App.utils.escapeHtml(App.i18n.t('manage.title')) + '</h1>' +
      '<p class="view-subtitle">' + App.utils.escapeHtml(App.i18n.t('manage.subtitle')) + '</p>' +
      '</div>' +
      '<div class="segmented">' +
      '<button type="button" class="segmented-btn' + (ui.tab === 'projects' ? ' is-active' : '') + '" data-manage-tab="projects">' + App.icon('folder', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('manage.tabProjects')) + ' (' + projects.length + ')</span></button>' +
      '<button type="button" class="segmented-btn' + (ui.tab === 'tags' ? ' is-active' : '') + '" data-manage-tab="tags">' + App.icon('tag', 'icon-sm') + '<span>' + App.utils.escapeHtml(App.i18n.t('manage.tabTags')) + ' (' + tags.length + ')</span></button>' +
      '</div>' +
      '</div>' +
      bodyHtml +
      '</div>';

    wireManageEvents(root);
  }

  function wireManageEvents(root) {
    var ui = App.state.getUi().manage;

    var tabBtns = root.querySelectorAll('[data-manage-tab]');
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function () {
        ui.tab = this.getAttribute('data-manage-tab');
        renderManage(root);
      });
    }

    if (ui.tab === 'projects') {
      var swatches = root.querySelectorAll('[data-new-swatch]');
      for (var s = 0; s < swatches.length; s++) {
        swatches[s].addEventListener('click', function () {
          selectedNewColor = this.getAttribute('data-new-swatch');
          renderManage(root);
        });
      }
      var customClr = root.querySelector('[data-new-custom-color]');
      if (customClr) {
        customClr.addEventListener('input', function () {
          selectedNewColor = this.value;
        });
      }

      var projForm = root.querySelector('[data-create-project-form]');
      projForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = projForm.querySelector('[data-new-proj-name]');
        var name = nameInput.value.trim();
        if (!name) {
          App.components.showToast(App.i18n.t('toasts.validationMissingName'), { type: 'error' });
          return;
        }
        App.state.addProject({ name: name, color: selectedNewColor }).then(function () {
          selectedNewColor = App.state.getNextProjectColor();
          App.components.showToast(App.i18n.t('toasts.projectCreated', { name: name }));
        });
      });

      var archToggle = root.querySelector('[data-toggle-archived]');
      if (archToggle) {
        archToggle.addEventListener('change', function () {
          ui.showArchived = archToggle.checked;
          renderManage(root);
        });
      }

      var pMap = App.state.getProjectsMap();
      var allProjects = App.state.getProjects();
      var projRows = root.querySelectorAll('[data-proj-row]');
      for (var r = 0; r < projRows.length; r++) {
        (function (rowEl) {
          var id = rowEl.getAttribute('data-proj-row');
          var proj = pMap[id];
          if (!proj) return;

          rowEl.querySelector('[data-proj-edit]').addEventListener('click', function () {
            openEditProjectModal(proj);
          });
          var projMergeBtn = rowEl.querySelector('[data-proj-merge]');
          if (projMergeBtn) {
            projMergeBtn.addEventListener('click', function () {
              openMergeProjectModal(proj, allProjects);
            });
          }
          rowEl.querySelector('[data-proj-archive]').addEventListener('click', function () {
            App.state.updateProject(id, { archived: !proj.archived }).then(function () {
              App.components.showToast(App.i18n.t('toasts.projectUpdated'));
            });
          });
          rowEl.querySelector('[data-proj-del]').addEventListener('click', function () {
            App.components.openConfirmModal({
              title: App.i18n.t('manage.deleteProjectTitle'),
              message: App.i18n.t('manage.deleteProjectMessage', { name: proj.name }),
              confirmLabel: App.i18n.t('common.delete'),
              danger: true,
              onConfirm: function () {
                App.state.deleteProject(id).then(function () {
                  App.components.showToast(App.i18n.t('toasts.projectDeleted'));
                });
              }
            });
          });
        })(projRows[r]);
      }
    } else {
      var tagForm = root.querySelector('[data-create-tag-form]');
      tagForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = tagForm.querySelector('[data-new-tag-name]');
        var name = nameInput.value.trim();
        if (!name) {
          App.components.showToast(App.i18n.t('toasts.validationMissingName'), { type: 'error' });
          return;
        }
        App.state.addTag({ name: name }).then(function () {
          App.components.showToast(App.i18n.t('toasts.tagCreated', { name: name }));
        });
      });

      var tMap = App.state.getTagsMap();
      var allTags = App.state.getTags();
      var tagRows = root.querySelectorAll('[data-tag-row]');
      for (var tr = 0; tr < tagRows.length; tr++) {
        (function (rowEl) {
          var id = rowEl.getAttribute('data-tag-row');
          var tag = tMap[id];
          if (!tag) return;

          rowEl.querySelector('[data-tag-rename]').addEventListener('click', function () {
            var btn = this;
            App.components.openPopover(btn, function (pop, close) {
              pop.innerHTML =
                '<div style="display:flex;gap:6px;padding:2px;">' +
                '<input type="text" class="input input-sm" data-rename-input value="' + App.utils.escapeHtml(tag.name) + '">' +
                '<button type="button" class="btn btn-primary btn-sm" data-rename-save>' + App.utils.escapeHtml(App.i18n.t('common.save')) + '</button>' +
                '</div>';
              var inp = pop.querySelector('[data-rename-input]');
              function submitRename() {
                var val = inp.value.trim();
                if (!val) return;
                App.state.renameTag(id, val).then(function () {
                  close();
                  App.components.showToast(App.i18n.t('toasts.tagRenamed'));
                });
              }
              pop.querySelector('[data-rename-save]').addEventListener('click', submitRename);
              inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
              });
              setTimeout(function () { inp.focus(); inp.select(); }, 0);
            });
          });

          var mergeBtn = rowEl.querySelector('[data-tag-merge]');
          if (mergeBtn) {
            mergeBtn.addEventListener('click', function () {
              openMergeTagModal(tag, allTags);
            });
          }

          rowEl.querySelector('[data-tag-del]').addEventListener('click', function () {
            App.components.openConfirmModal({
              title: App.i18n.t('manage.deleteTagTitle'),
              message: App.i18n.t('manage.deleteTagMessage', { name: tag.name }),
              confirmLabel: App.i18n.t('common.delete'),
              danger: true,
              onConfirm: function () {
                App.state.deleteTag(id).then(function () {
                  App.components.showToast(App.i18n.t('toasts.tagDeleted'));
                });
              }
            });
          });
        })(tagRows[tr]);
      }
    }
  }

  App.views.manage = {
    render: function (root) {
      renderManage(root);

      var unsubs = [
        App.state.subscribe('projects:change', function () { renderManage(root); }),
        App.state.subscribe('tags:change', function () { renderManage(root); }),
        App.state.subscribe('entries:change', function () { renderManage(root); }),
        App.state.subscribe('settings:change', function () { renderManage(root); })
      ];

      return function cleanup() {
        for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      };
    }
  };
})(window.TimApp);
