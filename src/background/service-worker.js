// ============================================================
// 后台 Service Worker：通用 fetch 代理 + 工具栏徽章同步
//   所有跨域请求（CC98 API / LLM / Watch 后端）经这里转发，绕过 CORS
// ============================================================
import { MSG } from '../shared/constants.js';

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

// 新版不再后台读取通知。升级后显式清除旧版本留下的周期任务。
function clearLegacyBadgePolling() {
  chrome.alarms.clear(BADGE_ALARM).catch(() => {});
}

clearLegacyBadgePolling();

chrome.runtime.onInstalled.addListener(() => {
  allowSessionStorageInContentScripts();
  clearLegacyBadgePolling();
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onStartup.addListener(() => {
  allowSessionStorageInContentScripts();
  clearLegacyBadgePolling();
  chrome.action.setBadgeText({ text: '' });
});

// ---------- 消息：通用 fetch 代理 ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === MSG.FETCH) {
    handleFetch(msg.url, msg.options)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 0, data: { detail: e && e.message ? e.message : String(e) } }));
    return true; // 保持异步 sendResponse 有效
  }
  if (msg && msg.type === MSG.SET_BADGE) {
    const count = Math.max(0, Number(msg.count) || 0);
    chrome.action.setBadgeText({ text: count ? (count > 99 ? '99+' : String(count)) : '' });
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
    const headers = {};
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) headers['retry-after'] = retryAfter;
    return { ok: res.ok, status: res.status, data, headers };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: e && e.message ? e.message : String(e) } };
  }
}
