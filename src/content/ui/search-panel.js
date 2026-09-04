// ============================================================
// 搜索 Tab：输入框 + 进度条 + 结果渲染
//   UI 完全由「跨标签页共享状态」驱动（见 lib/search-state.js）：
//   在任何一个标签页发起搜索，所有标签页的面板都会同步显示
//   进度条 → 结果，看起来像同一个插件。
// ============================================================
import { runSearchPipeline } from '../pipeline/search-pipeline.js';
import { createProgressBar } from './progress-bar.js';
import { renderResult, renderError } from './result-renderer.js';
import { classifyError } from '../lib/errors.js';
import {
  readSearchState, subscribeSearchState, publishRunning, publishDone,
  publishError, publishCancelled, clearSearchState, isStale, STALE_MS,
} from '../lib/search-state.js';
import { ERROR_TYPES } from '../lib/errors.js';

// 本标签页是否是发起方（只有发起方跑管线、写进度）
let isOwner = false;
// 发起方持有的中断句柄：任何标签页点「停止」都会走到它
let currentAbort = null;

// 切 Tab 会反复调 renderSearchPanel，storage 监听只注册一次，
// 通过 activeRender 指向「当前那份」面板的渲染函数，避免监听器堆积。
let activeRender = null;
let subscribed = false;

function subscribeOnce() {
  if (subscribed) return;
  subscribed = true;
  subscribeSearchState((state) => {
    if (activeRender) activeRender(state);
  });
}

const EMPTY_HTML = `
  <div class="cc98-empty">
    <div class="cc98-empty-icon">🔍</div>
    <div class="cc98-empty-title">输入话题开始 AI 搜索</div>
    <div class="cc98-empty-sub">AI 会拆分关键词 → 搜索帖子 → 阅读回复 → 生成总结</div>
  </div>`;

const STALE_HTML = `
  <div class="cc98-error">
    <div class="cc98-error-head">⚠️ 搜索已中断</div>
    <div class="cc98-error-hint">发起搜索的标签页被关闭了，请重新搜索。</div>
  </div>`;

const CANCELLED_HTML = `
  <div class="cc98-empty">
    <div class="cc98-empty-icon">🛑</div>
    <div class="cc98-empty-title">搜索已终止</div>
    <div class="cc98-empty-sub">你中断了这次搜索，可以改个话题重新搜。</div>
  </div>`;

export function renderSearchPanel(body) {
  body.innerHTML = `
    <div class="cc98-form-row">
      <input id="cc98-search-input" class="cc98-input" type="text"
             placeholder="用自然语言提问，AI 会自动提取关键词并搜索" />
      <button id="cc98-search-btn" class="cc98-btn-primary" type="button">搜索</button>
      <button id="cc98-search-stop" class="cc98-secondary" type="button" hidden>停止</button>
    </div>
    <div id="cc98-search-meta" class="cc98-result-meta" hidden>
      <span id="cc98-search-meta-text"></span>
      <button id="cc98-search-clear" class="cc98-link-btn" type="button">清空</button>
    </div>
    <div id="cc98-search-result" class="cc98-result">${EMPTY_HTML}</div>`;

  const input = body.querySelector('#cc98-search-input');
  const btn = body.querySelector('#cc98-search-btn');
  const stopBtn = body.querySelector('#cc98-search-stop');
  const result = body.querySelector('#cc98-search-result');
  const meta = body.querySelector('#cc98-search-meta');
  const metaText = body.querySelector('#cc98-search-meta-text');
  const clearBtn = body.querySelector('#cc98-search-clear');

  // 镜像进度条：非发起方也要有一个，用来跟着画进度
  let bar = null;
  let staleTimer = null;

  function stopStaleWatch() {
    if (staleTimer) {
      clearInterval(staleTimer);
      staleTimer = null;
    }
  }

  function setMeta(text) {
    if (!text) {
      meta.hidden = true;
      return;
    }
    metaText.textContent = text;
    meta.hidden = false;
  }

  function fmtTime(ts) {
    return ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : '';
  }

  // 按共享状态渲染整个面板（所有标签页走同一条路径，所以长得一样）
  function render(state) {
    // 已被清空 / 从未搜索
    if (!state) {
      stopStaleWatch();
      bar = null;
      result.innerHTML = EMPTY_HTML;
      setMeta('');
      btn.disabled = false;
      btn.textContent = '搜索';
      stopBtn.hidden = true;
      return;
    }

    if (state.query != null && document.activeElement !== input) {
      input.value = state.query;
    }

    if (state.status === 'running') {
      // 发起方被关掉 → 状态不再更新，显示中断而不是永远转圈
      if (isStale(state)) {
        stopStaleWatch();
        bar = null;
        result.innerHTML = STALE_HTML;
        setMeta('');
        btn.disabled = false;
        btn.textContent = '搜索';
        stopBtn.hidden = true;
        return;
      }

      // 搜索中：所有标签页都禁用按钮、显示「停止」，避免并发搜索
      btn.disabled = true;
      btn.textContent = '搜索中…';
      stopBtn.hidden = false;
      stopBtn.disabled = false;
      setMeta('');
      if (!bar) {
        bar = createProgressBar();
        result.innerHTML = '';
        result.appendChild(bar.el);
      }
      if (state.progress) bar.update(state.progress);

      // 非发起方定时检查状态是否变馊（发起方自己不需要）
      if (!isOwner && !staleTimer) {
        staleTimer = setInterval(async () => {
          const cur = await readSearchState();
          if (isStale(cur)) render(cur);
        }, 5000);
      }
      return;
    }

    stopStaleWatch();
    bar = null;
    btn.disabled = false;
    btn.textContent = '搜索';
    stopBtn.hidden = true;

    // 别的标签页点了「停止」，而管线正跑在本页 → 立刻中断
    if (state.status === 'cancelled' && currentAbort) {
      currentAbort.abort();
    }

    if (state.status === 'cancelled') {
      result.innerHTML = CANCELLED_HTML;
      setMeta('');
      return;
    }

    if (state.status === 'done') {
      result.innerHTML = renderResult(state.report || {}, state.query || '');
      setMeta(`上次搜索：${state.query || ''}${state.ts ? ' · ' + fmtTime(state.ts) : ''}`);
      return;
    }

    if (state.status === 'error') {
      result.innerHTML = renderError(state.error || { message: '出错了' });
      setMeta('');
      return;
    }
  }

  // 本份面板成为当前渲染目标；storage 监听全局只注册一次
  activeRender = (state) => {
    if (!document.body.contains(result)) return; // 面板已被 SPA 清掉，忽略
    render(state);
  };
  subscribeOnce();

  // 首次挂载：恢复当前共享状态（新标签页也能接着看进度 / 结果）
  (async () => {
    render(await readSearchState());
  })();

  clearBtn.addEventListener('click', async () => {
    await clearSearchState();
    render(null); // 本页立即生效，不等 onChanged 回声
  });

  // 停止：本页在跑就直接 abort；跑在别的标签页则广播出去让它自己停
  stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    const cur = await readSearchState();
    const q = (cur && cur.query) || input.value.trim();
    if (currentAbort) currentAbort.abort();
    await publishCancelled(q);
    render({ status: 'cancelled', query: q, ts: Date.now() });
  });

  async function doSearch() {
    const q = input.value.trim();
    if (!q || btn.disabled) return;

    // 别人正在搜且状态还新鲜 → 不重复发起
    const cur = await readSearchState();
    if (cur && cur.status === 'running' && !isStale(cur)) {
      render(cur);
      return;
    }

    isOwner = true;
    currentAbort = new AbortController();
    const signal = currentAbort.signal;
    await publishRunning(q, null);
    render({ status: 'running', query: q, progress: { percent: 0, stageKey: 'keyword', stageLabel: '准备中…' }, ts: Date.now() });

    // 长阶段（搜索、阅读回复）内部不一定频繁回调，心跳保证状态不被判为馊
    let lastProgress = { percent: 0, stageKey: 'keyword', stageLabel: '准备中…' };
    const heartbeat = setInterval(() => {
      if (signal.aborted) return;          // 已终止就别再写「运行中」，否则覆盖掉取消状态
      publishRunning(q, lastProgress);
    }, Math.floor(STALE_MS / 3));

    try {
      const report = await runSearchPipeline(q, (state) => {
        lastProgress = state;
        if (bar) bar.update(state);        // 本页立即更新，不等广播回声
        if (!signal.aborted) publishRunning(q, state); // 广播给其他标签页
      }, { signal });
      // 只存渲染必需的字段：replies 体积大且渲染用不到，丢掉避免撑爆存储
      const slim = {
        keywords: report.keywords || [],
        summary: report.summary || '',
        topics: (report.topics || []).map((t) => ({
          title: t.title, url: t.url, board_name: t.board_name, author_name: t.author_name,
        })),
      };
      await publishDone(q, slim);
      render({ status: 'done', query: q, report: slim, ts: Date.now() });
    } catch (err) {
      const ce = classifyError(err);
      // 用户主动终止不算错误：取消状态已由「停止」按钮写好，别覆盖成报错
      if (ce.type === ERROR_TYPES.ABORTED || signal.aborted) {
        render({ status: 'cancelled', query: q, ts: Date.now() });
      } else {
        await publishError(q, ce);
        render({ status: 'error', query: q, error: ce, ts: Date.now() });
      }
    } finally {
      clearInterval(heartbeat);
      isOwner = false;
      currentAbort = null;
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}
