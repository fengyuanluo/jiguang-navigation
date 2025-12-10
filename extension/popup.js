const STORAGE_KEYS = {
  GROUPS: 'aurora_groups',
  SETTINGS: 'aurora_settings'
};

// 分组数据量大，使用 local 避开 sync 8KB 单项限制；设置数据小且希望同步，仍用 sync
const GROUPS_STORE = chrome.storage.local;
const SETTINGS_STORE = chrome.storage.sync;

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
  const { [STORAGE_KEYS.GROUPS]: stored = [] } = await GROUPS_STORE.get(STORAGE_KEYS.GROUPS);
  groups = Array.isArray(stored) ? stored : [];
}

async function saveGroups(next) {
  groups = next;
  await GROUPS_STORE.set({ [STORAGE_KEYS.GROUPS]: next });
}

async function loadSettings() {
  const { [STORAGE_KEYS.SETTINGS]: settings = {} } = await SETTINGS_STORE.get(STORAGE_KEYS.SETTINGS);
  settingsCache = settings;
  return settings;
}

async function saveSettings(settings) {
  await SETTINGS_STORE.set({ [STORAGE_KEYS.SETTINGS]: settings });
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

init();
