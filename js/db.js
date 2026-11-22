(function (App) {
  'use strict';

  var DB_NAME = 'timapp_db';
  var DB_VERSION = 1;
  var LS_KEY = 'timapp_db_v1';

  var idb = null;
  var backend = 'indexedDB';
  var memoryFallback = {
    entries: [],
    projects: [],
    tags: [],
    meta: {}
  };

  function emptyStore() {
    return {
      entries: [],
      projects: [],
      tags: [],
      meta: {}
    };
  }

  function readLsStore() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {}
      };
    } catch (e) {
      return memoryFallback;
    }
  }

  function writeLsStore(data) {
    memoryFallback = data;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      // Keep memoryFallback if quota or storage is blocked
    }
  }

  function upsertArrayItem(arr, item) {
    var next = arr.slice();
    var idx = -1;
    for (var i = 0; i < next.length; i++) {
      if (next[i].id === item.id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) next[idx] = item;
    else next.push(item);
    return next;
  }

  function removeArrayItem(arr, id) {
    return arr.filter(function (item) {
      return item.id !== id;
    });
  }

  function openIndexedDb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error('IndexedDB open timeout'));
        }
      }, 800);

      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (evt) {
          var db = evt.target.result;
          if (!db.objectStoreNames.contains('entries')) {
            var entryStore = db.createObjectStore('entries', { keyPath: 'id' });
            entryStore.createIndex('startTime', 'startTime', { unique: false });
          }
          if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('tags')) {
            db.createObjectStore('tags', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
        };
        req.onsuccess = function (evt) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(evt.target.result);
        };
        req.onerror = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(req.error || new Error('IndexedDB open error'));
        };
        req.onblocked = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error('IndexedDB blocked'));
        };
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }

  function idbGetAll(storeName) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(storeName, 'readonly');
      var store = tx.objectStore(storeName);
      var req = store.getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function idbPut(storeName, value) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      store.put(value);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function idbDelete(storeName, key) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  App.db = {
    getBackendName: function () {
      return backend;
    },

    init: function () {
      return openIndexedDb().then(function (database) {
        idb = database;
        backend = 'IndexedDB';
        return backend;
      }).catch(function () {
        idb = null;
        try {
          window.localStorage.setItem('__timapp_probe__', '1');
          window.localStorage.removeItem('__timapp_probe__');
          backend = 'localStorage (fallback)';
        } catch (e) {
          backend = 'Memory (fallback)';
        }
        return backend;
      });
    },

    getAllData: function () {
      if (idb) {
        return Promise.all([
          idbGetAll('entries'),
          idbGetAll('projects'),
          idbGetAll('tags'),
          idbGetAll('meta')
        ]).then(function (res) {
          var metaMap = {};
          for (var i = 0; i < res[3].length; i++) {
            metaMap[res[3][i].key] = res[3][i].value;
          }
          return {
            entries: res[0],
            projects: res[1],
            tags: res[2],
            settings: metaMap.settings || null,
            activeTimer: metaMap.activeTimer || null
          };
        });
      }
      var store = readLsStore();
      return Promise.resolve({
        entries: store.entries,
        projects: store.projects,
        tags: store.tags,
        settings: store.meta.settings || null,
        activeTimer: store.meta.activeTimer || null
      });
    },

    putEntry: function (entry) {
      if (idb) return idbPut('entries', entry);
      var store = readLsStore();
      store.entries = upsertArrayItem(store.entries, entry);
      writeLsStore(store);
      return Promise.resolve();
    },

    deleteEntry: function (id) {
      if (idb) return idbDelete('entries', id);
      var store = readLsStore();
      store.entries = removeArrayItem(store.entries, id);
      writeLsStore(store);
      return Promise.resolve();
    },

    putProject: function (project) {
      if (idb) return idbPut('projects', project);
      var store = readLsStore();
      store.projects = upsertArrayItem(store.projects, project);
      writeLsStore(store);
      return Promise.resolve();
    },

    deleteProject: function (id) {
      if (idb) return idbDelete('projects', id);
      var store = readLsStore();
      store.projects = removeArrayItem(store.projects, id);
      writeLsStore(store);
      return Promise.resolve();
    },

    putTag: function (tag) {
      if (idb) return idbPut('tags', tag);
      var store = readLsStore();
      store.tags = upsertArrayItem(store.tags, tag);
      writeLsStore(store);
      return Promise.resolve();
    },

    deleteTag: function (id) {
      if (idb) return idbDelete('tags', id);
      var store = readLsStore();
      store.tags = removeArrayItem(store.tags, id);
      writeLsStore(store);
      return Promise.resolve();
    },

    putMeta: function (key, value) {
      if (idb) return idbPut('meta', { key: key, value: value });
      var store = readLsStore();
      store.meta[key] = value;
      writeLsStore(store);
      return Promise.resolve();
    },

    deleteMeta: function (key) {
      if (idb) return idbDelete('meta', key);
      var store = readLsStore();
      delete store.meta[key];
      writeLsStore(store);
      return Promise.resolve();
    },

    replaceAllData: function (payload) {
      var entries = payload.entries || [];
      var projects = payload.projects || [];
      var tags = payload.tags || [];
      var settings = payload.settings || null;
      var activeTimer = payload.activeTimer || null;

      if (idb) {
        return new Promise(function (resolve, reject) {
          var tx = idb.transaction(['entries', 'projects', 'tags', 'meta'], 'readwrite');
          var eStore = tx.objectStore('entries');
          var pStore = tx.objectStore('projects');
          var tStore = tx.objectStore('tags');
          var mStore = tx.objectStore('meta');

          eStore.clear();
          pStore.clear();
          tStore.clear();
          mStore.clear();

          for (var i = 0; i < entries.length; i++) eStore.put(entries[i]);
          for (var j = 0; j < projects.length; j++) pStore.put(projects[j]);
          for (var k = 0; k < tags.length; k++) tStore.put(tags[k]);
          if (settings) mStore.put({ key: 'settings', value: settings });
          if (activeTimer) mStore.put({ key: 'activeTimer', value: activeTimer });

          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { reject(tx.error); };
        });
      }

      writeLsStore({
        entries: entries,
        projects: projects,
        tags: tags,
        meta: {
          settings: settings,
          activeTimer: activeTimer
        }
      });
      return Promise.resolve();
    },

    clearAllData: function () {
      if (idb) {
        return new Promise(function (resolve, reject) {
          var tx = idb.transaction(['entries', 'projects', 'tags', 'meta'], 'readwrite');
          tx.objectStore('entries').clear();
          tx.objectStore('projects').clear();
          tx.objectStore('tags').clear();
          tx.objectStore('meta').clear();
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { reject(tx.error); };
        });
      }
      writeLsStore(emptyStore());
      return Promise.resolve();
    }
  };
})(window.TimApp);
