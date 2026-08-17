// ============================================================
// 搜索进度条组件：填充式进度条 + 阶段标签（升级版）
//   相比旧的 ✓/●/○ 标记，用真实填充条 + 阶段 chip 状态
// ============================================================
import { PIPELINE_STAGES } from '../pipeline/search-pipeline.js';

// 各阶段的简短中文名（用于 chip）
const STAGE_SHORT = {
  keyword: '关键词',
  search: '搜索',
  filter: '筛选',
  read: '阅读',
  summarize: '总结',
  done: '完成',
};

// 创建一个进度条组件，返回 { el, update, reset }
export function createProgressBar() {
  const el = document.createElement('div');
  el.className = 'cc98-progress';
  el.innerHTML = `
    <div class="cc98-progress-head">
      <span class="cc98-progress-stage">准备中…</span>
      <span class="cc98-progress-pct">0%</span>
    </div>
    <div class="cc98-progress-track"><div class="cc98-progress-fill"></div></div>
    <div class="cc98-progress-chips"></div>
  `;

  const stageText = el.querySelector('.cc98-progress-stage');
  const pctText = el.querySelector('.cc98-progress-pct');
  const fill = el.querySelector('.cc98-progress-fill');
  const chipsEl = el.querySelector('.cc98-progress-chips');

  // 一次性渲染全部阶段 chip，之后只切 class
  const chips = {};
  for (const key of PIPELINE_STAGES) {
    const c = document.createElement('span');
    c.className = 'cc98-chip';
    c.textContent = STAGE_SHORT[key] || key;
    chipsEl.appendChild(c);
    chips[key] = c;
  }

  function update(state) {
    const percent = Math.max(0, Math.min(100, state.percent || 0));
    fill.style.width = percent + '%';
    pctText.textContent = percent + '%';
    if (state.stageLabel) stageText.textContent = state.stageLabel;

    const idx = PIPELINE_STAGES.indexOf(state.stageKey);
    for (const key of PIPELINE_STAGES) {
      const c = chips[key];
      c.classList.remove('done', 'active');
    }
    // 当前阶段之前的都标完成
    for (let i = 0; i < idx; i++) {
      if (chips[PIPELINE_STAGES[i]]) chips[PIPELINE_STAGES[i]].classList.add('done');
    }
    if (chips[state.stageKey]) chips[state.stageKey].classList.add('active');
  }

  function reset() {
    fill.style.width = '0%';
    pctText.textContent = '0%';
    stageText.textContent = '准备中…';
    for (const key of PIPELINE_STAGES) chips[key].classList.remove('done', 'active');
  }

  return { el, update, reset };
}
