// ============================================================
// 通知 Tab：主动读取 + 本机缓存/未读位置 + 渠道失败提示
// ============================================================
import { getHealth, listChannels, listNotifications } from '../lib/backend-api.js';
import { isLoggedIn } from '../lib/auth.js';
import {
  countUnreadNotifications,
  getNotificationScope,
  newestNotificationId,
  patchNotificationState,
  readNotificationState,
} from '../lib/notification-state.js';
import { updateBadge } from './floating-btn.js';
import { MSG, NOTIFICATION_READ_COOLDOWN_SECONDS_FALLBACK } from '../../shared/constants.js';
import { esc, fmtTime, toast } from '../lib/html-utils.js';

export async function renderNotifications(body) {
  if (!(await isLoggedIn())) {
    body.innerHTML = `
      <div class="cc98-empty">
        <div class="cc98-empty-icon">🔔</div>
        <div class="cc98-empty-title">请先登录</div>
        <div class="cc98-empty-sub">到「设置」用浙大邮箱登录后查看通知</div>
      </div>`;
    clearBadges();
    return;
  }

  body.innerHTML = `<div class="cc98-loading"><span class="cc98-spin"></span>加载中…</div>`;
  try {
    await refresh(body, false);
  } catch (e) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">${esc(e.message || '加载失败')}</div></div>`;
  }
}

function clearBadges() {
  updateBadge(0);
  chrome.runtime.sendMessage({ type: MSG.SET_BADGE, count: 0 }).catch(() => {});
}

async function readCooldownSeconds() {
  try {
    const health = await getHealth();
    return Number(health && health.components && health.components.notification_read_rate_limit_seconds)
      || NOTIFICATION_READ_COOLDOWN_SECONDS_FALLBACK;
  } catch (_) {
    return NOTIFICATION_READ_COOLDOWN_SECONDS_FALLBACK;
  }
}

async function loadHistory(force) {
  const [scope, cooldownSeconds] = await Promise.all([getNotificationScope(), readCooldownSeconds()]);
  let state = await readNotificationState(scope);
  const now = Date.now();
  const lastSuccessAt = Number(state.lastSuccessAt) || 0;
  const elapsedSinceSuccess = now - lastSuccessAt;
  const cooldownMs = Math.max(0, cooldownSeconds * 1000);
  const hasCache = Array.isArray(state.cache);

  const blockedUntil = Number(state.blockedUntil) || 0;
  if (blockedUntil > now) {
    const remaining = Math.max(1, Math.ceil((blockedUntil - now) / 1000));
    return {
      scope,
      state,
      list: hasCache ? state.cache : [],
      fromCache: hasCache,
      notice: `服务器正在限流，请 ${remaining} 秒后再刷新${hasCache ? '；当前显示上次结果' : ''}`,
    };
  }

  if (lastSuccessAt && elapsedSinceSuccess < cooldownMs) {
    const remaining = Math.max(1, Math.ceil((cooldownMs - elapsedSinceSuccess) / 1000));
    return {
      scope,
      state,
      list: hasCache ? state.cache : [],
      fromCache: true,
      notice: force ? `刷新过于频繁，请 ${remaining} 秒后再试` : '',
    };
  }

  // 网络失败时至少间隔 5 秒再尝试，防止连续点击形成请求风暴。
  const lastAttemptAt = Number(state.lastAttemptAt) || 0;
  if (lastAttemptAt && now - lastAttemptAt < 5000) {
    const remaining = Math.max(1, Math.ceil((5000 - (now - lastAttemptAt)) / 1000));
    return {
      scope,
      state,
      list: hasCache ? state.cache : [],
      fromCache: hasCache,
      notice: `刚刚刷新失败，请 ${remaining} 秒后再试`,
    };
  }

  state = await patchNotificationState(scope, { lastAttemptAt: now });
  try {
    const list = (await listNotifications()) || [];
    state = await patchNotificationState(scope, {
      cache: Array.isArray(list) ? list : [],
      lastSuccessAt: Date.now(),
      blockedUntil: 0,
    });
    return { scope, state, list: state.cache, fromCache: false, notice: '' };
  } catch (e) {
    if (e && e.status === 429) {
      const retryAfter = Number(e.retryAfter) || cooldownSeconds;
      state = await patchNotificationState(scope, { blockedUntil: Date.now() + retryAfter * 1000 });
      return {
        scope,
        state,
        list: hasCache ? state.cache : [],
        fromCache: hasCache,
        notice: `服务器正在限流，请 ${retryAfter} 秒后再刷新${hasCache ? '；当前显示上次结果' : ''}`,
      };
    }
    if (hasCache) {
      return {
        scope,
        state,
        list: state.cache,
        fromCache: true,
        notice: `刷新失败，当前显示上次结果：${e.message || '网络错误'}`,
      };
    }
    throw e;
  }
}

function renderChannelFailures(channels) {
  const names = { dingtalk: '钉钉', email: '邮箱' };
  const failures = (channels || []).filter((channel) => channel.last_dispatch_status === 'failed');
  if (!failures.length) return '';
  return failures.map((channel) => `
    <div class="cc98-error cc98-channel-alert">
      <div class="cc98-error-head">最近一次${esc(names[channel.provider] || channel.provider)}提醒没有发出去</div>
      <div class="cc98-error-hint">${esc(channel.last_dispatch_error || '请检查接收方式')}。这次提醒不会自动重发，但相关帖子仍会保留在下方。</div>
    </div>`).join('');
}

async function refresh(body, force) {
  const [history, channels] = await Promise.all([
    loadHistory(force),
    listChannels().catch(() => []),
  ]);
  const list = history.list || [];
  const previousSeen = Number(history.state.lastSeenNotificationId) || 0;
  const unread = countUnreadNotifications(list, previousSeen);
  const newestId = newestNotificationId(list);
  const lastSuccessAt = Number(history.state.lastSuccessAt) || 0;

  body.innerHTML = `
    ${renderChannelFailures(channels)}
    ${history.notice ? `<div class="cc98-setting-help" style="margin-bottom:10px">${esc(history.notice)}</div>` : ''}
    <div class="cc98-notif-toolbar">
      <span>${lastSuccessAt ? `最后更新于 ${esc(fmtTime(new Date(lastSuccessAt).toISOString()))}` : '尚未成功刷新'}</span>
      <button id="cc98-notif-refresh" class="cc98-secondary" type="button">刷新列表</button>
    </div>
    ${unread ? `<div class="cc98-notif-new">本次发现 ${unread > 99 ? '99+' : unread} 条新通知</div>` : ''}
    <div id="cc98-notif-list"></div>`;

  const listEl = body.querySelector('#cc98-notif-list');
  if (!list.length) {
    listEl.innerHTML = `<div class="cc98-empty"><div class="cc98-empty-icon">📭</div><div class="cc98-empty-sub">暂无通知。订阅提醒服务会定时查看新帖，找到符合关键词的帖子后会显示在这里</div></div>`;
  } else {
    listEl.innerHTML = list
      .map((notification) => {
        const isUnread = previousSeen > 0 && Number(notification.id) > previousSeen;
        return `
          <div class="cc98-notif${isUnread ? ' unread' : ''}">
            <div class="nt">
              <a href="${esc(notification.topic_url || '#')}" target="_blank" rel="noopener">${esc(notification.topic_title || '(无标题)')}</a>
            </div>
            ${notification.matched_reason ? `<div class="nm">🎯 ${esc(notification.matched_reason)}</div>` : ''}
            <div class="nm">${esc(fmtTime(notification.created_at))}</div>
          </div>`;
      })
      .join('');
  }

  // 通知页已经实际展示给用户，此时把最新一条作为本机查看位置。
  if (newestId > previousSeen) {
    await patchNotificationState(history.scope, { lastSeenNotificationId: newestId });
  }
  clearBadges();

  body.querySelector('#cc98-notif-refresh').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.textContent = '刷新中…';
    try {
      await refresh(body, true);
    } catch (e) {
      toast(e.message || '刷新失败');
      btn.disabled = false;
      btn.textContent = '刷新列表';
    }
  });
}
