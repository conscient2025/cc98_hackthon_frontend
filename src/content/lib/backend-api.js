// ============================================================
// Watch 后端 API 客户端（订阅 / 通知 / 渠道 / 扫描 / 认证）
//   后端以字符串 user_id（浙大邮箱）区分用户，JWT 暂未校验
// ============================================================
import { getBackendBase, getUserEmail, getLocal } from './storage.js';
import { fetchProxy } from './net.js';
import { STORAGE_KEYS } from '../../shared/constants.js';
import { AppError, ERROR_TYPES } from './errors.js';

async function base() {
  const b = await getBackendBase();
  return String(b || '').replace(/\/+$/, '');
}

async function token() {
  return (await getLocal(STORAGE_KEYS.AUTH_TOKEN)) || '';
}

// 统一请求封装：成功返回解析后的 JSON，失败抛 AppError
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = await token();
  if (t) headers['Authorization'] = 'Bearer ' + t;

  let data;
  try {
    data = await fetchProxy((await base()) + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // fetchProxy 已把非 2xx 转成带 .status 的 Error；无 .status 说明网络/SW 挂了
    if (!e || !e.status) {
      throw new AppError(ERROR_TYPES.BACKEND_OFFLINE, '无法连接 Watch 后端', (e && e.message) || '');
    }
    throw new AppError(ERROR_TYPES.BACKEND_ERROR, (e && e.message) || '后端返回错误', { status: e.status, detail: e.detail });
  }
  return data;
}

// ---------- 健康检查 ----------
export async function getHealth() {
  return request('/api/v1/health');
}

// ---------- 认证 ----------
export async function requestEmailCode(email) {
  return request('/api/v1/auth/request-code', { method: 'POST', body: { email } });
}

export async function verifyEmailCode(email, code) {
  return request('/api/v1/auth/verify-code', { method: 'POST', body: { email, code } });
}

// ---------- 订阅 ----------
function userIdQuery() {
  return getUserEmail().then((e) => 'user_id=' + encodeURIComponent(e || 'demo_user'));
}

export async function listSubscriptions() {
  return request('/api/v1/subscriptions?' + (await userIdQuery()));
}

export async function createSubscription({ name, description, boardId }) {
  const email = await getUserEmail();
  return request('/api/v1/subscriptions', {
    method: 'POST',
    body: { user_id: email || 'demo_user', name, description: description || '', board_id: boardId || null },
  });
}

export async function updateSubscription(id, patch) {
  return request('/api/v1/subscriptions/' + encodeURIComponent(id), { method: 'PATCH', body: patch });
}

export async function deleteSubscription(id) {
  return request('/api/v1/subscriptions/' + encodeURIComponent(id), { method: 'DELETE' });
}

// ---------- 通知 ----------
export async function listNotifications() {
  return request('/api/v1/notifications?' + (await userIdQuery()));
}

export async function triggerScan() {
  return request('/api/v1/tasks/scan', { method: 'POST', body: {} });
}

// ---------- 通知渠道 ----------
export async function listChannels() {
  return request('/api/v1/notification-channels?' + (await userIdQuery()));
}

export async function saveChannel({ provider, enabled, notifyIntervalMinutes, config }) {
  const email = await getUserEmail();
  return request('/api/v1/notification-channels', {
    method: 'PUT',
    body: { user_id: email || 'demo_user', provider, enabled, notify_interval_minutes: notifyIntervalMinutes, config },
  });
}

export async function testChannel({ provider, enabled, notifyIntervalMinutes, config }) {
  const email = await getUserEmail();
  return request('/api/v1/notification-channels/test', {
    method: 'POST',
    body: { user_id: email || 'demo_user', provider, enabled, notify_interval_minutes: notifyIntervalMinutes, config },
  });
}
