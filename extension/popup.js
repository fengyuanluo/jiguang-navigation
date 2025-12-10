const STORAGE_KEYS = {
  GROUPS: 'aurora_groups',
  SETTINGS: 'aurora_settings'
};

const tabs = document.querySelectorAll('.tab');
const views = {
  home: document.getElementById('home-view'),
  add: document.getElementById('add-view'),
  settings: document.getElementById('settings-view')
};
const groupsContainer = document.getElementById('groups-container');
const homeEmpty = document.getElementById('home-empty');
const homeTip = document.getElementById('home-tip');
const addForm = document.getElementById('add-form');
const addTitle = document.getElementById('add-title');
const addUrl = document.getElementById('add-url');
const addGroupSelect = document.getElementById('add-group');
const settingsForm = document.getElementById('settings-form');
const settingHost = document.getElementById('setting-host');
const settingUsername = document.getElementById('setting-username');
const settingPassword = document.getElementById('setting-password');
const btnSync = document.getElementById('btn-sync');
const btnImport = document.getElementById('btn-import-bookmarks');
const btnExport = document.getElementById('btn-export-bookmarks');
const inputImport = document.getElementById('input-import-bookmarks');
const toastEl = document.getElementById('toast');

let groups = [];
let settingsCache = {};

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (settingsCache.username || settingsCache.password) {
    const token = btoa(`${settingsCache.username || ''}:${settingsCache.password || ''}`);
    headers['Authorization'] = `Basic ${token}`;
  }
  return headers;
}

// ---------- UI Helper ----------
function switchView(view) {
  Object.values(views).forEach((el) => el.classList.remove('active'));
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  views[view].classList.add('active');
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 1800);
}

// ---------- Storage Helpers ----------
async function loadGroups() {
  const { [STORAGE_KEYS.GROUPS]: stored = [] } = await chrome.storage.sync.get(STORAGE_KEYS.GROUPS);
  groups = Array.isArray(stored) ? stored : [];
}

async function saveGroups(next) {
  groups = next;
  await chrome.storage.sync.set({ [STORAGE_KEYS.GROUPS]: next });
}

async function loadSettings() {
  const { [STORAGE_KEYS.SETTINGS]: settings = {} } = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  settingsCache = settings;
  return settings;
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

// ---------- Render ----------
function renderGroups() {
  groupsContainer.innerHTML = '';
  if (!groups.length) {
    homeEmpty.style.display = 'block';
    homeTip.style.display = settingsCache.host ? 'none' : 'block';
    return;
  }
  homeEmpty.style.display = 'none';
  homeTip.style.display = 'none';

  groups.forEach((group) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'group';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `<h4>${group.name}</h4><span>共 ${group.bookmarks?.length || 0} 条</span>`;

    const body = document.createElement('div');
    body.className = 'group-body';
    body.style.display = 'none';

    (group.bookmarks || []).slice().reverse().forEach((bm) => {
      const item = document.createElement('div');
      item.className = 'bookmark';
      item.innerHTML = `<a href="${bm.url}" target="_blank">${bm.title || bm.url}</a><span>${new URL(bm.url).hostname}</span>`;
      body.appendChild(item);
    });

    header.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    groupsContainer.appendChild(wrapper);
  });
}

function renderGroupSelect() {
  addGroupSelect.innerHTML = '';
  groups.forEach((g) => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    addGroupSelect.appendChild(option);
  });
}

// ---------- Actions ----------
async function handleAddBookmark(evt) {
  evt.preventDefault();
  if (!groups.length) {
    showToast('请先同步分组');
    return;
  }
  const title = addTitle.value.trim();
  const url = addUrl.value.trim();
  const groupId = addGroupSelect.value;
  if (!title || !url) return;

  const host = settingsCache.host?.replace(/\/$/, '');
  let serverOk = false;
  if (host) {
    try {
      const headers = buildHeaders();
      const payload = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        name: title,
        url,
        desc: '',
        category: groupId,
        color: '#6366F1',
        icon: 'Globe',
        iconType: 'auto',
        order: Date.now(),
        isHidden: false
      };
      const resp = await fetch(`${host}/api/sites`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      serverOk = resp.ok;
    } catch (e) {
      serverOk = false;
    }
  }

  // 本地兜底，保证 UI 立即可见
  const next = groups.map((g) => {
    if (g.id !== groupId) return g;
    const deduped = g.bookmarks?.filter((b) => b.url !== url) || [];
    return { ...g, bookmarks: [...deduped, { title, url, createdAt: Date.now() }] };
  });
  await saveGroups(next);

  showToast(serverOk ? '已同步至服务器' : '已保存（服务器未响应，已本地缓存）');
  addForm.reset();
  await init(); // refresh lists
}

async function handleSaveSettings(evt) {
  evt.preventDefault();
  await saveSettings({
    host: settingHost.value.trim(),
    username: settingUsername.value.trim(),
    password: settingPassword.value
  });
  showToast('设置已保存');
  await fetchGroupsFromServer();
}

function parseBookmarksHtml(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const rootDl = doc.querySelector('dl');
  if (!rootDl) return [];
  const result = [];

  function collectAnchors(dl) {
    const items = [];
    for (const dt of dl.children) {
      if (dt.tagName?.toLowerCase() !== 'dt') continue;
      const first = dt.firstElementChild;
      if (!first) continue;
      if (first.tagName?.toLowerCase() === 'a') {
        items.push({ title: first.textContent || first.href, url: first.href });
      }
    }
    return items;
  }

  function walk(dl) {
    for (let i = 0; i < dl.children.length; i++) {
      const dt = dl.children[i];
      if (dt.tagName?.toLowerCase() !== 'dt') continue;
      const h3 = dt.querySelector('h3');
      if (h3) {
        const catName = h3.textContent?.trim() || '未命名';
        const sibling = dt.nextElementSibling;
        if (sibling && sibling.tagName?.toLowerCase() === 'dl') {
          const bookmarks = collectAnchors(sibling);
          if (bookmarks.length) {
            result.push({ name: catName, bookmarks });
          }
          // 继续深入，以支持嵌套子分类
          walk(sibling);
        }
      }
    }
  }

  walk(rootDl);
  return result;
}

function buildBookmarksHtml(groupsData) {
  const now = Math.floor(Date.now() / 1000);
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Aurora Bookmarks</TITLE>
<H1>Aurora Bookmarks</H1>
<DL><p>
`;
  for (const group of groupsData) {
    html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${group.name}</H3>\n    <DL><p>\n`;
    for (const bm of group.bookmarks || []) {
      const safeTitle = (bm.title || bm.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const url = bm.url || '';
      html += `        <DT><A HREF="${url}" ADD_DATE="${now}">${safeTitle}</A>\n`;
    }
    html += '    </DL><p>\n';
  }
  html += '</DL><p>';
  return html;
}

async function handleImportBookmarks(evt) {
  const file = evt.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsedGroups = parseBookmarksHtml(text);
  if (!parsedGroups.length) {
    showToast('未解析到书签');
    return;
  }

  const host = settingsCache.host?.replace(/\/$/, '');
  const headers = buildHeaders();
  const now = Date.now();
  let merged = [...groups];

  for (const g of parsedGroups) {
    const exist = merged.find((x) => x.name === g.name);
    if (!exist) {
      merged.push({
        id: g.name,
        name: g.name,
        bookmarks: []
      });
    }
    const target = merged.find((x) => x.name === g.name);
    const currentUrls = new Set((target.bookmarks || []).map((b) => b.url));
    const toAdd = [];
    for (const bm of g.bookmarks || []) {
      if (!bm.url || currentUrls.has(bm.url)) continue;
      const item = { title: bm.title || bm.url, url: bm.url, createdAt: now };
      target.bookmarks.push(item);
      toAdd.push(item);
      currentUrls.add(bm.url);
    }

    // 推送到服务器
    if (host && toAdd.length) {
      for (const bm of toAdd) {
        const payload = {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
          name: bm.title,
          url: bm.url,
          desc: '',
          category: g.name,
          color: '#6366F1',
          icon: 'Globe',
          iconType: 'auto',
          order: Date.now(),
          isHidden: false
        };
        try {
          await fetch(`${host}/api/sites`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
        } catch (_) {
          // ignore server failure; local已合并
        }
      }
    }
  }

  await saveGroups(merged);
  renderGroups();
  renderGroupSelect();
  showToast('导入完成');
  inputImport.value = '';
}

function handleExportBookmarks() {
  const html = buildBookmarksHtml(groups);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Aurora_Bookmarks_${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('导出完成');
}

async function fetchGroupsFromServer() {
  if (!settingsCache.host) {
    homeTip.style.display = 'block';
    showToast('请先填写服务器地址');
    return;
  }

  try {
    const base = settingsCache.host.replace(/\/$/, '');
    const resp = await fetch(`${base}/api/init`, { credentials: 'include' });
    if (!resp.ok) throw new Error(`Server ${resp.status}`);
    const data = await resp.json();
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const sites = Array.isArray(data.sites) ? data.sites : [];

  const mapped = categories.map((cat) => {
    const catName = cat.name || cat;
    const catSites = sites.filter((s) => s.category === catName);
    return {
      id: catName || crypto.randomUUID(),
      name: catName || '未命名',
      bookmarks: catSites.map((s) => ({
        title: s.name || s.url,
        url: s.url,
        createdAt: s.createdAt || Date.now()
      }))
    };
  });

    await saveGroups(mapped);
    renderGroups();
    renderGroupSelect();
    showToast('分组已同步');
  } catch (err) {
    console.error(err);
    showToast('同步失败，请检查配置');
  }
}

async function init() {
  await loadGroups();
  renderGroups();
  renderGroupSelect();
  const settings = await loadSettings();
  settingHost.value = settings.host || '';
  settingUsername.value = settings.username || '';
  settingPassword.value = settings.password || '';

  // 首次尝试从服务器拉取
  if (settings.host) {
    await fetchGroupsFromServer();
  }

  // 预填当前标签页
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      addTitle.value = tab.title || '';
      addUrl.value = tab.url || '';
    }
  } catch (_) { /* ignore */ }
}

// ---------- Events ----------
tabs.forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
addForm.addEventListener('submit', handleAddBookmark);
settingsForm.addEventListener('submit', handleSaveSettings);
btnSync.addEventListener('click', fetchGroupsFromServer);
btnImport.addEventListener('click', () => inputImport.click());
btnExport.addEventListener('click', handleExportBookmarks);
inputImport.addEventListener('change', handleImportBookmarks);

init();
