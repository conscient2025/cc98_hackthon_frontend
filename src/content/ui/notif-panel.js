// ============================================================
// 通知 Tab：手动扫描 + 通知历史列表（含匹配原因、投递状态）
// ============================================================
import { listNotifications, triggerScan } from '../lib/backend-api.js';
import { isLoggedIn } from '../lib/auth.js';
import { updateBadge } from './floating-btn.js';
import { esc, toast, fmtTime, deliveryStatusText, deliveryStatusColor } from '../lib/html-utils.js';

export async function renderNotifications(body) {
  if (!(await isLoggedIn())) {
    body.innerHTML = `
      <div class="cc98-empty">
        <div class="cc98-empty-icon">🔔</div>
        <div class="cc98-empty-title">请先登录</div>
        <div class="cc98-empty-sub">到「⚙️ 设置」用浙大邮箱登录后查看通知</div>
      </div>`;
    return;
  }

  body.innerHTML = `<div class="cc98-loading"><span class="cc98-spin"></span>加载中…</div>`;
  try {
    await refresh(body);
  } catch (e) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">${esc(e.message || '加载失败')}</div></div>`;
  }
}

async function refresh(body) {
  const list = await listNotifications();
  updateBadge(list.filter((n) => !n.is_read).length);

  body.innerHTML = `
    <div class="cc98-panel-actions">
      <button id="cc98-scan-btn" class="cc98-primary" type="button">🔄 立即检查新帖</button>
    </div>
    <div id="cc98-notif-list"></div>`;

  const listEl = body.querySelector('#cc98-notif-list');
  if (!list.length) {
    listEl.innerHTML = `<div class="cc98-empty"><div class="cc98-empty-icon">📭</div><div class="cc98-empty-sub">暂无通知，点击「立即检查新帖」扫描一次</div></div>`;
  } else {
    listEl.innerHTML = list
      .map((n) => `
        <div class="cc98-notif">
          <div class="nt">
            <a href="${esc(n.topic_url || '#')}" target="_blank" rel="noopener">${esc(n.topic_title || '(无标题)')}</a>
          </div>
          ${n.matched_reason ? `<div class="nm">🎯 ${esc(n.matched_reason)}</div>` : ''}
          <div class="nm" style="display:flex;align-items:center;gap:6px">
            <span style="color:${deliveryStatusColor(n.delivery_status)}">● ${esc(deliveryStatusText(n.delivery_status))}</span>
            <span>·</span><span>${esc(fmtTime(n.created_at))}</span>
          </div>
        </div>`)
      .join('');
  }

  const scanBtn = body.querySelector('#cc98-scan-btn');
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = '扫描中…';
    try {
      const r = await triggerScan();
      toast(`扫描完成：命中 ${r.matched_pairs ?? 0} 条，生成 ${r.created_notifications ?? 0} 条通知`);
      await refresh(body);
    } catch (e) {
      toast(e.message || '扫描失败');
      scanBtn.disabled = false;
      scanBtn.textContent = '🔄 立即检查新帖';
    }
  });
}
