// ============================================================
// 内容脚本入口：初始化所有 UI 组件 + 快捷键 + SPA 兜底
// ============================================================
import { injectStyles } from './ui/styles.js';
import { createFloatingBtn } from './ui/floating-btn.js';
import { createSidePanel, getSidePanel } from './ui/side-panel.js';
import { renderSearchPanel } from './ui/search-panel.js';
import { renderSubscriptions } from './ui/subscribe-panel.js';
import { renderNotifications } from './ui/notif-panel.js';
import { renderSettings } from './ui/settings-panel.js';
import { refreshAuth } from './lib/token-extractor.js';
import { isCC98Site } from './lib/webvpn.js';
import { warmupCleaner } from './cleaner/cleaner-bridge.js';

const BTN_ID = 'cc98-ai-float-btn';
const PANEL_ID = 'cc98-ai-panel';

const RENDERERS = {
  search: renderSearchPanel,
  subscribe: renderSubscriptions,
  notif: renderNotifications,
  settings: renderSettings,
};

let observer = null;

// 判断一个 href 是否指向 CC98（直接域名，或 WebVPN 的 /https/<加密> 重写形式）
function hrefIsCC98(href) {
  try {
    const u = new URL(href);
    if (u.hostname === 'www.cc98.org' || u.hostname === 'cc98.org') return true;
    const seg = u.pathname.split('/').filter(Boolean);
    return seg.length >= 2 && (seg[0] === 'https' || seg[0] === 'http');
  } catch (e) {
    return false;
  }
}

// 每个 tab 只挂一个 UI：只挂在「最外层 CC98 帧」。
//   - 顶帧是 CC98（直接访问 / WebVPN 重写后的顶帧）→ 挂
//   - 子帧且父帧也是 CC98（如帖子详情用同源 iframe）→ 跳过，避免重复按钮
function isOutermostCC98Frame() {
  if (window.top === window) return true;
  let parentHref = '';
  try {
    parentHref = window.parent.location.href;
  } catch (e) {
    return true; // 跨域读不到父帧，按「不是 CC98 内嵌」处理
  }
  return !hrefIsCC98(parentHref);
}

// 幂等挂载：按钮/面板任何一个丢了就重建（SPA 换内容可能清掉 body 子节点）
function mount() {
  injectStyles();
  createSidePanel({ renderers: RENDERERS });
  createFloatingBtn({ onClick: () => getSidePanel()?.toggle() });
}

// 检查按钮+面板是否都在，缺了就补；返回是否齐全
function ensureMounted() {
  const ok = !!document.getElementById(BTN_ID) && !!document.getElementById(PANEL_ID);
  if (!ok) mount();
  return !!document.getElementById(BTN_ID) && !!document.getElementById(PANEL_ID);
}

async function boot() {
  // 内嵌的 CC98 同源 iframe（如帖子详情）不挂 UI，避免重复按钮
  if (!isOutermostCC98Frame()) return;

  // WebVPN 域名下挂着全校站点，先确认这页真的是 CC98
  const ok = await isCC98Site();
  console.log('[CC98 AI+] 站点检查：', ok ? '通过，开始初始化' : '不是 CC98 页面，跳过');
  if (!ok) return;

  mount();

  // 提取 CC98 登录凭证到 session（供 AI 搜索使用），静默失败即可
  try {
    refreshAuth();
  } catch (e) { /* ignore */ }

  // 预热戾气过滤模型（后台 SW 加载 BGE），避免首次搜索卡在过滤阶段
  warmupCleaner();

  // 快捷键：Ctrl+Shift+K 搜索，Ctrl+Shift+N 通知（只挂一次）
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey) return;
    const k = (e.key || '').toLowerCase();
    const p = getSidePanel();
    if (!p) return;
    if (k === 'k') {
      e.preventDefault();
      p.open();
      p.setActiveTab('search');
    } else if (k === 'n') {
      e.preventDefault();
      p.open();
      p.setActiveTab('notif');
    }
  });

  // SPA 路由变化（pushState/replaceState/popstate）→ 立即补挂
  const emitRoute = () => window.dispatchEvent(new Event('cc98-route-change'));
  for (const method of ['pushState', 'replaceState']) {
    const orig = history[method];
    history[method] = function (...args) {
      const result = orig.apply(history, args);
      emitRoute();
      return result;
    };
  }
  window.addEventListener('popstate', emitRoute);
  window.addEventListener('cc98-route-change', () => { ensureMounted(); });

  // 兜底 1：body 子节点变化（SPA 换内容）→ 检查补挂
  observer = new MutationObserver(() => { ensureMounted(); });
  observer.observe(document.body, { childList: true });

  // 兜底 2：1 秒心跳，极端情况（body 整个被换）也能恢复
  setInterval(() => { ensureMounted(); }, 1000);

  console.log('[CC98 AI+] 初始化完成，悬浮按钮已挂载');
}

boot().catch((err) => console.error('[CC98 AI+] 初始化失败：', err));
