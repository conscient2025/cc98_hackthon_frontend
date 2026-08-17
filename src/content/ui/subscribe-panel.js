// ============================================================
// 订阅 Tab：添加 / 暂停 / 恢复 / 删除订阅 + 配额显示
// ============================================================
import { listSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../lib/backend-api.js';
import { getSubscriptionLimit } from '../lib/storage.js';
import { isLoggedIn } from '../lib/auth.js';
import { esc, toast } from '../lib/html-utils.js';

export async function renderSubscriptions(body) {
  if (!(await isLoggedIn())) {
    body.innerHTML = `
      <div class="cc98-empty">
        <div class="cc98-empty-icon">📧</div>
        <div class="cc98-empty-title">请先登录</div>
        <div class="cc98-empty-sub">到「⚙️ 设置」用浙大邮箱登录后，即可管理订阅提醒</div>
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

async function draw(body) {
  const [subs, limit] = await Promise.all([listSubscriptions(), getSubscriptionLimit()]);
  const activeCount = subs.filter((s) => s.status === 'enabled').length;
  const warn = activeCount >= limit;

  body.innerHTML = `
    <div class="cc98-quota${warn ? ' warn' : ''}">已启用 ${activeCount} / ${limit} 个订阅</div>
    <div class="cc98-form-row">
      <input id="cc98-sub-name" class="cc98-input" type="text" placeholder="订阅名称，如：实习" />
      <button id="cc98-sub-add" class="cc98-btn-primary" type="button">添加</button>
    </div>
    <input id="cc98-sub-desc" class="cc98-input" type="text"
           placeholder="关键词，用空格分开，如：实习 内推 招聘 日常实习" />
    <div class="cc98-setting-help" style="margin:6px 0 12px">
      名称和关键词都会参与匹配：新帖的标题或正文里<b>出现任意一个词</b>就提醒你。
      中文不会自动分词，所以请写成「实习 内推」而不是「我想找实习内推」。
    </div>
    <div id="cc98-sub-list"></div>`;

  const nameEl = body.querySelector('#cc98-sub-name');
  const descEl = body.querySelector('#cc98-sub-desc');
  const listEl = body.querySelector('#cc98-sub-list');

  function renderList() {
    if (!subs.length) {
      listEl.innerHTML = `<div class="cc98-empty"><div class="cc98-empty-icon">📭</div><div class="cc98-empty-sub">还没有订阅，添加一个开始接收新帖提醒</div></div>`;
      return;
    }
    listEl.innerHTML = subs
      .map((s) => `
        <div class="cc98-sub${s.status === 'paused' ? ' paused' : ''}" data-id="${s.id}">
          <div style="min-width:0">
            <div class="tn">${esc(s.name)}</div>
            ${s.description ? `<div class="tm">${esc(s.description)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="pause" type="button" data-act="pause">${s.status === 'enabled' ? '暂停' : '恢复'}</button>
            <button class="del" type="button" data-act="del">删除</button>
          </div>
        </div>`)
      .join('');
  }
  renderList();

  body.querySelector('#cc98-sub-add').addEventListener('click', async () => {
    const name = nameEl.value.trim();
    if (!name) {
      toast('请先填写订阅名称');
      return;
    }
    try {
      await createSubscription({ name, description: descEl.value.trim() });
      toast('订阅已添加');
      await draw(body);
    } catch (e) {
      toast(e.message || '添加失败');
    }
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = e.target.closest('.cc98-sub');
    if (!row) return;
    const id = row.dataset.id;
    const act = btn.dataset.act;
    try {
      if (act === 'del') {
        await deleteSubscription(id);
        toast('已删除');
      } else if (act === 'pause') {
        const s = subs.find((x) => String(x.id) === id);
        await updateSubscription(id, { status: s && s.status === 'enabled' ? 'paused' : 'enabled' });
        toast(s && s.status === 'enabled' ? '已暂停' : '已恢复');
      }
      await draw(body);
    } catch (err) {
      toast(err.message || '操作失败');
    }
  });
}
