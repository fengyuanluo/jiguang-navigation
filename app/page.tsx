"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Settings, Plus, LogIn, LogOut, LayoutGrid, Edit3, Trash2,
  ExternalLink, Globe, Github, Youtube, Twitter, Code, Briefcase, Coffee,
  Image as ImageIcon, X, Moon, Sun, ChevronDown, Monitor, EyeOff, Eye,
  Palette, List, Music, MessageSquare, Gamepad, BookOpen, Zap, Cloud,
  Activity, MoreHorizontal, Download, UploadCloud, Copy, ArrowUp, ArrowDown,
  Type, Link as LinkIcon, Layout, HardDrive, Lock, User, Clock, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, CloudRain, CloudSnow, CloudLightning,
  SunMedium, Wind, Image as WallpaperIcon, ImagePlus, Hash, MapPin, Sparkles, Check, Command,
  Move, Terminal, Droplet, PaintBucket, ZoomIn, GripVertical
} from 'lucide-react';

// --- dnd-kit Imports ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Helper Functions ---

const getAccessibleTextColor = (hexColor: string) => {
  if (!hexColor) return '#000000';
  const r = parseInt(hexColor.substr(1, 2), 16) / 255;
  const g = parseInt(hexColor.substr(3, 2), 16) / 255;
  const b = parseInt(hexColor.substr(5, 2), 16) / 255;
  const getVal = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * getVal(r) + 0.7152 * getVal(g) + 0.0722 * getVal(b);
  return L > 0.55 ? '#0f172a' : '#ffffff';
};

const shouldUseTextShadow = (textColor: string) => textColor === '#ffffff';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : {
    r: 0,
    g: 0,
    b: 0
  };
}

const getRandomColor = () => HARMONIOUS_COLORS[Math.floor(Math.random() * HARMONIOUS_COLORS.length)];

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substring(2);
};

// Base64 Noise Texture - Modified: Reduced opacity from 0.4 to 0.2 in SVG for subtler effect
const NOISE_BASE64 = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.2'/%3E%3C/svg%3E";

// --- City Translation Dictionary for Weather Widget ---
const CITY_TRANSLATIONS: Record<string, string> = {
  'Beijing': '北京', 'Shanghai': '上海', 'Guangzhou': '广州', 'Shenzhen': '深圳',
  'Chengdu': '成都', 'Hangzhou': '杭州', 'Wuhan': '武汉', 'Chongqing': '重庆',
  'Nanjing': '南京', 'Tianjin': '天津', 'Suzhou': '苏州', 'Xi\'an': '西安',
  'Xian': '西安', 'Changsha': '长沙', 'Shenyang': '沈阳', 'Qingdao': '青岛',
  'Zhengzhou': '郑州', 'Dalian': '大连', 'Dongguan': '东莞', 'Ningbo': '宁波',
  'Xiamen': '厦门', 'Fuzhou': '福州', 'Harbin': '哈尔滨', 'Jinan': '济南',
  'Changchun': '长春', 'Wuxi': '无锡', 'Hefei': '合肥', 'Kunming': '昆明',
  'Nanning': '南宁', 'Guiyang': '贵阳', 'Lanzhou': '兰州', 'Haikou': '海口',
  'Nanchang': '南昌', 'Shijiazhuang': '石家庄', 'Urumqi': '乌鲁木齐', 'Taiyuan': '太原',
  'Xining': '西宁', 'Yinchuan': '银川', 'Hohhot': '呼和浩特', 'Lhasa': '拉萨',
  'Hong Kong': '香港', 'Macau': '澳门', 'Taipei': '台北', 'Kaohsiung': '高雄'
};

const translateCity = (englishName: string) => {
  if (!englishName) return '本地';
  const key = Object.keys(CITY_TRANSLATIONS).find(k => k.toLowerCase() === englishName.toLowerCase());
  if (key) return CITY_TRANSLATIONS[key];
  return englishName;
};

// Icon Sources
const FAVICON_PROVIDERS = [
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://api.iowen.cn/favicon/${domain}.png`,
];

const getSimpleFaviconUrl = (url: string) => {
  if (!url) return '';
  try {
    const domain = new URL(url).hostname;
    return FAVICON_PROVIDERS[0](domain);
  } catch (e) {
    return '';
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(date);
};

// --- Fonts ---
const FONTS = [
  {
    id: 'system',
    name: '系统默认',
    family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    url: ''
  },
  {
    id: 'noto-sans-sc',
    name: '思源黑体 (现代)',
    family: '"Noto Sans SC", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap'
  },
  {
    id: 'noto-serif-sc',
    name: '思源宋体 (优雅)',
    family: '"Noto Serif SC", serif',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap'
  },
  {
    id: 'zcool-kuaile',
    name: '站酷快乐体 (趣味)',
    family: '"ZCOOL KuaiLe", cursive',
    url: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap'
  },
  {
    id: 'lxgw-wenkai',
    name: '霞鹜文楷 (书写)',
    family: '"LXGW WenKai", sans-serif',
    url: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css'
  },
  {
    id: 'inter',
    name: 'Inter (西文现代)',
    family: '"Inter", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  },
  {
    id: 'poppins',
    name: 'Poppins (几何)',
    family: '"Poppins", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
  },
  {
    id: 'nunito',
    name: 'Nunito (圆润)',
    family: '"Nunito", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap'
  },
  {
    id: 'playfair',
    name: 'Playfair (典雅)',
    family: '"Playfair Display", serif',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap'
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono (代码)',
    family: '"Roboto Mono", monospace',
    url: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap'
  },
];

// --- Config ---
const SEARCH_ENGINES = [
  { id: 'local', name: '本地', icon: Search, placeholder: '筛选本地导航...' },
  { id: 'baidu', name: '百度', icon: Globe, url: 'https://www.baidu.com/s?wd=', placeholder: '百度一下，你就知道' },
  { id: 'google', name: 'Google', icon: Search, url: 'https://www.google.com/search?q=', placeholder: 'Google Search' },
  { id: 'bing', name: 'Bing', icon: Globe, url: 'https://www.bing.com/search?q=', placeholder: 'Bing Search' },
  { id: 'github', name: 'GitHub', icon: Github, url: 'https://github.com/search?q=', placeholder: 'Search GitHub' },
  {
    id: 'luogu',
    name: '洛谷',
    icon: Code,
    url: 'https://www.luogu.com.cn/problem/',
    placeholder: '搜索题目或 Pxxxx 题号'
  },
];

// --- IMPORTED DATA FROM JSON ---
const INITIAL_CATEGORIES: string[] = [];
const INITIAL_SITES: any[] = [];

const DEFAULT_APP_CONFIG = {
  siteTitle: '极光导航',
  logoText: '极光',
  logoHighlight: '导航',
  logoType: 'text',
  logoImage: '',
  footerText: '© {year} JiGuang. Build your own start page.',
  footerLinks: [{ name: 'GitHub', url: 'https://github.com' }, { name: 'Privacy', url: '#' }]
};

const HARMONIOUS_COLORS = [
  '#3B82F6', '#2563EB', '#6366F1', '#4F46E5', '#0EA5E9', '#06B6D4', '#0891B2', '#475569',
  '#334155', '#64748B', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#F97316',
  '#EA580C', '#EF4444', '#DC2626', '#F59E0B', '#10B981', '#059669', '#14B8A6', '#0D9488', '#84CC16'
];

// New: Fresh & Elegant Colors for Pure Background
const FRESH_BACKGROUND_COLORS = [
  '#F8FAFC', // Slate 50
  '#F0F9FF', // Sky 50
  '#F0FDF4', // Green 50
  '#FEFCE8', // Yellow 50
  '#FEF2F2', // Red 50
  '#FDF4FF', // Fuchsia 50
  '#F5F3FF', // Violet 50
  '#FAFAF9', // Warm Gray 50
  '#ECFEFF', // Cyan 50
  '#FFF7ED'  // Orange 50
];

// New: Elegant Palette for Navigation Pills
const FRESH_NAV_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6'  // Teal
];


const ICON_MAP: any = {
  Globe: Globe, Github: Github, Youtube: Youtube, Twitter: Twitter, Code: Code, Briefcase: Briefcase,
  Coffee: Coffee, ImageIcon: ImageIcon, Music: Music, MessageSquare: MessageSquare, Gamepad: Gamepad,
  BookOpen: BookOpen, Search: Search, Monitor: Monitor, Palette: Palette, Zap: Zap, Cloud: Cloud,
  Activity: Activity, Lock: Lock, User: User,
};

const DEFAULT_LAYOUT_SETTINGS = {
  cardHeight: 100,
  gridCols: 4,
  gap: 5,
  glassOpacity: 70,
  isWideMode: false,
  showWidgets: true,
  stickyHeader: true,
  stickyFooter: false,
  bgEnabled: false,
  bgUrl: '',
  bgType: 'bing', // 'bing' | 'custom' | 'color'
  bgColor: '#F8FAFC', // Default pure background color
  bgOpacity: 40, // Mask opacity
  fontFamily: 'system',
  bgScale: 100, // Default scale 100%
  bgX: 50, // Default center X
  bgY: 50, // Default center Y
  navColorMode: false, // Enable colorful navigation pills
  colorfulCards: false, // Enable colorful site cards
  fontSizeScale: 100 // New: Global Font Size Scale (Percentage)
};

export default function AuroraNav() {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoggedInLoading] = useState(true);
  const [sites, setSites] = useState(INITIAL_SITES);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [layoutSettings, setLayoutSettings] = useState(DEFAULT_LAYOUT_SETTINGS);
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Interaction States
  const [activeTab, setActiveTab] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [currentEngineId, setCurrentEngineId] = useState('local');
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Context Menu State
  const [searchEngine, setSearchEngine] = useState('Google');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, siteId: null, alignRight: false });

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isWallpaperManagerOpen, setIsWallpaperManagerOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [confirmingDeleteCategory, setConfirmingDeleteCategory] = useState<string | null>(null);
  const [confirmingDeleteSite, setConfirmingDeleteSite] = useState<any>(null);
  const [activeSettingTab, setActiveSettingTab] = useState('layout');

  // dnd-kit Sensors - Optimized for Mobile
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Scroll Detection (Throttled) ---
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K to Focus Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      // Esc to Clear/Close
      if (e.key === 'Escape') {
        if (isSearchFocused) {
          setSearchQuery('');
          setIsSearchFocused(false);
          searchInputRef.current?.blur();
        }
        setIsSettingsOpen(false);
        setIsModalOpen(false);
        setIsLoginModalOpen(false);
        setIsEngineMenuOpen(false);
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, contextMenu]);

  // --- Init & Persistence ---
  // --- Init & Persistence ---
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const data = await res.json();
          if (data.sites) setSites(data.sites);
          if (data.categories) {
            setCategories(data.categories.map((c: any) => c.name));
            const colors: Record<string, string> = {};
            const hidden: string[] = [];
            data.categories.forEach((c: any) => {
              if (c.color) colors[c.name] = c.color;
              if (c.isHidden) hidden.push(c.name);
            });
            setCategoryColors(colors);
            setHiddenCategories(hidden);
          }
          if (data.settings) {
            if (data.settings.layout) setLayoutSettings(data.settings.layout);
            if (data.settings.config) setAppConfig(data.settings.config);
            if (data.settings.theme) setIsDarkMode(data.settings.theme.isDarkMode);
            if (data.settings.searchEngine) setSearchEngine(data.settings.searchEngine);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoggedInLoading(false);
      }
    };

    initData();

    if (typeof window !== 'undefined') {
      const savedLogin = localStorage.getItem('aurora_is_logged_in');
      setIsLoggedIn(savedLogin !== null ? JSON.parse(savedLogin) : false);
    }
  }, []);

  // Ensure colors are assigned when categories change
  useEffect(() => {
    const newColors = { ...categoryColors };
    let colorChanged = false;
    categories.forEach((cat, index) => {
      if (!newColors[cat]) {
        newColors[cat] = FRESH_NAV_COLORS[index % FRESH_NAV_COLORS.length];
        colorChanged = true;
      }
    });
    if (colorChanged) {
      setCategoryColors(newColors);
    }
  }, [categories]);

  // Dynamic Font Loading
  useEffect(() => {
    const selectedFont = FONTS.find(f => f.id === layoutSettings.fontFamily);
    if (selectedFont && selectedFont.url) {
      const linkId = 'aurora-custom-font';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = selectedFont.url;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      } else {
        const link = document.getElementById(linkId) as HTMLLinkElement;
        if (link.href !== selectedFont.url) link.href = selectedFont.url;
      }
    }
  }, [layoutSettings.fontFamily]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('aurora_theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => localStorage.setItem('aurora_is_logged_in', JSON.stringify(isLoggedIn)), [isLoggedIn]);
  useEffect(() => {
    document.title = appConfig.siteTitle;
  }, [appConfig.siteTitle]);

  // --- Sync Settings & Categories to DB ---
  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      // Sync Settings
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: layoutSettings,
          config: appConfig,
          theme: { isDarkMode },
          searchEngine: searchEngine
        })
      }).catch(console.error);

      // Sync Categories (Order + Colors + Hidden)
      // Note: The API currently only handles order for bulk update. 
      // We need to update the API to handle full category objects or send separate updates.
      // However, for simplicity, we will update the API to accept full objects or just piggyback on the existing structure if possible.
      // Actually, let's look at the API. It expects { name, order }.
      // We should update the API to accept { name, order, color, isHidden }.

      const payload = categories.map((name, index) => ({
        name,
        order: index,
        color: categoryColors[name],
        isHidden: hiddenCategories.includes(name)
      }));

      fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(console.error);

      // Sync Sites Order
      const sitePayload = sites.map((s, index) => ({ id: s.id, order: index }));
      fetch('/api/sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sitePayload)
      }).catch(console.error);

    }, 2000);
    return () => clearTimeout(timer);
  }, [layoutSettings, appConfig, isDarkMode, categories, sites, isLoggedIn]);


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // --- Event Handlers ---
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    containerRef.current.style.setProperty("--mouse-x", `${e.clientX - left}px`);
    containerRef.current.style.setProperty("--mouse-y", `${e.clientY - top}px`);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && currentEngineId === 'local') {
      const matches = sites.filter(s => s.name.toLowerCase().includes(val.toLowerCase())).map(s => s.name).slice(0, 5);
      setSearchSuggestions(matches);
    } else setSearchSuggestions([]);
  };

  // --- DnD Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    if (!isLoggedIn) return;
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. Construct Visual List (Same logic as render)
    let visualSites = [...sites];
    if (activeTab === '全部') {
      visualSites = categories
        .filter(c => !hiddenCategories.includes(c))
        .flatMap(cat => sites.filter(s => s.category === cat));
    }

    // 2. Find Indices in Visual List
    const oldIndex = visualSites.findIndex((item) => String(item.id) === String(active.id));
    const newIndex = visualSites.findIndex((item) => String(item.id) === String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const activeItem = visualSites[oldIndex];
    const overItem = visualSites[newIndex];

    // 3. Handle Category Change
    let newItem = { ...activeItem };
    if (activeTab === '全部' && activeItem.category !== overItem.category) {
      newItem.category = overItem.category;
    }

    // 4. Move in Visual List
    const newVisualSites = [...visualSites];
    newVisualSites[oldIndex] = newItem;

    const reorderedSites = arrayMove(newVisualSites, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index
    }));

    // 5. Update State & Persist
    let finalSites = reorderedSites;
    if (activeTab === '全部' && hiddenCategories.length > 0) {
      const hiddenSites = sites.filter(s => hiddenCategories.includes(s.category));
      finalSites = [...reorderedSites, ...hiddenSites];
    }

    setSites(finalSites);

    try {
      const res = await fetch('/api/sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSites)
      });

      if (!res.ok) {
        console.error('Failed to save site order');
        showToast('保存排序失败', 'error');
      }
    } catch (error) {
      console.error('Error saving site order:', error);
      showToast('保存排序出错', 'error');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, siteId: number) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    const menuWidth = 160;
    const windowWidth = window.innerWidth;
    const clickX = e.clientX;
    const alignRight = (clickX + menuWidth) > windowWidth;
    setContextMenu({ visible: true, x: clickX, y: e.clientY, siteId: siteId as any, alignRight: alignRight });
  };

  const moveCategory = (oldIndex: number, newIndex: number) => {
    setCategories((items: string[]) => arrayMove(items, oldIndex, newIndex));
  };

  const handleImportData = async (data: any) => {
    try {
      showToast('正在导入配置...', 'success');

      // 1. Update Local State
      if (data.sites) setSites(data.sites);
      if (data.categories) setCategories(data.categories);
      if (data.layout) setLayoutSettings(data.layout);
      if (data.config) setAppConfig(data.config);
      if (data.categoryColors) setCategoryColors(data.categoryColors);

      // 2. Persist to Database
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('配置导入成功', 'success');
        setIsSettingsOpen(false);
      } else {
        showToast('保存到数据库失败', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('数据格式错误', 'error');
    }
  };

  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      if (hiddenCategories.includes(site.category)) return false;
      const matchesCategory = activeTab === '全部' || site.category === activeTab;

      // Modified: Only filter if engine is local
      const text = (site.name + site.desc).toLowerCase();
      const isLocalSearch = currentEngineId === 'local';
      const matchesSearch = isLocalSearch ? text.includes(searchQuery.toLowerCase()) : true;

      return matchesCategory && matchesSearch;
    });
  }, [sites, activeTab, searchQuery, hiddenCategories, currentEngineId]);

  const activeDragSite = activeDragId ? sites.find(s => s.id === activeDragId) : null;
  const containerClass = layoutSettings.isWideMode ? 'max-w-[98%] px-6' : 'max-w-7xl px-4';
  const currentEngine = SEARCH_ENGINES.find(e => e.id === currentEngineId) || SEARCH_ENGINES[0];
  const isSearching = searchQuery.trim() && currentEngineId === 'local';
  const currentFontFamily = FONTS.find(f => f.id === layoutSettings.fontFamily)?.family || 'sans-serif';

  // Get color for category pill
  const getCategoryColor = (cat: string) => {
    if (cat === '全部') return '#6366F1'; // Default Indigo
    return categoryColors[cat] || '#6366F1';
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className={`min-h-screen transition-colors duration-500 selection:bg-indigo-500/30 selection:text-indigo-500 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-[#F8FAFC] text-slate-700'} overflow-x-hidden flex flex-col relative group/spotlight`}
        style={{ fontFamily: currentFontFamily }}
      >
        {/* Dynamic Font Size Injection */}
        <style>{`
                    :root {
                        font-size: ${layoutSettings.fontSizeScale || 100}%;
                    }
                `}</style>

        <AuroraBackground isDarkMode={isDarkMode} layoutSettings={layoutSettings} />
        <Toast notification={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))}
          isDarkMode={isDarkMode} />

        <div
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-all duration-300 ease-out ${isSearchFocused ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
          onClick={() => setIsSearchFocused(false)} />

        {/* Header - Scroll Aware & Optimized */}
        <header
          className={`${layoutSettings.stickyHeader ? 'fixed top-0 left-0 right-0 z-50' : 'relative z-40'} w-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isScrolled ? 'pt-2 pb-2 px-2 sm:px-4' : 'pt-6 pb-2 px-4'}`}>
          <div
            className={`mx-auto transition-all duration-300 ${layoutSettings.isWideMode ? 'max-w-[98%]' : 'max-w-7xl'}`}>
            <div className={`relative flex items-center justify-between px-2 sm:px-6 rounded-2xl backdrop-blur-2xl border shadow-xl shadow-indigo-500/5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] 
                            ${isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-white/40 ring-1 ring-white/50'}
                            ${isScrolled ? 'py-2 bg-opacity-90 shadow-lg' : 'py-3'}
                        `}>

              {/* Logo */}
              <div
                className={`flex items-center gap-3 shrink-0 pl-2 select-none z-50 transition-all duration-500 ease-in-out ${isScrolled ? 'scale-90' : ''}`}>
                <div
                  className="relative group cursor-pointer active:scale-95 transition-transform duration-200"
                  onClick={() => window.location.reload()}>
                  {appConfig.logoType === 'image' && appConfig.logoImage ? (
                    <img src={appConfig.logoImage} alt="Logo"
                      className="h-10 w-auto object-contain hover:opacity-80 transition-opacity" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div
                          className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-inner text-white transform group-hover:scale-105 transition-transform">
                          <LayoutGrid size={22} />
                        </div>
                      </div>
                      <div
                        className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isScrolled ? 'grid-rows-[0fr] opacity-0 ml-0' : 'grid-rows-[1fr] opacity-100 ml-0'}`}>
                        <span
                          className={`text-xl font-bold tracking-tight overflow-hidden hidden sm:block ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {appConfig.logoText}<span
                            className="text-indigo-500">{appConfig.logoHighlight}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div
                className={`flex-1 max-w-2xl mx-4 md:mx-8 relative group transition-all duration-500 ${isSearchFocused ? 'z-50 scale-[1.02]' : 'z-20'} ${isScrolled ? 'md:mx-12' : ''}`}>
                <div
                  className={`relative flex items-center rounded-full transition-all duration-300 ${isSearchFocused ? (isDarkMode ? 'bg-slate-800 shadow-2xl shadow-indigo-500/20 border-indigo-500/50' : 'bg-white shadow-2xl shadow-indigo-500/20 border-indigo-500/50') : (isDarkMode ? 'bg-black/20 hover:bg-black/30 border border-white/5' : 'bg-slate-100/50 hover:bg-white/80 border border-transparent hover:shadow-lg hover:shadow-indigo-500/5')}`}>
                  <div className="relative shrink-0 pl-1">
                    <button onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
                      className={`flex items-center gap-2 pl-3 pr-2 py-2.5 rounded-l-full text-sm font-medium transition-all active:scale-95 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
                      {currentEngine.icon ? <currentEngine.icon size={16} /> : <Search size={16} />}
                      <ChevronDown size={12} className="opacity-50" />
                    </button>
                    {isEngineMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10"
                          onClick={() => setIsEngineMenuOpen(false)} />
                        <div
                          className={`absolute top-full left-0 mt-3 w-48 rounded-xl shadow-2xl border overflow-hidden py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-100'}`}>
                          {SEARCH_ENGINES.map(eng => (
                            <button key={eng.id} onClick={() => {
                              setCurrentEngineId(eng.id);
                              setIsEngineMenuOpen(false);
                            }}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors active:bg-indigo-500/10 ${currentEngineId === eng.id ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                              {eng.icon && <eng.icon size={14} />} {eng.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className={`w-px h-5 ${isDarkMode ? 'bg-white/10' : 'bg-slate-300/50'}`}></div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={currentEngine.placeholder}
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    onKeyDown={(e) => e.key === 'Enter' && searchQuery.trim() && (currentEngineId === 'local' ? setSearchQuery('') : window.open(currentEngine.url + encodeURIComponent(searchQuery), '_blank'))}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`w-full bg-transparent border-none py-3 px-3 focus:outline-none text-sm sm:text-base truncate ${isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`}
                  />
                  <div className="pr-3 flex items-center gap-2">
                    {searchQuery ? (
                      <button onClick={() => setSearchQuery('')}
                        className="active:scale-90 transition-transform"><X size={16}
                          className="text-slate-400 hover:text-slate-600" />
                      </button>
                    ) : (
                      <>
                        {!isSearchFocused && <div
                          className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono opacity-50 ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          <Command size={10} />K</div>}
                        <div
                          className={`p-1.5 rounded-full ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-indigo-50 text-indigo-400'}`}>
                          <Search size={16} /></div>
                      </>
                    )}
                  </div>
                  {searchSuggestions.length > 0 && (
                    <div
                      className={`absolute top-full left-4 right-4 mt-2 rounded-xl border shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-100'}`}>
                      {searchSuggestions.map((s, i) => (<div key={i} onClick={() => {
                        setSearchQuery(s);
                        setSearchSuggestions([]);
                      }}
                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}>{s}</div>))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0 pr-1 z-50">
                <ThemeToggle isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
                {isLoggedIn && (
                  <>
                    <ActionButton icon={Plus} onClick={() => {
                      setEditingSite(null);
                      setIsModalOpen(true);
                    }} tooltip="添加" isDarkMode={isDarkMode} highlight />
                    <ActionButton icon={Settings} onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      tooltip="设置" active={isSettingsOpen} isDarkMode={isDarkMode} />
                    <ActionButton icon={Lock} onClick={() => setIsChangePasswordModalOpen(true)}
                      tooltip="修改密码" isDarkMode={isDarkMode} />
                  </>
                )}
                <ActionButton icon={isLoggedIn ? LogOut : LogIn}
                  onClick={() => isLoggedIn ? setIsLoggedIn(false) : setIsLoginModalOpen(true)}
                  tooltip={isLoggedIn ? "退出" : "登录"} isDarkMode={isDarkMode}
                  danger={isLoggedIn} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div
          className={`mx-auto w-full transition-all duration-300 flex-1 ${containerClass} ${layoutSettings.stickyHeader ? 'pt-28' : ''} ${layoutSettings.stickyFooter ? 'pb-28' : ''}`}>
          {layoutSettings.showWidgets && !isSearching && (
            <div className="mb-8 mt-4">
              <WidgetDashboard isDarkMode={isDarkMode} sitesCount={sites.length} />
            </div>
          )}

          {/* Category Tabs */}
          <nav
            className={`sticky z-30 w-full mb-8 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isScrolled ? 'top-[4.5rem]' : 'top-[5.5rem]'}`}>
            <div className="flex justify-center">
              <div
                className={`relative flex items-center p-1.5 rounded-full overflow-x-auto custom-scrollbar max-w-full backdrop-blur-xl border shadow-2xl shadow-indigo-500/10 ${isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/70 border-white/60 ring-1 ring-white/60'}`}>
                <CategoryPill
                  label="全部"
                  active={activeTab === '全部'}
                  onClick={() => setActiveTab('全部')}
                  isDarkMode={isDarkMode}
                  color={getCategoryColor('全部')}
                  navColorMode={layoutSettings.navColorMode}
                />
                <div
                  className={`w-px h-5 mx-1 shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-slate-400/30'}`}></div>
                {categories.filter(cat => !hiddenCategories.includes(cat)).map(cat => (
                  <CategoryPill
                    key={cat}
                    label={cat}
                    active={activeTab === cat}
                    onClick={() => setActiveTab(cat)}
                    isDarkMode={isDarkMode}
                    color={getCategoryColor(cat)}
                    navColorMode={layoutSettings.navColorMode}
                  />
                ))}
              </div>
            </div>
          </nav>

          {/* Main Grid */}
          <main className="relative min-h-[40vh] pb-10">
            {isLoggedIn && isSettingsOpen && (
              <SettingsPanel
                isDarkMode={isDarkMode}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                isWallpaperManagerOpen={isWallpaperManagerOpen}
                setIsWallpaperManagerOpen={setIsWallpaperManagerOpen}
                activeTab={activeSettingTab}
                setActiveTab={setActiveSettingTab}
                layoutSettings={layoutSettings}
                setLayoutSettings={setLayoutSettings}
                categories={categories}
                categoryColors={categoryColors}
                setCategoryColors={setCategoryColors}
                hiddenCategories={hiddenCategories}
                toggleCategoryVisibility={(c: string) => setHiddenCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                handleDeleteCategory={(c: string) => setConfirmingDeleteCategory(c)}
                handleAddCategory={async (n: string) => {
                  const name = n.trim();
                  if (!name) return;
                  if (categories.includes(name)) {
                    showToast('分类已存在', 'error');
                    return;
                  }
                  try {
                    const res = await fetch('/api/categories', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, order: categories.length })
                    });
                    if (res.ok) {
                      setCategories([...categories, name]);
                      showToast('分类添加成功');
                    } else {
                      showToast('添加失败', 'error');
                    }
                  } catch (e) {
                    showToast('添加失败', 'error');
                  }
                }}
                sites={sites}
                setSites={setSites}
                setCategories={setCategories}
                moveCategory={moveCategory}
                handleImportData={handleImportData}
                appConfig={appConfig}
                setAppConfig={setAppConfig}
                showToast={showToast}
              />
            )}

            <div className="space-y-10">
              {isLoading ? (
                <div className="grid dynamic-grid gap-4"
                  style={{ '--grid-cols': layoutSettings.gridCols } as any}>
                  <SiteSkeleton isDarkMode={isDarkMode} />
                </div>
              ) : filteredSites.length === 0 ? (
                <EmptyState isDarkMode={isDarkMode} mode={isSearching ? 'search' : 'filter'} />
              ) : (
                <SortableContext items={
                  activeTab === '全部'
                    ? categories
                      .filter(c => !hiddenCategories.includes(c))
                      .flatMap(cat => filteredSites.filter(s => s.category === cat).map(s => s.id))
                    : filteredSites.map(s => s.id)
                } strategy={rectSortingStrategy}>
                  {activeTab === '全部' && !isSearching ? (
                    categories.filter(cat => !hiddenCategories.includes(cat)).map(cat => {
                      const catSites = filteredSites.filter(s => s.category === cat);
                      if (catSites.length === 0) return null;
                      return (
                        <section key={cat}
                          className="animate-in slide-in-from-bottom-4 duration-500 mb-10">
                          {/* Category Header */}
                          <div className="relative flex items-center py-6 mb-6">
                            <div className="absolute inset-0 flex items-center"
                              aria-hidden="true">
                              <div
                                className={`w-full h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent ${isDarkMode ? 'via-white/20' : 'via-slate-300'} ${layoutSettings.bgEnabled ? '!via-white/30' : ''}`}></div>
                            </div>
                            <div
                              className="relative flex justify-start w-full px-4 sm:px-0">
                              <span className={`
                                                                pl-4 pr-6 py-2 rounded-full text-sm font-bold tracking-wide
                                                                backdrop-blur-md border shadow-sm flex items-center gap-3 transition-all select-none group
                                                                ${layoutSettings.bgEnabled
                                  ? 'bg-black/20 border-white/20 text-white shadow-black/5'
                                  : (isDarkMode ? 'bg-slate-900/80 border-white/10 text-slate-200' : 'bg-white/80 border-slate-200 text-slate-600')
                                }
                                                            `}>
                                <span
                                  className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]`}
                                  style={{ backgroundColor: getCategoryColor(cat) }}></span>
                                {cat}
                              </span>
                            </div>
                          </div>

                          <div className="grid dynamic-grid gap-[var(--grid-gap)]" style={{
                            '--grid-cols': layoutSettings.gridCols,
                            '--grid-gap': `${layoutSettings.gap * 4}px`
                          } as any}>
                            {catSites.map(site => (
                              <SortableSiteCard
                                key={site.id} site={site} isLoggedIn={isLoggedIn}
                                isDarkMode={isDarkMode} settings={layoutSettings}
                                onEdit={() => {
                                  setEditingSite(site);
                                  setIsModalOpen(true);
                                }}
                                onDelete={() => setConfirmingDeleteSite(site)}
                                onContextMenu={handleContextMenu}
                              />
                            ))}
                          </div>
                        </section>
                      )
                    })
                  ) : (
                    <div className="grid dynamic-grid gap-[var(--grid-gap)]" style={{
                      '--grid-cols': layoutSettings.gridCols,
                      '--grid-gap': `${layoutSettings.gap * 4}px`
                    } as any}>
                      {filteredSites.map(site => (
                        <SortableSiteCard
                          key={site.id} site={site} isLoggedIn={isLoggedIn}
                          isDarkMode={isDarkMode} settings={layoutSettings}
                          onEdit={() => {
                            setEditingSite(site);
                            setIsModalOpen(true);
                          }}
                          onDelete={() => setConfirmingDeleteSite(site)}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>
              )}
            </div>
          </main>
        </div>

        <Footer isDarkMode={isDarkMode} appConfig={appConfig} isSticky={layoutSettings.stickyFooter} />

        <DragOverlay adjustScale style={{ transformOrigin: '0 0 ' }}>
          {activeDragSite ? (
            <div style={{ width: '100%', height: layoutSettings.cardHeight }}>
              <SiteCardContent site={activeDragSite} isLoggedIn={false} isDarkMode={isDarkMode}
                settings={layoutSettings} isOverlay />
            </div>
          ) : null}
        </DragOverlay>

        {/* Context Menu & Modals */}
        {contextMenu.visible && (
          <div
            className={`fixed z-[100] w-40 rounded-xl shadow-xl border py-1.5 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md ${isDarkMode ? 'bg-slate-800/90 border-white/10' : 'bg-white/90 border-slate-100'}`}
            style={{
              top: contextMenu.y,
              left: contextMenu.alignRight ? undefined : contextMenu.x,
              right: contextMenu.alignRight ? (window.innerWidth - contextMenu.x) : undefined
            }}
          >
            <button onClick={() => {
              setEditingSite(sites.find(s => s.id === contextMenu.siteId));
              setContextMenu({ ...contextMenu, visible: false });
              setIsModalOpen(true);
            }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 active:scale-95 transition-transform ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
              <Edit3 size={14} />编辑
            </button>
            <button onClick={() => {
              const site = sites.find(s => s.id === contextMenu.siteId);
              if (site) navigator.clipboard.writeText(site.url);
              setContextMenu({ ...contextMenu, visible: false });
            }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 active:scale-95 transition-transform ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
              <Copy size={14} />复制链接
            </button>
            <div className={`h-px my-1 ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}></div>
            <button onClick={() => {
              setConfirmingDeleteSite(sites.find(s => s.id === contextMenu.siteId));
              setContextMenu({ ...contextMenu, visible: false });
            }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-500 hover:bg-red-500/10 active:scale-95 transition-transform">
              <Trash2 size={14} />删除
            </button>
          </div>
        )}
        {isModalOpen && <EditModal site={editingSite} categories={categories} isDarkMode={isDarkMode}
          onClose={() => setIsModalOpen(false)} onSave={async (data: any) => {
            try {
              if (editingSite) {
                const res = await fetch('/api/sites', {
                  method: 'PUT',
                  body: JSON.stringify({ ...data, id: editingSite.id })
                });
                if (res.ok) {
                  const updated = await res.json();
                  setSites(sites.map(s => s.id === editingSite.id ? updated : s));
                  setIsModalOpen(false);
                  showToast('站点已更新', 'success');
                } else showToast('更新失败', 'error');
              } else {
                const res = await fetch('/api/sites', {
                  method: 'POST',
                  body: JSON.stringify({ ...data })
                });
                if (res.ok) {
                  const created = await res.json();
                  setSites([...sites, created]);
                  setIsModalOpen(false);
                  showToast('站点已添加', 'success');
                } else showToast('添加失败', 'error');
              }
            } catch (e) {
              showToast('保存失败', 'error');
            }
          }} />}
        {confirmingDeleteCategory && <ConfirmationModal isOpen={true} title="删除分类"
          message="确定删除该分类及其下所有站点吗？操作无法撤销。"
          isDarkMode={isDarkMode}
          onCancel={() => setConfirmingDeleteCategory(null)}
          onConfirm={async () => {
            try {
              const res = await fetch(`/api/categories?name=${encodeURIComponent(confirmingDeleteCategory)}`, { method: 'DELETE' });
              const data = await res.json();
              if (res.ok) {
                setCategories(prev => prev.filter(c => c !== confirmingDeleteCategory));
                setSites(prev => prev.filter(s => s.category !== confirmingDeleteCategory));
                setConfirmingDeleteCategory(null);
                showToast('分类已删除', 'success');
              } else {
                console.error('Delete failed:', data);
                showToast(data.error || '删除失败', 'error');
              }
            } catch (e) {
              console.error('Delete error:', e);
              showToast('删除请求失败', 'error');
            }
          }} />}
        {confirmingDeleteSite && <ConfirmationModal isOpen={true} title="删除站点"
          message={`确定要删除 "${confirmingDeleteSite.name}" 吗？`}
          isDarkMode={isDarkMode}
          onCancel={() => setConfirmingDeleteSite(null)}
          onConfirm={async () => {
            try {
              const res = await fetch(`/api/sites?id=${confirmingDeleteSite.id}`, { method: 'DELETE' });
              if (res.ok) {
                setSites(prev => prev.filter(s => s.id !== confirmingDeleteSite.id));
                setConfirmingDeleteSite(null);
                showToast('站点已删除', 'success');
              } else showToast('删除失败', 'error');
            } catch (e) {
              showToast('删除失败', 'error');
            }
          }} />}
        {isLoginModalOpen &&
          <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={async (u: string, p: string) => {
            try {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
              });
              if (res.ok) {
                setIsLoggedIn(true);
                setIsLoginModalOpen(false);
                showToast('登录成功', 'success');
              } else {
                showToast('账号或密码错误', 'error');
              }
            } catch (e) {
              showToast('登录失败', 'error');
            }
          }} isDarkMode={isDarkMode} />}

        {isChangePasswordModalOpen &&
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onClose={() => setIsChangePasswordModalOpen(false)}
            isDarkMode={isDarkMode}
            showToast={showToast}
          />}

        <style>{`
                    :root { --mouse-x: 0px; --mouse-y: 0px; }
                    .group\\/spotlight:hover .spotlight-card::before { opacity: 1; }
                    .spotlight-card::before { background: radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.15), transparent 40%); content: ""; display: block; height: 100%; left: 0; opacity: 0; position: absolute; top: 0; width: 100%; z-index: 2; pointer-events: none; transition: opacity 0.5s; }
                    .text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1); }
                    @keyframes slow-spin { from { transform: rotate(0deg) scale(1); } to { transform: rotate(360deg) scale(1); } }
                    @keyframes gradient-move { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                    .animate-slow-spin { animation: slow-spin 60s linear infinite; }
                    .animate-gradient-move { animation: gradient-move 3s ease infinite; }
                    .custom-scrollbar::-webkit-scrollbar { height: 0px; width: 0px; }
                    .dynamic-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
                    @media (min-width: 640px) { .dynamic-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); } }
                    @media (min-width: 1024px) { .dynamic-grid { grid-template-columns: repeat(var(--grid-cols, 5), minmax(0, 1fr)); } }
                `}</style>
      </div>
    </DndContext>
  );
}

// --- Components ---

const SortableSiteCard = React.memo(function SortableSiteCard({ site, isLoggedIn, ...props }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
    disabled: !isLoggedIn
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1
  };
  return (<div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full"><SiteCardContent
    site={site} isLoggedIn={isLoggedIn} {...props} /></div>);
});

const SiteCardContent = React.memo(function SiteCardContent({
  site,
  isLoggedIn,
  isDarkMode,
  settings,
  onEdit,
  onDelete,
  onContextMenu,
  isOverlay
}: any) {
  const [iconState, setIconState] = useState(0);
  useEffect(() => {
    setIconState(0);
  }, [site.url, site.iconType]);

  const Icon = ICON_MAP[site.icon] || Globe;
  const brandRgb = hexToRgb(site.color || '#6366f1');
  const opacity = settings.glassOpacity / 100;
  const bgBase = isDarkMode ? [30, 41, 59] : [255, 255, 255];

  // --- Color Logic Update for "Colorful Cards" ---
  let bgColor, borderColor;

  // Check if we are in a mode that needs higher contrast (Wallpaper)
  const isWallpaperMode = settings.bgEnabled && (settings.bgType === 'bing' || settings.bgType === 'custom');

  if (settings.colorfulCards) {
    if (isWallpaperMode) {
      // Fix: When wallpaper is enabled, simple low opacity is unreadable.
      // We must mix the brand color with a base color (White/Slate) to create a pastel/tinted opaque background.
      // Mix Ratio: 15% Brand, 85% Base
      const mixRatio = 0.15;
      const r = Math.round(bgBase[0] * (1 - mixRatio) + brandRgb.r * mixRatio);
      const g = Math.round(bgBase[1] * (1 - mixRatio) + brandRgb.g * mixRatio);
      const b = Math.round(bgBase[2] * (1 - mixRatio) + brandRgb.b * mixRatio);

      // Use settings.glassOpacity but ensure a minimum for readability on complex backgrounds
      const safeOpacity = Math.max(settings.glassOpacity, 65) / 100;

      bgColor = `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
      borderColor = `rgba(${brandRgb.r}, ${brandRgb.g}, ${brandRgb.b}, ${isDarkMode ? 0.3 : 0.2})`;
    } else {
      // Mode: Colorful (Elegant Pastel Tint) - Original Logic for clean backgrounds
      const tintAlpha = isDarkMode ? 0.15 : 0.08;
      const borderAlpha = isDarkMode ? 0.3 : 0.2;
      bgColor = `rgba(${brandRgb.r}, ${brandRgb.g}, ${brandRgb.b}, ${tintAlpha})`;
      borderColor = `rgba(${brandRgb.r}, ${brandRgb.g}, ${brandRgb.b}, ${borderAlpha})`;
    }
  } else {
    // Mode: Default Glassmorphism
    bgColor = `rgba(${bgBase[0]}, ${bgBase[1]}, ${bgBase[2]}, ${opacity})`;
    borderColor = `rgba(${brandRgb.r}, ${brandRgb.g}, ${brandRgb.b}, ${isDarkMode ? 0.2 : 0.15})`;
  }

  const perceivedBg = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = getAccessibleTextColor(perceivedBg);
  const hasShadow = shouldUseTextShadow(textColor);

  let renderIcon;
  if (site.iconType === 'upload' && site.customIconUrl) {
    renderIcon = <img src={site.customIconUrl} className="w-10 h-10 rounded-xl object-contain bg-white/90 p-0.5" />;
  } else if (site.iconType === 'library') {
    renderIcon = <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
      style={{ backgroundColor: site.color }}><Icon size={20} /></div>;
  } else {
    if (iconState < FAVICON_PROVIDERS.length) {
      let domain = '';
      try {
        domain = new URL(site.url).hostname;
      } catch (e) {
      }
      const currentSrc = FAVICON_PROVIDERS[iconState](domain);
      renderIcon = (<img src={currentSrc} onError={() => setIconState(prev => prev + 1)}
        className="w-10 h-10 rounded-xl object-contain bg-white/90 p-0.5 shadow-sm" />);
    } else {
      const firstLetter = site.name ? site.name.charAt(0).toUpperCase() : '?';
      renderIcon = (<div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-lg"
        style={{ backgroundColor: site.color }}>{firstLetter}</div>);
    }
  }

  return (
    <div className={`spotlight-card relative h-full ${isOverlay ? 'shadow-2xl scale-105 cursor-grabbing' : ''}`}>
      <a
        href={isLoggedIn || isOverlay ? undefined : site.url} target="_blank" rel="noopener noreferrer"
        onClick={(e) => isLoggedIn && e.preventDefault()}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, site.id)}
        // Added backdrop-blur-md specifically to help with readability on wallpapers
        className={`group relative block h-full rounded-2xl border transition-all duration-300 overflow-hidden z-10 backdrop-blur-md ${isLoggedIn ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer active:scale-95'} ${!isOverlay ? 'hover:-translate-y-1 hover:shadow-xl' : ''}`}
        style={{ height: settings.cardHeight, backgroundColor: bgColor, borderColor: borderColor }}
      >
        {/* If colorful mode is on, add a subtle gradient overlay for more elegance */}
        {settings.colorfulCards && (
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: `linear-gradient(to bottom right, transparent, rgba(${brandRgb.r}, ${brandRgb.g}, ${brandRgb.b}, 0.2))` }}
          />
        )}

        <div className="relative z-10 h-full flex flex-col p-4 justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">{renderIcon}<span
              className={`font-bold truncate text-sm sm:text-base ${hasShadow ? 'text-shadow-sm' : ''}`}
              style={{ color: textColor }}>{site.name}</span></div>
            {isLoggedIn ? (<button onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit();
            }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95">
              <MoreHorizontal size={16} style={{ color: textColor }} /></button>) : (<ExternalLink size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                style={{ color: textColor }} />)}
          </div>
          {settings.cardHeight > 90 && (
            <p className={`text-xs leading-relaxed line-clamp-2 opacity-70 mt-2 ${hasShadow ? 'text-shadow-sm' : ''}`}
              style={{ color: textColor }}>{site.desc}</p>)}
        </div>
      </a>
    </div>
  );
});

function SiteSkeleton({ isDarkMode }: any) {
  return (
    <>
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className={`rounded-2xl border animate-pulse p-4 h-24 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-white/50 border-slate-200'}`}
          style={{ animationFillMode: 'forwards', animationDelay: `${i * 100}ms` }}
        />
      ))}
    </>
  );
}

function Toast({ notification, onClose, isDarkMode }: any) {
  if (!notification.show) return null;
  return (<div
    className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${isDarkMode ? 'bg-slate-800/90 border-white/10 text-white' : 'bg-white/90 border-white/60 text-slate-800'}`}>{notification.type === 'success' ?
        <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-red-500" size={20} />}<span
          className="text-sm font-medium">{notification.message}</span></div>
  </div>);
}

// Updated AuroraBackground to handle Pure Color
function AuroraBackground({ isDarkMode, layoutSettings }: { isDarkMode: boolean, layoutSettings: any }) {
  if (layoutSettings?.bgEnabled) {
    // Mode 1: Pure Color
    if (layoutSettings.bgType === 'color') {
      return (
        <div
          className="fixed inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: layoutSettings.bgColor || '#F8FAFC' }}
        />
      );
    }

    // Mode 2: Custom/Bing Image
    if (layoutSettings?.bgUrl) {
      const isCustom = layoutSettings.bgType === 'custom';
      const scale = isCustom ? (layoutSettings.bgScale || 100) / 100 : 1;
      const bgX = isCustom ? (layoutSettings.bgX ?? 50) : 50;
      const bgY = isCustom ? (layoutSettings.bgY ?? 50) : 50;

      return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
          <div
            className="absolute inset-0 bg-cover transition-all duration-100 ease-out"
            style={{
              backgroundImage: `url(${layoutSettings.bgUrl})`,
              backgroundPosition: `${bgX}% ${bgY}%`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center'
            }}
          />
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: (layoutSettings.bgOpacity || 40) / 100 }}
          />
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("${NOISE_BASE64}")` }}></div>
        </div>
      );
    }
  }

  // Default Aurora Mode
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/15 rounded-full blur-[120px] animate-slow-spin ${isDarkMode ? 'opacity-90' : 'opacity-50'}`} />
      <div
        className={`absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] bg-cyan-500/15 rounded-full blur-[120px] animate-slow-pulse ${isDarkMode ? 'opacity-90' : 'opacity-50'}`} />
      <div className="absolute inset-0 opacity-[0.08] brightness-100 contrast-150 mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_BASE64}")` }}></div>
    </div>
  );
}

function BackgroundPositionPreview({ imageUrl, x, y, scale, onChange }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!lastPos.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const factor = 0.4;
    let newX = x - (dx * factor);
    let newY = y - (dy * factor);
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    onChange(newX, newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    lastPos.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="space-y-2 select-none">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold opacity-70 flex items-center gap-1"><Move size={12} /> 拖动预览图调整位置</label>
        <div className="text-xs opacity-50 font-mono">{Math.round(x)}%, {Math.round(y)}%</div>
      </div>
      <div
        className="w-full h-48 rounded-xl border overflow-hidden cursor-move relative shadow-inner bg-black/10 dark:bg-black/50 touch-none group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: `${x}% ${y}%`,
            transform: `scale(${scale / 100})`,
            transformOrigin: 'center center'
          }}
        />
        <div
          className="absolute inset-0 border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/30"></div>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 text-white text-xs font-medium backdrop-blur-[1px]">
          按住拖动以平移
        </div>
      </div>
    </div>
  );
}

const WidgetDashboard = React.memo(function WidgetDashboard({ isDarkMode, sitesCount }: {
  isDarkMode: boolean,
  sitesCount: number
}) {
  const [time, setTime] = useState(new Date());
  const [locationName, setLocationName] = useState('本地');
  const [weather, setWeather] = useState<any>({ temp: null, code: null, loading: true, error: false });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await res.json();
        let city = data.city || data.region || '本地';
        setLocationName(translateCity(city));
      } catch (e) {
        setLocationName('本地');
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const data = await res.json();
            if (data.current_weather) {
              setWeather({
                temp: data.current_weather.temperature,
                code: data.current_weather.weathercode,
                loading: false,
                error: false
              });
            }
          } catch (e) {
            setWeather({ loading: false, error: true });
          }
        },
        () => {
          setWeather({ loading: false, error: true });
        }
      );
    } else {
      setWeather({ loading: false, error: true });
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <SunMedium size={24} className="text-orange-500" />;
    if (code >= 1 && code <= 3) return <Cloud size={24} className="text-gray-400" />;
    if ((code >= 45 && code <= 48) || (code >= 51 && code <= 55)) return <CloudSnow size={24}
      className="text-blue-300" />;
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={24}
      className="text-blue-500" />;
    if (code >= 95) return <CloudLightning size={24} className="text-purple-500" />;
    return <SunMedium size={24} className="text-orange-500" />;
  };

  const getWeatherDesc = (code: number) => {
    if (code === 0) return "晴朗";
    if (code >= 1 && code <= 3) return "多云";
    if (code >= 45 && code <= 48) return "雾";
    if (code >= 51 && code <= 67) return "雨";
    if (code >= 71 && code <= 77) return "雪";
    if (code >= 95) return "雷雨";
    return "未知";
  };

  const widgetClass = `flex flex-col justify-center p-4 rounded-2xl border backdrop-blur-md shadow-sm transition-transform hover:scale-[1.02] active:scale-95 duration-200 ${isDarkMode ? 'bg-slate-800/40 border-white/10' : 'bg-white/60 border-white/60'}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={widgetClass}>
        <div className="flex items-center gap-3 mb-1"><Clock size={18} className="text-indigo-500" /><span
          className="text-xs opacity-60 font-medium">当前时间</span></div>
        <div
          className="text-2xl font-bold tabular-nums">{time.toLocaleTimeString('zh-CN', { hour12: false })}</div>
        <div className="text-xs opacity-50">{formatDate(time)}</div>
      </div>
      <div className={widgetClass}>
        <div className="flex items-center gap-3 mb-1">
          <MapPin size={18} className="text-cyan-500" />
          <span className="text-xs opacity-60 font-medium">{locationName}天气</span>
        </div>
        {weather.loading ? (
          <div className="animate-pulse h-8 w-20 bg-gray-200/20 rounded"></div>
        ) : weather.error ? (
          <>
            <div className="text-lg font-bold">N/A</div>
            <div className="text-xs opacity-50">位置未授权</div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{weather.temp}°C</span>
              {getWeatherIcon(weather.code)}
            </div>
            <div className="text-xs opacity-50">{getWeatherDesc(weather.code)} · 实时同步</div>
          </>
        )}
      </div>
      <div className={widgetClass}>
        <div className="flex items-center gap-3 mb-1"><Activity size={18} className="text-emerald-500" /><span
          className="text-xs opacity-60 font-medium">收录统计</span></div>
        <div className="text-2xl font-bold">{sitesCount}</div>
        <div className="text-xs opacity-50">个优质站点</div>
      </div>
    </div>
  )
});

const SortableItemContext = React.createContext<any>(null);

function SortableDragHandle({ children, className }: any) {
  const { attributes, listeners } = React.useContext(SortableItemContext);
  return (
    <div {...attributes} {...listeners} className={className}>
      {children}
    </div>
  );
}

function SortableCategoryItem({ id, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SortableItemContext.Provider value={{ attributes, listeners }}>
      <div ref={setNodeRef} style={style}>
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}

function SettingsPanel({
  isDarkMode,
  onClose,
  activeTab,
  setActiveTab,
  layoutSettings,
  setLayoutSettings,
  categories,
  categoryColors,
  setCategoryColors,
  handleAddCategory,
  handleDeleteCategory,
  toggleCategoryVisibility,
  hiddenCategories,
  sites,
  setSites,
  setCategories,
  moveCategory,
  handleImportData,
  appConfig,
  setAppConfig,
  showToast,
  isWallpaperManagerOpen,
  setIsWallpaperManagerOpen
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [bingQuality, setBingQuality] = useState('1920x1080');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = categories.indexOf(active.id);
      const newIndex = categories.indexOf(over?.id);
      moveCategory(oldIndex, newIndex);
    }
  };

  const handleSyncBing = async () => {
    try {
      showToast('正在同步 Bing 壁纸...', 'loading');
      const res = await fetch('/api/wallpapers/bing', { method: 'POST' });
      if (res.ok) {
        showToast('同步成功', 'success');
        // Ideally we should refresh the wallpaper manager if it's open, but for now this is enough
      } else {
        showToast('同步失败', 'error');
      }
    } catch (e) {
      showToast('同步出错', 'error');
    }
  };

  const inputClass = `w-full rounded-xl px-3 py-2.5 text-sm border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`;
  const handleExport = () => {
    const data = JSON.stringify({ sites, categories, categoryColors, layout: layoutSettings, config: appConfig });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurora-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };
  const handleFileSelect = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => handleImportData(JSON.parse(e.target.result));
      reader.readAsText(file);
    }
  };
  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        showToast("图片过大，请使用 500KB 以下的图片", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        setAppConfig({ ...appConfig, logoImage: ev.target.result, logoType: 'image' });
        showToast('Logo 上传成功');
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-Sync Bing Wallpaper Check
  useEffect(() => {
    const checkBingSync = async () => {
      if (layoutSettings.bgType !== 'bing') return;

      try {
        // Check local cache first
        const res = await fetch('/api/wallpapers?type=bing');
        if (res.ok) {
          const wallpapers = await res.json();
          if (wallpapers.length > 0) {
            const latest = wallpapers[0];
            const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

            // If we have today's wallpaper locally
            if (latest.filename.includes(todayStr)) {
              if (layoutSettings.bgUrl !== latest.url) {
                setLayoutSettings((prev: any) => ({ ...prev, bgUrl: latest.url }));
              }
              return;
            }
          }
        }

        // If no local wallpaper for today, check time
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // If past 00:10, trigger sync
        if (hours > 0 || (hours === 0 && minutes >= 10)) {
          console.log('Auto-syncing Bing wallpaper...');
          await handleSyncBing();
        }
      } catch (e) {
        console.error('Auto-sync check failed', e);
      }
    };

    checkBingSync();
  }, [layoutSettings.bgType]); // Run when bgType changes to 'bing' or on mount

  const setBingWallpaper = async (quality = bingQuality) => {
    // Try to use local cache first
    try {
      const res = await fetch('/api/wallpapers?type=bing');
      if (res.ok) {
        const wallpapers = await res.json();
        if (wallpapers.length > 0) {
          const latest = wallpapers[0];
          const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
          // If we have today's wallpaper, use it
          if (latest.filename.includes(todayStr)) {
            setLayoutSettings({ ...layoutSettings, bgEnabled: true, bgType: 'bing', bgUrl: latest.url });
            setBingQuality(quality);
            showToast('已应用今日 Bing 壁纸 (本地缓存)');
            return;
          }
        }
      }
    } catch (e) {
      console.error('Failed to check local bing cache', e);
    }

    // Fallback to external API if no local cache
    const url = `https://bing.img.run/${quality}.php`;
    setLayoutSettings({ ...layoutSettings, bgEnabled: true, bgType: 'bing', bgUrl: url });
    setBingQuality(quality);
    const label = quality === 'uhd' ? '4K 超清' : (quality === '1920x1080' ? '1080P 高清' : '手机版');
    showToast(`已应用 Bing 每日一图 (${label})`);
  };

  const handleWallpaperUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast("图片过大，请使用 3MB 以下的图片", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        setLayoutSettings({ ...layoutSettings, bgEnabled: true, bgType: 'custom', bgUrl: ev.target.result });
        showToast('自定义壁纸已应用');
      };
      reader.readAsDataURL(file);
    }
  };

  const updateFooterLink = (index: number, field: string, value: string) => {
    const newLinks = [...(appConfig.footerLinks || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setAppConfig({ ...appConfig, footerLinks: newLinks });
  };

  const addFooterLink = () => {
    setAppConfig({ ...appConfig, footerLinks: [...(appConfig.footerLinks || []), { name: 'New Link', url: '#' }] });
  };

  const removeFooterLink = (index: number) => {
    const newLinks = [...(appConfig.footerLinks || [])];
    newLinks.splice(index, 1);
    setAppConfig({ ...appConfig, footerLinks: newLinks });
  };

  const tabs = [
    { id: 'layout', label: '布局风格', icon: Layout },
    { id: 'appearance', label: '外观壁纸', icon: WallpaperIcon },
    { id: 'general', label: '通用设置', icon: Settings },
    { id: 'categories', label: '分类管理', icon: List },
    { id: 'data', label: '数据备份', icon: HardDrive }
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-3xl shadow-2xl backdrop-blur-2xl border flex overflow-hidden h-[600px] max-h-[90vh] ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white/60'}`}>
        <div
          className={`w-64 flex-shrink-0 border-r p-6 flex flex-col gap-2 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 px-2">
            <div className="p-1.5 rounded-lg bg-indigo-500 text-white"><Settings size={16} /></div>
            控制中心
          </h3>
          {tabs.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all active:scale-95 ${activeTab === t.id ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100')}`}>
            <t.icon size={18} />
            {t.label}</button>))}
          <div className="flex-1" />
          <button onClick={onClose}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all active:scale-95 ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}>
            <X size={18} /> 关闭面板
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeTab === 'layout' && (<div className="space-y-8">
            <div className="space-y-4"><h4 className="text-base font-bold opacity-80">界面选项</h4>
              <div className="grid grid-cols-2 gap-4"><label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}><input
                  type="checkbox" checked={layoutSettings.isWideMode}
                  onChange={e => setLayoutSettings({ ...layoutSettings, isWideMode: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500" /><span
                    className="text-sm font-medium">宽屏模式</span></label><label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}><input
                    type="checkbox" checked={layoutSettings.showWidgets}
                    onChange={e => setLayoutSettings({ ...layoutSettings, showWidgets: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500" /><span
                      className="text-sm font-medium">显示仪表盘</span></label><label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}><input
                    type="checkbox" checked={layoutSettings.stickyHeader}
                    onChange={e => setLayoutSettings({ ...layoutSettings, stickyHeader: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500" /><span
                      className="text-sm font-medium">固定页首</span></label><label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}><input
                    type="checkbox" checked={layoutSettings.stickyFooter}
                    onChange={e => setLayoutSettings({ ...layoutSettings, stickyFooter: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500" /><span
                      className="text-sm font-medium">固定页尾</span></label></div>
            </div>
            <div className="space-y-6"><h4 className="text-base font-bold opacity-80">卡片样式</h4>
              <RangeControl label="卡片高度" value={layoutSettings.cardHeight} min={80} max={160}
                onChange={(v: number) => setLayoutSettings({
                  ...layoutSettings,
                  cardHeight: v
                })} unit="px" /><RangeControl label="每行数量" value={layoutSettings.gridCols}
                  min={3} max={8}
                  onChange={(v: number) => setLayoutSettings({
                    ...layoutSettings,
                    gridCols: v
                  })} /><RangeControl label="网格间距"
                    value={layoutSettings.gap}
                    min={2} max={8}
                    onChange={(v: number) => setLayoutSettings({
                      ...layoutSettings,
                      gap: v
                    })} /><RangeControl
                label="玻璃透明度" value={layoutSettings.glassOpacity} min={20} max={95}
                onChange={(v: number) => setLayoutSettings({ ...layoutSettings, glassOpacity: v })}
                unit="%" /></div>
          </div>)}

          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <h4 className="text-base font-bold opacity-80 flex items-center gap-2"><Type
                  size={16} /> 全局字体</h4>

                {/* NEW: Font Size Control */}
                <div className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/10 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ZoomIn size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-500">全局缩放/字体大小</span>
                  </div>
                  <RangeControl
                    label="界面缩放比例"
                    value={layoutSettings.fontSizeScale || 100}
                    min={80}
                    max={130}
                    onChange={(v: number) => setLayoutSettings({
                      ...layoutSettings,
                      fontSizeScale: v
                    })}
                    unit="%"
                  />
                  <p className="text-xs opacity-50 mt-2">调整此选项将缩放所有文字、图标和间距。</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FONTS.map(font => (
                    <div
                      key={font.id}
                      onClick={() => setLayoutSettings({ ...layoutSettings, fontFamily: font.id })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 flex items-center justify-between ${layoutSettings.fontFamily === font.id ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : (isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')}`}
                    >
                      <span className="text-sm font-medium">{font.name}</span>
                      {layoutSettings.fontFamily === font.id && <CheckCircle2 size={16} />}
                    </div>
                  ))}
                </div>
              </div>
              <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

              {/* Background Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold opacity-80 flex items-center gap-2">
                    <WallpaperIcon size={16} /> 背景壁纸</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={layoutSettings.bgEnabled}
                      onChange={e => setLayoutSettings({
                        ...layoutSettings,
                        bgEnabled: e.target.checked
                      })} className="sr-only peer" />
                    <div
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {layoutSettings.bgEnabled && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <button onClick={() => setBingWallpaper(bingQuality)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${layoutSettings.bgType === 'bing' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'opacity-60'}`}>
                        <Globe size={16} /> Bing
                      </button>
                      <button onClick={() => {
                        setLayoutSettings({
                          ...layoutSettings,
                          bgType: 'custom',
                          bgEnabled: true
                        });
                      }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${layoutSettings.bgType === 'custom' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'opacity-60'}`}>
                        <ImagePlus size={16} /> 自定义
                      </button>
                      {/* Pure Color Option */}
                      <button onClick={() => {
                        setLayoutSettings({
                          ...layoutSettings,
                          bgType: 'color',
                          bgEnabled: true
                        });
                      }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${layoutSettings.bgType === 'color' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'opacity-60'}`}>
                        <Palette size={16} /> 纯色
                      </button>
                    </div>

                    {/* Pure Color Settings */}
                    {layoutSettings.bgType === 'color' && (
                      <div
                        className="space-y-4 p-4 rounded-xl border bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 animate-in fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium opacity-70">清新淡雅配色</span>
                          <input
                            type="color"
                            value={layoutSettings.bgColor}
                            onChange={(e) => setLayoutSettings({
                              ...layoutSettings,
                              bgColor: e.target.value
                            })}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          {FRESH_BACKGROUND_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setLayoutSettings({
                                ...layoutSettings,
                                bgColor: color
                              })}
                              className={`h-10 rounded-lg border transition-transform hover:scale-105 active:scale-95 ${layoutSettings.bgColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'border-slate-200 dark:border-white/10'}`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bing Resolution Settings */}
                    {layoutSettings.bgType === 'bing' && (
                      <div
                        className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-center space-y-3">
                        <p className="text-sm text-indigo-500 font-medium">Bing
                          每日壁纸已启用，请选择清晰度：</p>
                        <div className="flex justify-center gap-2">
                          {[
                            { id: '1920x1080', label: '1080P 高清' },
                            { id: 'uhd', label: '4K 超清' },
                            { id: '1366x768', label: '手机版' }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setBingWallpaper(opt.id)}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all active:scale-95 ${bingQuality === opt.id
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-white/50 dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-white/20 border-transparent'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-indigo-500/10 mt-2 grid grid-cols-2 gap-2">
                          <button onClick={() => setIsWallpaperManagerOpen(true)}
                            className="py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2">
                            <ImagePlus size={14} /> 管理壁纸
                          </button>
                          <button onClick={handleSyncBing}
                            className="py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2">
                            <RefreshCw size={14} /> 同步壁纸
                          </button>
                        </div>
                      </div>
                    )}

                    {layoutSettings.bgType === 'custom' && (
                      <>
                        {layoutSettings.bgUrl ? (
                          <div className="space-y-4 animate-in fade-in">
                            <BackgroundPositionPreview
                              imageUrl={layoutSettings.bgUrl}
                              x={layoutSettings.bgX ?? 50}
                              y={layoutSettings.bgY ?? 50}
                              scale={layoutSettings.bgScale ?? 100}
                              onChange={(x: number, y: number) => setLayoutSettings({
                                ...layoutSettings,
                                bgX: x,
                                bgY: y
                              })}
                            />

                            <div className="flex gap-2">
                              <button onClick={() => setIsWallpaperManagerOpen(true)}
                                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <ImagePlus size={14} /> 管理壁纸库
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => setIsWallpaperManagerOpen(true)}
                            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all active:scale-95 group">
                            <div
                              className="w-12 h-12 mx-auto bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <UploadCloud size={24} />
                            </div>
                            <h5 className="font-bold text-sm mb-1">选择或上传壁纸</h5>
                            <p className="text-xs opacity-50">支持 Bing 壁纸和自定义图片</p>
                          </div>
                        )}



                        <div
                          className="mt-4 space-y-3 border-t border-dashed pt-4 border-slate-200 dark:border-white/10">
                          <p className="text-xs font-bold opacity-70">精细调整</p>
                          <RangeControl label="缩放比例" value={layoutSettings.bgScale ?? 100}
                            min={100} max={200} unit="%"
                            onChange={(v: number) => setLayoutSettings({
                              ...layoutSettings,
                              bgScale: v
                            })} />
                          <RangeControl label="水平位置" value={layoutSettings.bgX ?? 50}
                            min={0} max={100} unit="%"
                            onChange={(v: number) => setLayoutSettings({
                              ...layoutSettings,
                              bgX: v
                            })} />
                          <RangeControl label="垂直位置" value={layoutSettings.bgY ?? 50}
                            min={0} max={100} unit="%"
                            onChange={(v: number) => setLayoutSettings({
                              ...layoutSettings,
                              bgY: v
                            })} />
                        </div>
                      </>
                    )}

                    {layoutSettings.bgType !== 'color' && (
                      <div className="px-1 pt-2">
                        <RangeControl
                          label="背景遮罩浓度 (保证文字可读性)"
                          value={layoutSettings.bgOpacity}
                          min={0} max={90}
                          onChange={(v: number) => setLayoutSettings({
                            ...layoutSettings,
                            bgOpacity: v
                          })}
                          unit="%"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isWallpaperManagerOpen && (
                <WallpaperManager
                  isOpen={isWallpaperManagerOpen}
                  onClose={() => setIsWallpaperManagerOpen(false)}
                  onSelect={(url: string) => setLayoutSettings({ ...layoutSettings, bgUrl: url })}
                  isDarkMode={isDarkMode}
                  showToast={showToast}
                />
              )}


              <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

              {/* Color Mode Toggles */}
              <div className="space-y-5">
                {/* Colorful Cards Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold opacity-80 flex items-center gap-2">
                      <PaintBucket size={16} /> 多彩站点卡片</h4>
                    <p className="text-xs opacity-50">为每个站点应用淡雅的背景色</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={layoutSettings.colorfulCards}
                      onChange={e => setLayoutSettings({
                        ...layoutSettings,
                        colorfulCards: e.target.checked
                      })} className="sr-only peer" />
                    <div
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Colorful Navigation Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold opacity-80 flex items-center gap-2"><Palette
                      size={16} /> 彩色导航条</h4>
                    <p className="text-xs opacity-50">为分类标签启用多彩背景</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={layoutSettings.navColorMode}
                      onChange={e => setLayoutSettings({
                        ...layoutSettings,
                        navColorMode: e.target.checked
                      })} className="sr-only peer" />
                    <div
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-base font-bold opacity-80 flex items-center gap-2"><Type
                  size={16} /> 网站标识</h4>
                <div><label className="text-xs opacity-60 block mb-1.5">网页标题</label><input
                  className={inputClass} value={appConfig.siteTitle}
                  onChange={e => setAppConfig({ ...appConfig, siteTitle: e.target.value })} /></div>
                <div><label className="text-xs opacity-60 block mb-1.5">Logo 显示模式</label>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button onClick={() => setAppConfig({ ...appConfig, logoType: 'text' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${appConfig.logoType !== 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'opacity-60'}`}>文字模式
                    </button>
                    <button onClick={() => setAppConfig({ ...appConfig, logoType: 'image' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${appConfig.logoType === 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'opacity-60'}`}>图片模式
                    </button>
                  </div>
                </div>
                {appConfig.logoType === 'image' ? (<div className="space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>{appConfig.logoImage ?
                        <img src={appConfig.logoImage} className="w-full h-full object-contain" /> :
                        <ImageIcon className="opacity-30" />}</div>
                    <div className="flex-1">
                      <button onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors active:scale-95">上传
                        Logo 图片
                      </button>
                      <p className="text-xs opacity-50">建议尺寸: 高度 80px，文件小于 500KB</p>
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*"
                        onChange={handleLogoUpload} /></div>
                  </div>
                </div>) : (<div className="grid grid-cols-2 gap-4 animate-in fade-in">
                  <div><label className="text-xs opacity-60 block mb-1.5">Logo 主文字</label><input
                    className={inputClass} value={appConfig.logoText}
                    onChange={e => setAppConfig({ ...appConfig, logoText: e.target.value })} /></div>
                  <div><label className="text-xs opacity-60 block mb-1.5">Logo 高亮文字</label><input
                    className={inputClass} value={appConfig.logoHighlight}
                    onChange={e => setAppConfig({ ...appConfig, logoHighlight: e.target.value })} />
                  </div>
                </div>)}
              </div>
              <div className={`h-px w-full my-6 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h4 className="text-base font-bold opacity-80 flex items-center gap-2"><Layout
                  size={16} /> 页脚设置</h4>
                <div><label className="text-xs opacity-60 block mb-1.5">底部文字</label><input
                  className={inputClass} value={appConfig.footerText}
                  onChange={e => setAppConfig({ ...appConfig, footerText: e.target.value })} /></div>

                {/* Footer Links Editor */}
                <div className="space-y-3 mt-4">
                  <label className="text-xs opacity-60 block">底部链接管理</label>
                  {(appConfig.footerLinks || []).map((link: any, i: number) => (
                    <div key={i}
                      className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <input className={`${inputClass} flex-[2]`} value={link.name}
                        onChange={(e) => updateFooterLink(i, 'name', e.target.value)}
                        placeholder="链接名称" />
                      <input className={`${inputClass} flex-[3]`} value={link.url}
                        onChange={(e) => updateFooterLink(i, 'url', e.target.value)}
                        placeholder="链接地址 (https://...)" />
                      <button onClick={() => removeFooterLink(i)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button onClick={addFooterLink}
                    className={`w-full py-2 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'border-white/10 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 hover:border-indigo-500 hover:text-indigo-600'}`}>
                    <Plus size={14} /> 添加新链接
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <NewCategoryInput onAdd={handleAddCategory} isDarkMode={isDarkMode} />
              <div className="space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={categories} strategy={verticalListSortingStrategy}>
                    {categories.map((cat: string, idx: number) => (
                      <SortableCategoryItem key={cat} id={cat}>
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <SortableDragHandle className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-500">
                              <GripVertical size={16} />
                            </SortableDragHandle>
                            <div className="flex flex-col gap-0.5 text-slate-400">
                              <button onClick={() => moveCategory(idx, idx - 1)}
                                disabled={idx === 0}
                                className="hover:text-indigo-500 disabled:opacity-30 active:scale-90">
                                <ArrowUp size={12} /></button>
                              <button onClick={() => moveCategory(idx, idx + 1)}
                                disabled={idx === categories.length - 1}
                                className="hover:text-indigo-500 disabled:opacity-30 active:scale-90">
                                <ArrowDown size={12} /></button>
                            </div>
                            {/* Category Color Picker */}
                            <div className="relative group/color">
                              <div
                                className="w-6 h-6 rounded-full shadow-sm cursor-pointer ring-1 ring-black/5"
                                style={{ backgroundColor: categoryColors[cat] || '#6366F1' }}></div>
                              <input
                                type="color"
                                value={categoryColors[cat] || '#6366F1'}
                                onChange={(e) => setCategoryColors({
                                  ...categoryColors,
                                  [cat]: e.target.value
                                })}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            <span
                              className={`text-sm ${hiddenCategories.includes(cat) ? 'opacity-50 line-through decoration-2' : 'font-medium'}`}>{cat}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{sites.filter((s: any) => s.category === cat).length}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => toggleCategoryVisibility(cat)}
                              className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 active:scale-90">{hiddenCategories.includes(cat) ?
                                <EyeOff size={16} /> : <Eye size={16} />}</button>
                            <button onClick={() => handleDeleteCategory(cat)}
                              className="p-2 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 active:scale-90">
                              <Trash2 size={16} /></button>
                          </div>
                        </div>
                      </SortableCategoryItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
          {activeTab === 'data' && (<div className="grid grid-cols-2 gap-4">
            <div onClick={handleExport}
              className={`p-6 rounded-2xl border cursor-pointer text-center transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-indigo-500/20' : 'bg-slate-50 border-slate-200 hover:bg-indigo-50'}`}>
              <Download size={32} className="mx-auto mb-3 text-indigo-500" /><h4
                className="font-bold mb-1">导出配置</h4><p className="text-xs opacity-60">保存所有数据为
                  JSON 文件</p></div>
            <div onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border cursor-pointer text-center transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-emerald-500/20' : 'bg-slate-50 border-slate-200 hover:bg-emerald-50'}`}>
              <UploadCloud size={32} className="mx-auto mb-3 text-emerald-500" /><h4
                className="font-bold mb-1">导入配置</h4><p className="text-xs opacity-60">恢复 JSON
                  备份文件</p><input type="file" ref={fileInputRef} className="hidden" accept=".json"
                    onChange={handleFileSelect} /></div>

            {/* Sync Icons Button */}
            <div onClick={async () => {
              try {
                showToast('正在后台同步图标...', 'success');
                const res = await fetch('/api/admin/cache-icons', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  showToast(`同步完成，处理了 ${data.processed} 个站点`, 'success');
                } else {
                  showToast('同步失败', 'error');
                }
              } catch (e) {
                showToast('请求失败', 'error');
              }
            }}
              className={`p-6 rounded-2xl border cursor-pointer text-center transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-blue-500/20' : 'bg-slate-50 border-slate-200 hover:bg-blue-50'}`}>
              <RefreshCw size={32} className="mx-auto mb-3 text-blue-500" /><h4
                className="font-bold mb-1">同步图标缓存</h4><p className="text-xs opacity-60">下载未缓存的
                  站点图标</p></div>
          </div>)}
        </div>
      </div>
    </div >
  )
}

function Footer({ isDarkMode, appConfig, isSticky }: any) {
  const currentYear = new Date().getFullYear();
  const footerText = appConfig.footerText || `© ${currentYear} JiGuang. Build your own start page.`;
  const footerLinks = appConfig.footerLinks || [];
  return (
    <footer
      className={`w-full transition-all duration-300 border-t ${isSticky ? 'fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]' : 'relative mt-auto'} ${isDarkMode ? 'bg-slate-900/90 border-white/5 text-slate-400' : 'bg-white/90 border-slate-100 text-slate-500'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-center md:text-left">
            <div
              className="flex items-center gap-2 select-none opacity-80 hover:opacity-100 transition-opacity">{appConfig.logoType === 'image' && appConfig.logoImage ? (
                <img src={appConfig.logoImage} className="h-5 w-auto object-contain" alt="Logo" />) : (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white shadow-sm ${isDarkMode ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                    <LayoutGrid size={12} /></div>
                  <span
                    className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{appConfig.logoText}<span
                      className="text-indigo-500">{appConfig.logoHighlight}</span></span></div>)}</div>
            <div className="hidden md:block w-px h-4 bg-current opacity-20"></div>
            <div
              className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity">{footerText.replace('{year}', String(currentYear))}</div>
          </div>
          {footerLinks.length > 0 && (<div
            className="flex flex-wrap justify-center gap-4 md:gap-6">{footerLinks.map((link: any, i: number) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className={`text-xs font-medium transition-colors hover:underline underline-offset-4 ${isDarkMode ? 'hover:text-indigo-400' : 'hover:text-indigo-600'}`}>{link.name}</a>))}</div>)}
        </div>
      </div>
    </footer>
  );
}

// Updated CategoryPill to support Custom Colors
function CategoryPill({ label, active, onClick, isDarkMode, color, navColorMode }: any) {
  if (!navColorMode) {
    // Colorful Mode
    const style = active
      ? { backgroundColor: color, color: '#ffffff', boxShadow: `0 4px 15px -3px ${color}80` }
      : { backgroundColor: `${color}15`, color: color };

    return (
      <div className="relative group/pill shrink-0 px-1">
        <button
          onClick={onClick}
          style={style}
          className={`relative px-5 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 active:scale-95 hover:brightness-110`}
        >
          {label}
        </button>
      </div>
    );
  }

  // Classic Mode
  return (
    <div className="relative group/pill shrink-0 px-1">
      <button onClick={onClick}
        className={`relative px-5 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 active:scale-95 ${active ? 'text-white shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)] scale-105' : (isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-white/10' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80')}`}>
        {active && <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-[length:200%_auto] animate-gradient-move rounded-full"></div>}
        {label}
      </button>
    </div>
  );
}

function ActionButton({ icon: Icon, onClick, isDarkMode, highlight, active, danger, tooltip }: any) {
  return (<button onClick={onClick} title={tooltip}
    className={`p-2.5 rounded-xl transition-all duration-200 relative group active:scale-95 ${highlight ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105' : active ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')} ${danger && !highlight ? 'hover:text-red-500 hover:bg-red-500/10' : ''}`}>
    <Icon size={20} strokeWidth={highlight ? 2.5 : 2} /></button>);
}

function ThemeToggle({ isDarkMode, toggleTheme }: any) {
  return (<button onClick={toggleTheme}
    className={`p-2.5 rounded-xl transition-all duration-300 active:scale-95 overflow-hidden relative ${isDarkMode ? 'bg-white/5 text-yellow-300 hover:bg-white/10' : 'bg-slate-100 text-orange-500 hover:bg-slate-200'}`}>
    <div className="relative z-10">{isDarkMode ? <Moon size={20} className="fill-current" /> :
      <Sun size={20} className="fill-current" />}</div>
  </button>);
}

function RangeControl({ label, value, min, max, unit, onChange }: any) {
  return (<div>
    <div className="flex justify-between text-xs mb-1 opacity-70"><span>{label}</span><span>{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
  </div>);
}

function NewCategoryInput({ onAdd, isDarkMode }: any) {
  const [val, setVal] = useState('');
  return (<form onSubmit={(e) => {
    e.preventDefault();
    onAdd(val);
    setVal('')
  }} className="flex gap-2"><input
      className={`flex-1 rounded-xl px-3 py-2 text-sm border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${isDarkMode ? 'bg-white/5 border-white/10 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400'}`}
      placeholder="输入新分类名称..." value={val} onChange={e => setVal(e.target.value)} />
    <button disabled={!val.trim()}
      className="bg-indigo-500 text-white px-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"><Plus
        size={16} /></button>
  </form>)
}

function EmptyState({ isDarkMode, mode }: any) {
  return (<div className="col-span-full py-20 text-center animate-in fade-in duration-500">
    <div
      className={`inline-flex p-6 rounded-full mb-4 ${isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
      <Search size={40} /></div>
    <p className="text-lg font-medium opacity-60">{mode === 'filter' ? '没有找到相关内容' : '输入关键词搜索'}</p>
  </div>);
}

function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, isDarkMode }: any) {
  return isOpen ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ease-out ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white/60'}`}>
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <AlertTriangle size={24} /></div>
        <h3 className="font-bold text-xl mb-2">{title}</h3><p
          className="text-sm opacity-60 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95 ${isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>取消
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95">确认删除
          </button>
        </div>
      </div>
    </div>
  ) : null;
}

function LoginModal({ isOpen, onClose, onLogin, isDarkMode }: any) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const inputClass = `w-full rounded-xl px-3 py-2.5 text-sm border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`;
  if (!isOpen) return null;
  return (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
    <div
      className={`relative w-full max-w-sm rounded-3xl shadow-2xl p-8 border backdrop-blur-xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ease-out ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white/60'}`}>
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-500/30 transform rotate-3">
          <User size={32} /></div>
        <h2 className="text-2xl font-bold">欢迎回来</h2><p
          className="text-sm opacity-50 mt-2">请登录以管理您的导航站</p></div>
      <form onSubmit={e => {
        e.preventDefault();
        onLogin(u, p);
      }} className="space-y-4">
        <div className="space-y-1"><label className="text-xs font-medium opacity-60 ml-1">用户名</label><input
          className={inputClass} placeholder="admin" value={u} onChange={e => setU(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-xs font-medium opacity-60 ml-1">密码</label><input
          className={inputClass} type="password" placeholder="••••••" value={p}
          onChange={e => setP(e.target.value)} /></div>
        {err && <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-xs flex items-center gap-2">
          <AlertTriangle size={14} />{err}</div>}
        <button
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium mt-2 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all">立即登录
        </button>
      </form>
    </div>
  </div>)
}

function EditModal({ site, categories, isDarkMode, onClose, onSave }: any) {
  const [f, setF] = useState({
    name: '',
    url: '',
    desc: '',
    category: categories[0] || '',
    color: getRandomColor(),
    icon: 'Globe',
    iconType: 'auto',
    customIconUrl: ''
  });
  const [isCatOpen, setIsCatOpen] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (site) setF({ ...site, iconType: site.iconType || 'auto' });
  }, [site]);

  const inputClass = `w-full rounded-xl px-3 py-2.5 text-sm border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${isDarkMode ? 'bg-slate-800/50 border-white/10 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400'}`;
  const labelClass = "text-xs font-medium opacity-70 ml-1 mb-1.5 block";

  const handleIconUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => setF({ ...f, customIconUrl: ev.target.result, iconType: 'upload' });
      reader.readAsDataURL(file);
    }
  };

  const renderPreviewIcon = () => {
    if (f.iconType === 'upload' && f.customIconUrl) return <img src={f.customIconUrl}
      className="w-full h-full object-contain p-2" />;
    if (f.iconType === 'library') {
      const I = ICON_MAP[f.icon] || Globe;
      return <I size={32} className="text-slate-700 dark:text-slate-200" />
    }

    const autoUrl = getSimpleFaviconUrl(f.url);
    if (!autoUrl) return <Globe size={32} className="text-slate-400" />;
    return <img src={autoUrl} className="w-full h-full object-contain p-2"
      onError={(e: any) => e.currentTarget.src = 'https://api.iowen.cn/favicon/google.com.png'} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        className={`relative w-full max-w-3xl rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              {site ? <Edit3 size={18} /> : <Plus size={18} />}
            </div>
            {site ? '编辑站点' : '添加新站点'}
          </h2>
          <button onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors active:scale-90">
            <X size={20} className="opacity-50" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <form id="site-form" onSubmit={e => {
            e.preventDefault();
            onSave(f);
          }} className="flex flex-col gap-8">

            {/* 1. URL Section - Primary Input */}
            <div className="relative group">
              <div
                className={`absolute left-3 top-3.5 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                <LinkIcon size={18} /></div>
              <input
                required
                autoFocus={!site}
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-base border-2 outline-none transition-all ${isDarkMode ? 'bg-slate-800/50 border-white/5 focus:border-indigo-500/50' : 'bg-slate-50 border-slate-100 focus:border-indigo-500/30'} focus:ring-4 focus:ring-indigo-500/10`}
                value={f.url}
                onChange={e => setF({ ...f, url: e.target.value })}
                placeholder="输入网站链接 (https://...)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Visuals & Style (5 cols) */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="space-y-2">
                  <label className={labelClass}>卡片预览</label>
                  {/* Live Preview Card */}
                  <div
                    className="w-full aspect-[1.6/1] rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all shadow-sm group cursor-default select-none"
                    style={{ backgroundColor: `${f.color}15`, borderColor: `${f.color}30` }}>

                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: `radial-gradient(circle at top right, ${f.color}, transparent 70%)` }}></div>

                    {/* Icon Badge */}
                    <div
                      className="relative z-10 w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-black/5 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      {renderPreviewIcon()}
                      {f.iconType === 'auto' && <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"></div>}
                    </div>

                    <div className="absolute bottom-4 px-6 text-center w-full">
                      <div className="text-sm font-bold truncate opacity-90"
                        style={{ color: getAccessibleTextColor(isDarkMode ? '#1e293b' : '#ffffff') }}>{f.name || '站点名称'}</div>
                    </div>
                  </div>
                </div>

                {/* Icon Source Tabs */}
                <div className={`p-1 rounded-xl flex ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {[
                    { id: 'auto', label: '自动', icon: Sparkles },
                    { id: 'upload', label: '上传', icon: UploadCloud },
                    { id: 'library', label: '图库', icon: LayoutGrid }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setF({ ...f, iconType: tab.id })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${f.iconType === tab.id ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Icon Content */}
                <div
                  className={`rounded-xl border p-4 min-h-[120px] flex flex-col items-center justify-center text-center transition-all ${isDarkMode ? 'bg-slate-800/30 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                  {f.iconType === 'auto' && (
                    <div className="space-y-2 animate-in fade-in">
                      <div
                        className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                        <Sparkles size={20} /></div>
                      <p className="text-xs opacity-60">根据网址自动抓取图标</p>
                    </div>
                  )}
                  {f.iconType === 'upload' && (
                    <div onClick={() => iconInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:opacity-70 transition-opacity animate-in fade-in">
                      <UploadCloud size={24} className="mb-2 opacity-40" />
                      <p className="text-xs opacity-60">点击上传 (PNG/SVG)</p>
                      <input type="file" ref={iconInputRef} className="hidden" accept="image/*"
                        onChange={handleIconUpload} />
                    </div>
                  )}
                  {f.iconType === 'library' && (
                    <div
                      className="grid grid-cols-5 gap-2 w-full max-h-[120px] overflow-y-auto custom-scrollbar animate-in fade-in">
                      {Object.keys(ICON_MAP).map(iconName => {
                        const I = ICON_MAP[iconName];
                        return (
                          <button type="button" key={iconName}
                            onClick={() => setF({ ...f, icon: iconName })}
                            className={`aspect-square rounded-lg flex items-center justify-center transition-all ${f.icon === iconName ? 'bg-indigo-500 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-400'}`}>
                            <I size={18} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Theme Color - Presets & Custom */}
                <div>
                  <label className={labelClass}>主题色</label>
                  <div className="flex flex-wrap gap-2">
                    {['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#64748B'].map(c => (
                      <button key={c} type="button" onClick={() => setF({ ...f, color: c })}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ring-2 ring-offset-2 dark:ring-offset-slate-900 ${f.color === c ? 'ring-indigo-500 scale-110' : 'ring-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>
                    <div className="relative group">
                      <div
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-blue-400 cursor-pointer ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-transparent group-hover:scale-110 transition-transform"></div>
                      <input type="color" value={f.color}
                        onChange={e => setF({ ...f, color: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <button type="button" onClick={() => setF({ ...f, color: getRandomColor() })}
                      className="ml-auto text-xs text-indigo-500 hover:underline flex items-center gap-1">
                      <RefreshCw size={12} /> 随机
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Details (7 cols) */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div>
                  <label className={labelClass}>网站名称</label>
                  <input required className={inputClass} value={f.name}
                    onChange={e => setF({ ...f, name: e.target.value })}
                    placeholder="例如: Google" />
                </div>

                <div className="relative">
                  <label className={labelClass}>所属分类</label>
                  <div className="relative">
                    <button type="button" onClick={() => setIsCatOpen(!isCatOpen)}
                      className={`${inputClass} flex items-center justify-between text-left active:scale-[0.99]`}>
                      <span
                        className={!f.category ? 'opacity-50' : ''}>{f.category || '选择分类'}</span>
                      <ChevronDown size={16}
                        className={`opacity-50 transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCatOpen && (
                      <>
                        <div className="fixed inset-0 z-10"
                          onClick={() => setIsCatOpen(false)} />
                        <div
                          className={`absolute top-full left-0 right-0 mt-2 p-1.5 rounded-xl border shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-100'}`}>
                          {categories.map((c: string) => (
                            <button type="button" key={c} onClick={() => {
                              setF({ ...f, category: c });
                              setIsCatOpen(false);
                            }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between group ${f.category === c ? 'bg-indigo-500/10 text-indigo-500' : (isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600')}`}>
                              {c}
                              {f.category === c && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <label className={labelClass}>简介描述</label>
                  <textarea rows={4}
                    className={`${inputClass} resize-none h-full min-h-[100px] leading-relaxed`}
                    value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })}
                    placeholder="简短的描述网站用途..." />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5 rounded-b-3xl backdrop-blur-xl">
          <button type="button" onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95 ${isDarkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200/50'}`}>取消
          </button>
          <button onClick={() => onSave(f)}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
            <CheckCircle2 size={16} /> 保存
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordModal({ isOpen, onClose, isDarkMode, showToast }: any) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const inputClass = `w-full rounded-xl px-3 py-2.5 text-sm border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl p-8 border backdrop-blur-xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ease-out ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white/60'}`}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold">修改密码</h2>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const res = await fetch('/api/auth/password', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
            });
            if (res.ok) {
              showToast('密码修改成功', 'success');
              onClose();
            } else {
              showToast('原密码错误', 'error');
            }
          } catch (err) {
            showToast('请求失败', 'error');
          } finally {
            setLoading(false);
          }
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium opacity-60 ml-1">原密码</label>
            <input className={inputClass} type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium opacity-60 ml-1">新密码</label>
            <input className={inputClass} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium mt-2 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
            {loading ? '提交中...' : '确认修改'}
          </button>
        </form>
      </div>
    </div>
  );
}

function WallpaperManager({ isOpen, onClose, onSelect, isDarkMode, showToast }: any) {
  const [activeTab, setActiveTab] = useState('bing'); // 'bing' | 'custom'
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWallpapers = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallpapers?type=${type}`);
      if (res.ok) {
        setWallpapers(await res.json());
      }
    } catch (e) {
      showToast('获取壁纸失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchWallpapers(activeTab);
  }, [isOpen, activeTab]);

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('正在上传...', 'loading');
      const res = await fetch('/api/wallpapers', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast('上传成功', 'success');
        fetchWallpapers('custom');
      } else {
        showToast('上传失败', 'error');
      }
    } catch (e) {
      showToast('上传出错', 'error');
    }
  };

  const handleSyncBing = async () => {
    try {
      showToast('正在同步 Bing 壁纸...', 'loading');
      const res = await fetch('/api/wallpapers/bing', { method: 'POST' });
      if (res.ok) {
        showToast('同步成功', 'success');
        fetchWallpapers('bing');
      } else {
        showToast('同步失败', 'error');
      }
    } catch (e) {
      showToast('同步出错', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 张壁纸吗？`)) return;

    try {
      for (const id of selectedIds) {
        await fetch(`/api/wallpapers?id=${id}`, { method: 'DELETE' });
      }
      showToast('删除成功', 'success');
      setSelectedIds([]);
      fetchWallpapers(activeTab);
    } catch (e) {
      showToast('删除失败', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-5xl max-h-[85vh] h-full rounded-3xl shadow-2xl border backdrop-blur-xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-white/60'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ImagePlus size={20} className="text-indigo-500" /> 壁纸管理
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <X size={20} className="opacity-50" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 shrink-0">
          <div className="flex bg-slate-200/50 dark:bg-white/10 p-1 rounded-xl">
            <button onClick={() => setActiveTab('bing')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'bing' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-500' : 'opacity-60 hover:opacity-100'}`}>
              Bing 壁纸
            </button>
            <button onClick={() => setActiveTab('custom')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-500' : 'opacity-60 hover:opacity-100'}`}>
              自定义上传
            </button>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => {
              if (selectedIds.length === wallpapers.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(wallpapers.map(w => w.id));
              }
            }} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
              {selectedIds.length === wallpapers.length ? '取消全选' : '全选'}
            </button>
            {selectedIds.length > 0 && (
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1">
                <Trash2 size={14} /> 删除 ({selectedIds.length})
              </button>
            )}
            {activeTab === 'bing' ? (
              <button onClick={handleSyncBing} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center gap-1 shadow-lg shadow-indigo-500/20">
                <RefreshCw size={14} /> 同步今日壁纸
              </button>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center gap-1 shadow-lg shadow-indigo-500/20">
                <UploadCloud size={14} /> 上传图片
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full opacity-50">
              <RefreshCw size={32} className="animate-spin" />
            </div>
          ) : wallpapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2">
              <ImagePlus size={48} />
              <p>暂无壁纸</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-20">
              {wallpapers.map((w) => (
                <div key={w.id} className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedIds.includes(w.id) ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-indigo-500/50'}`}
                  onClick={() => onSelect(w.url)}>
                  <img src={w.url} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 right-2 z-20 p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(w.id);
                    }}>
                    <input type="checkbox" checked={selectedIds.includes(w.id)}
                      readOnly
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1.5 truncate">
                    {w.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}