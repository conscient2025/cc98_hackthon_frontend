// ============================================================
// 订阅提醒服务 API 客户端（订阅 / 通知 / 接收方式 / 扫描 / 认证）
//   用户身份完全来自 JWT，不发送 user_id
// ============================================================
import { getBackendBase, getLocal, setLocal } from './storage.js';
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
      throw new AppError(ERROR_TYPES.BACKEND_OFFLINE, '暂时无法连接订阅提醒服务', (e && e.message) || '');
    }
    if (e.status === 401 && t) {
      await setLocal(STORAGE_KEYS.AUTH_TOKEN, '');
      await setLocal(STORAGE_KEYS.USER_EMAIL, '');
      await setLocal(STORAGE_KEYS.USER_ID, '');
      const authError = new AppError(ERROR_TYPES.NOT_LOGGED_IN_BACKEND, '登录已过期，请重新登录', e.detail);
      authError.status = 401;
      throw authError;
    }
    const backendError = new AppError(
      ERROR_TYPES.BACKEND_ERROR,
      (e && e.message) || '订阅提醒服务返回错误',
      { status: e.status, detail: e.detail, retryAfter: e.retryAfter }
    );
    backendError.status = e.status;
    backendError.retryAfter = e.retryAfter;
    throw backendError;
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
export async function listSubscriptions() {
  return request('/api/v1/subscriptions');
}

export async function createSubscription(expression) {
  return request('/api/v1/subscriptions', {
    method: 'POST',
    body: { expression },
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
  return request('/api/v1/notifications');
}

// ---------- 通知渠道 ----------
export async function listChannels() {
  return request('/api/v1/notification-channels');
}

export async function saveChannel({ provider, enabled, notifyIntervalMinutes, config }) {
  return request('/api/v1/notification-channels', {
    method: 'PUT',
    body: { provider, enabled, notify_interval_minutes: notifyIntervalMinutes, config },
  });
}

export async function setChannelEnabled(provider, enabled) {
  return request('/api/v1/notification-channels/' + encodeURIComponent(provider), {
    method: 'PATCH',
    body: { enabled },
  });
}

export async function testChannel({ provider, config }) {
  return request('/api/v1/notification-channels/test', {
    method: 'POST',
    body: { provider, config },
  });
}
