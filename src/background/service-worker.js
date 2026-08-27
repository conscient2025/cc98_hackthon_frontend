// ============================================================
// 后台 Service Worker：通用 fetch 代理 + 未读徽章轮询
//   所有跨域请求（CC98 API / LLM / Watch 后端）经这里转发，绕过 CORS
// ============================================================
import { MSG, STORAGE_KEYS, BACKEND_DEFAULT_BASE } from '../shared/constants.js';

const BADGE_ALARM = 'badge-poll';

// chrome.storage.session 默认只对「可信上下文」开放（不含内容脚本），
// 必须显式放开，否则内容脚本读写 CC98 凭证会被拒绝。
function allowSessionStorageInContentScripts() {
  try {
    chrome.storage.session
      .setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
      .catch(() => {});
  } catch (e) { /* 老版本 Chrome 没有该 API，忽略 */ }
}

allowSessionStorageInContentScripts();

// ---------- 安装 / 启动：建立徽章轮询 ----------
chrome.runtime.onInstalled.addListener(() => {
  allowSessionStorageInContentScripts();
  chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 5 });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
});

chrome.runtime.onStartup.addListener(() => {
  allowSessionStorageInContentScripts();
  chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 5 });
});

// ---------- 消息：通用 fetch 代理 ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === MSG.FETCH) {
    handleFetch(msg.url, msg.options)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 0, data: { detail: e && e.message ? e.message : String(e) } }));
    return true; // 保持异步 sendResponse 有效
  }
  if (msg && msg.type === MSG.OPEN_OPTIONS) {
    chrome.runtime.openOptionsPage().catch(() => {});
    return false;
  }
  return false;
});

async function handleFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || undefined,
      credentials: options.credentials || 'omit',
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text; // 非 JSON 响应，原样返回字符串
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: e && e.message ? e.message : String(e) } };
  }
}

// ---------- 徽章轮询：查询未读通知数 ----------
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BADGE_ALARM) refreshBadge();
});

async function refreshBadge() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.USER_EMAIL, STORAGE_KEYS.BACKEND_BASE, STORAGE_KEYS.AUTH_TOKEN]);
  const email = stored[STORAGE_KEYS.USER_EMAIL];
  const token = stored[STORAGE_KEYS.AUTH_TOKEN];
  const base = (stored[STORAGE_KEYS.BACKEND_BASE] || BACKEND_DEFAULT_BASE).replace(/\/+$/, '');

  if (!email || !token) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    // 新后端要求 JWT：通知接口以 token 识别用户，user_id 查询参数已被后端忽略
    const res = await fetch(`${base}/api/v1/notifications`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    const unread = Array.isArray(list) ? list.filter((n) => !n.is_read).length : 0;
    chrome.action.setBadgeText({ text: unread ? String(Math.min(unread, 99)) : '' });
  } catch (e) {
    chrome.action.setBadgeText({ text: '' });
  }
}
