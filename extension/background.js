const MENU_ROOT_ID = 'aurora-add-to-group';
const STORAGE_KEYS = {
  GROUPS: 'aurora_groups',
  SETTINGS: 'aurora_settings'
};

const GROUPS_STORE = chrome.storage.local; // 分组体积大，使用 local 避免 sync 单项 8KB 限制
const SETTINGS_STORE = chrome.storage.sync; // 设置体积小，仍用 sync 以便跨设备

function buildHeaders(settings) {
  const headers = { 'Content-Type': 'application/json' };
  if (settings?.username || settings?.password) {
    const token = btoa(`${settings.username || ''}:${settings.password || ''}`);
    headers['Authorization'] = `Basic ${token}`;
  }
  return headers;
}

async function getSettings() {
  const { [STORAGE_KEYS.SETTINGS]: settings = {} } = await SETTINGS_STORE.get(STORAGE_KEYS.SETTINGS);
  return settings;
}

chrome.runtime.onInstalled.addListener(async () => {
  // 不再创建默认分组，等待用户在弹窗中配置服务器并同步
  await rebuildContextMenus();
});

// 浏览器重启或 service worker 重新唤醒时也补充菜单
chrome.runtime.onStartup?.addListener(async () => {
  await rebuildContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === 'local' || area === 'sync') && changes[STORAGE_KEYS.GROUPS]) {
    rebuildContextMenus();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith(MENU_ROOT_ID) || !tab?.url) return;
  const groupId = info.menuItemId.replace(`${MENU_ROOT_ID}-`, '');
  const title = tab.title || tab.url;
  await addBookmarkToGroup(groupId, { title, url: tab.url });
});

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();
  const { [STORAGE_KEYS.GROUPS]: groups = [] } = await GROUPS_STORE.get(STORAGE_KEYS.GROUPS);
  chrome.contextMenus.create({
    id: MENU_ROOT_ID,
    title: '添加到书签分组',
    contexts: ['page', 'selection', 'link', 'image', 'video', 'audio', 'all']
  });

  if (!groups.length) {
    chrome.contextMenus.create({
      id: `${MENU_ROOT_ID}-empty`,
      parentId: MENU_ROOT_ID,
      title: '请先在弹窗中同步分组',
      enabled: false,
      contexts: ['page']
    });
    return;
  }

  groups.forEach((group) => {
    chrome.contextMenus.create({
      id: `${MENU_ROOT_ID}-${group.id}`,
      parentId: MENU_ROOT_ID,
      title: `添加到：${group.name}`,
      contexts: ['page', 'selection', 'link', 'image', 'video', 'audio', 'all']
    });
  });
}

async function addBookmarkToGroup(groupId, bookmark) {
  const { [STORAGE_KEYS.GROUPS]: groups = [] } = await GROUPS_STORE.get(STORAGE_KEYS.GROUPS);
  const target = groups.find((g) => g.id === groupId);
  const settings = await getSettings();
  const host = settings?.host?.replace(/\/$/, '');

  // 优先尝试写入服务器
  let serverOk = false;
  if (host) {
    try {
      const headers = buildHeaders(settings);
      const payload = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        name: bookmark.title || bookmark.url,
        url: bookmark.url,
        desc: '',
        category: target?.name || groupId,
        color: '#6366F1',
        icon: 'Globe',
        iconType: 'auto',
        order: Math.floor(Date.now() / 1000),
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
    const deduped = g.bookmarks?.filter((b) => b.url !== bookmark.url) || [];
    return { ...g, bookmarks: [...deduped, { ...bookmark, createdAt: Date.now() }] };
  });
  // 与弹窗存储保持一致，写回 local，保证右键菜单读取到最新分组
  await GROUPS_STORE.set({ [STORAGE_KEYS.GROUPS]: next });
}
