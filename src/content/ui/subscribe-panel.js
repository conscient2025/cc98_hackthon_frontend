// ============================================================
// 订阅 Tab：表达式实时解析 + 添加 / 暂停 / 恢复 / 删除
// ============================================================
import { createSubscription, deleteSubscription, getHealth, listSubscriptions, updateSubscription } from '../lib/backend-api.js';
import { getSubscriptionLimit, setSubscriptionLimit } from '../lib/storage.js';
import { parseSubscriptionExpression } from '../lib/subscription-expression.js';
import { isLoggedIn } from '../lib/auth.js';
import { SUBSCRIPTION_EXPRESSION_MAX_LENGTH_FALLBACK } from '../../shared/constants.js';
import { esc, toast } from '../lib/html-utils.js';

export async function renderSubscriptions(body) {
  if (!(await isLoggedIn())) {
    body.innerHTML = `
      <div class="cc98-empty">
        <div class="cc98-empty-icon">📧</div>
        <div class="cc98-empty-title">请先登录</div>
        <div class="cc98-empty-sub">到「设置」用浙大邮箱登录后，即可管理订阅提醒</div>
      </div>`;
    return;
  }

  body.innerHTML = `<div class="cc98-loading"><span class="cc98-spin"></span>加载中…</div>`;
  try {
    await draw(body);
  } catch (e) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">${esc(e.message || '加载失败')}</div></div>`;
  }
}

async function loadPolicy() {
  let limit = await getSubscriptionLimit();
  let maxLength = SUBSCRIPTION_EXPRESSION_MAX_LENGTH_FALLBACK;
  try {
    const health = await getHealth();
    const components = (health && health.components) || {};
    limit = Number(components.subscription_limit) || limit;
    maxLength = Number(components.subscription_expression_max_length) || maxLength;
    await setSubscriptionLimit(limit);
  } catch (_) {
    // 后端健康信息不可用时使用本地兜底，不影响订阅列表本身。
  }
  return { limit, maxLength };
}

async function draw(body) {
  const [subs, policy] = await Promise.all([listSubscriptions(), loadPolicy()]);
  const reachedLimit = subs.length >= policy.limit;

  body.innerHTML = `
    <div class="cc98-quota${reachedLimit ? ' warn' : ''}">
      订阅 ${subs.length} / ${policy.limit}（暂停也计数）
    </div>
    <div class="cc98-setting-field">
      <label for="cc98-sub-expression">订阅表达式</label>
      <div class="cc98-form-row" style="margin-bottom:8px">
        <input id="cc98-sub-expression" class="cc98-input" type="text"
               placeholder="例如：C++ 后端/服务端 实习" ${reachedLimit ? 'disabled' : ''} />
        <button id="cc98-sub-add" class="cc98-btn-primary" type="button" disabled>添加订阅</button>
      </div>
      <div class="cc98-expression-meta">
        <span>空格表示“且”，半角 / 表示“或”；其他相连字符按原样匹配。每个关键词至少 2 个字符。</span>
        <span id="cc98-sub-count">0 / ${policy.maxLength}</span>
      </div>
      <div id="cc98-sub-preview" class="cc98-expression-preview neutral">
        输入后将在这里显示解析结果并检查语法。
      </div>
      ${reachedLimit ? '<div class="cc98-setting-help" style="margin-top:8px">已达到数量上限。可以暂停或恢复现有订阅；删除一条后才能新增。</div>' : ''}
    </div>
    <div id="cc98-sub-list"></div>`;

  const input = body.querySelector('#cc98-sub-expression');
  const addBtn = body.querySelector('#cc98-sub-add');
  const preview = body.querySelector('#cc98-sub-preview');
  const count = body.querySelector('#cc98-sub-count');
  const listEl = body.querySelector('#cc98-sub-list');
  let parsed = null;

  function renderPreview() {
    parsed = parseSubscriptionExpression(input.value, policy.maxLength);
    count.textContent = `${parsed.length || 0} / ${policy.maxLength}`;
    count.classList.toggle('invalid', (parsed.length || 0) > policy.maxLength);
    addBtn.disabled = reachedLimit || !parsed.valid;

    if (!input.value.trim()) {
      preview.className = 'cc98-expression-preview neutral';
      preview.textContent = '输入后将在这里显示解析结果并检查语法。';
      return;
    }
    if (!parsed.valid) {
      preview.className = 'cc98-expression-preview invalid';
      preview.innerHTML = `<span class="cc98-expression-state">无法提交</span>${esc(parsed.error)}`;
      return;
    }

    preview.className = 'cc98-expression-preview valid';
    preview.innerHTML = `
      <span class="cc98-expression-state">解析成功</span>
      <span class="cc98-expression-groups">
        ${parsed.groups.map((terms) => `
          <span class="cc98-expression-group">${terms.map((term) => `<span>${esc(term)}</span>`).join('<b>或</b>')}</span>
        `).join('<i>且</i>')}
      </span>`;
  }

  function renderList() {
    if (!subs.length) {
      listEl.innerHTML = `<div class="cc98-empty"><div class="cc98-empty-icon">📭</div><div class="cc98-empty-sub">还没有订阅，添加一个开始接收新帖提醒</div></div>`;
      return;
    }
    listEl.innerHTML = subs
      .map((subscription) => `
        <div class="cc98-sub${subscription.status === 'paused' ? ' paused' : ''}" data-id="${subscription.id}">
          <div style="min-width:0">
            <div class="tn">${esc(subscription.expression)}</div>
            <div class="tm">${subscription.status === 'paused' ? '已暂停 · 仍计入数量上限' : '正在匹配新帖'}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="pause" type="button" data-act="pause">${subscription.status === 'enabled' ? '暂停' : '恢复'}</button>
            <button class="del" type="button" data-act="del">删除</button>
          </div>
        </div>`)
      .join('');
  }

  renderList();
  renderPreview();
  input.addEventListener('input', renderPreview);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !addBtn.disabled) {
      event.preventDefault();
      addBtn.click();
    }
  });

  addBtn.addEventListener('click', async () => {
    renderPreview();
    if (!parsed || !parsed.valid || reachedLimit) return;
    addBtn.disabled = true;
    try {
      await createSubscription(parsed.normalized);
      toast('订阅已添加');
      await draw(body);
    } catch (e) {
      toast(e.message || '添加失败');
      addBtn.disabled = false;
    }
  });

  listEl.addEventListener('click', async (event) => {
    const btn = event.target.closest('button');
    const row = event.target.closest('.cc98-sub');
    if (!btn || !row) return;
    const id = row.dataset.id;
    const action = btn.dataset.act;
    btn.disabled = true;
    try {
      if (action === 'del') {
        await deleteSubscription(id);
        toast('已删除');
      } else if (action === 'pause') {
        const subscription = subs.find((item) => String(item.id) === id);
        const nextStatus = subscription && subscription.status === 'enabled' ? 'paused' : 'enabled';
        await updateSubscription(id, { status: nextStatus });
        toast(nextStatus === 'paused' ? '已暂停' : '已恢复');
      }
      await draw(body);
    } catch (e) {
      btn.disabled = false;
      toast(e.message || '操作失败');
    }
  });
}
