// ============================================================
// 通知列表本机状态：按「后端地址 + 用户」隔离缓存和上次查看位置
// ============================================================
import { STORAGE_KEYS } from '../../shared/constants.js';
import { getBackendBase, getLocal, getUserEmail, getUserId, setLocal } from './storage.js';

export async function getNotificationScope() {
  const [backend, userId, email] = await Promise.all([
    getBackendBase(),
    getUserId(),
    getUserEmail(),
  ]);
  const normalizedBackend = String(backend || '').trim().replace(/\/+$/, '').toLowerCase();
  const identity = String(userId || email || '').trim().toLowerCase();
  return `${normalizedBackend}|${identity}`;
}

async function readAllStates() {
  const value = await getLocal(STORAGE_KEYS.NOTIFICATION_STATES);
  return value && typeof value === 'object' ? value : {};
}

export async function readNotificationState(scope) {
  const states = await readAllStates();
  const state = states[scope];
  return state && typeof state === 'object' ? state : {};
}

export async function patchNotificationState(scope, patch) {
  const states = await readAllStates();
  states[scope] = { ...(states[scope] || {}), ...patch };
  await setLocal(STORAGE_KEYS.NOTIFICATION_STATES, states);
  return states[scope];
}

export function newestNotificationId(list) {
  return (Array.isArray(list) ? list : []).reduce((max, item) => {
    const id = Number(item && item.id) || 0;
    return Math.max(max, id);
  }, 0);
}

export function countUnreadNotifications(list, lastSeenNotificationId) {
  const lastSeen = Number(lastSeenNotificationId) || 0;
  if (!lastSeen) return 0; // 第一次读取只建立基线，不把历史全部标成未读
  return (Array.isArray(list) ? list : []).filter((item) => (Number(item && item.id) || 0) > lastSeen).length;
}
