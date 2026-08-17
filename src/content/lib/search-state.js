// ============================================================
// 跨标签页共享的搜索状态
//   每个标签页的内容脚本都是独立实例，内存不共享。把搜索状态
//   （运行中 / 进度 / 结果 / 错误）写进 storage.local，所有标签页
//   订阅同一份状态并渲染，看起来就像「同一个插件」。
//
//   状态形状：
//     { status: 'running'|'done'|'error'|'cancelled', query, progress, report, error, ts }
//   ts 是最后一次更新时间：发起搜索的标签页若被关掉，其他标签页
//   靠 ts 判断状态已经不新鲜（STALE_MS），避免永远卡在进度条。
// ============================================================
import { STORAGE_KEYS } from '../../shared/constants.js';

export const STALE_MS = 25000; // 超过这么久没更新，认为发起方已消失

export async function readSearchState() {
  try {
    const obj = await chrome.storage.local.get(STORAGE_KEYS.LAST_SEARCH);
    return (obj && obj[STORAGE_KEYS.LAST_SEARCH]) || null;
  } catch (e) {
    return null;
  }
}

async function write(state) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SEARCH]: state });
  } catch (e) { /* 静默：配额或上下文失效都不该打断搜索 */ }
}

// 搜索开始 / 进度推进（progress 为 null 表示刚开始，还没有阶段信息）
export function publishRunning(query, progress) {
  return write({
    status: 'running',
    query,
    progress: progress || { percent: 0, stageKey: 'keyword', stageLabel: '准备中…' },
    ts: Date.now(),
  });
}

export function publishDone(query, report) {
  return write({ status: 'done', query, report, ts: Date.now() });
}

export function publishError(query, error) {
  return write({
    status: 'error',
    query,
    error: { message: error.message, hint: error.hint, detail: error.detail },
    ts: Date.now(),
  });
}

// 用户点「停止」：任何标签页都可发起，发起方看到后会中断管线
export function publishCancelled(query) {
  return write({ status: 'cancelled', query, ts: Date.now() });
}

export function clearSearchState() {
  return write(null);
}

// 运行中的状态是否已经不新鲜（发起标签页大概被关了 / 崩了）
export function isStale(state) {
  if (!state || state.status !== 'running') return false;
  return Date.now() - (state.ts || 0) > STALE_MS;
}

// 订阅状态变化，回调收到新状态（可能为 null 表示已清空）
export function subscribeSearchState(onChange) {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEYS.LAST_SEARCH]) return;
      onChange(changes[STORAGE_KEYS.LAST_SEARCH].newValue || null);
    });
  } catch (e) { /* 静默 */ }
}
