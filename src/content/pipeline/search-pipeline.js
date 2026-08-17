// ============================================================
// AI 搜索管线（状态机编排 + 进度回调）
//   keyword → search → filter → read → summarize → done
// ============================================================
import { generateKeywords } from './keyword-generator.js';
import { searchAndDeduplicate } from './cc98-searcher.js';
import { scoreTopics } from './phase1-filter.js';
import { readReplies } from './reply-reader.js';
import { filterTopics } from './phase2-filter.js';
import { generateSummary } from './summarizer.js';
import { getSearchBudget } from '../lib/storage.js';
import { AppError, ERROR_TYPES } from '../lib/errors.js';

// 各阶段进度区间（总 100%）
const STAGES = [
  { key: 'keyword', label: '拆分关键词', from: 0, to: 10 },
  { key: 'search', label: '搜索 CC98', from: 10, to: 50 },
  { key: 'filter', label: '筛选主题', from: 50, to: 60 },
  { key: 'read', label: '阅读回复', from: 60, to: 85 },
  { key: 'summarize', label: '生成总结', from: 85, to: 95 },
  { key: 'done', label: '完成', from: 95, to: 100 },
];

export const PIPELINE_STAGES = STAGES.map((s) => s.key);

function percent(stageKey, fraction) {
  const st = STAGES.find((s) => s.key === stageKey);
  if (!st) return 0;
  const f = Math.max(0, Math.min(1, fraction || 0));
  return Math.round(st.from + (st.to - st.from) * f);
}

// 用户主动终止时抛这个，调用方据此区分「出错」和「取消」
export function throwIfAborted(signal) {
  if (signal && signal.aborted) {
    throw new AppError(ERROR_TYPES.ABORTED, '搜索已终止');
  }
}

// 执行完整搜索管线，onProgress({ percent, stageKey, stageLabel })
// opts.signal: AbortSignal，用户点「停止」时在各阶段边界中断
export async function runSearchPipeline(query, onProgress, opts = {}) {
  const signal = opts.signal || null;
  const budget = await getSearchBudget();
  const report = { keywords: [], topics: [], summary: '' };

  const emit = (key, fraction) => {
    const st = STAGES.find((s) => s.key === key);
    if (onProgress) onProgress({ percent: percent(key, fraction), stageKey: key, stageLabel: st ? st.label : key });
  };

  // 1. 关键词
  throwIfAborted(signal);
  emit('keyword', 0.3);
  const keywords = await generateKeywords(query, budget.keywordCount);
  throwIfAborted(signal);
  if (!keywords || !keywords.length) {
    throw new AppError(ERROR_TYPES.NO_RESULTS, '无法拆分出有效关键词');
  }
  report.keywords = keywords;
  emit('keyword', 1);

  // 2. 搜索 + 去重
  emit('search', 0);
  const searched = await searchAndDeduplicate(keywords, budget.searchLimitPerKeyword, (done, total) => {
    emit('search', total ? done / total : 0);
  }, signal);
  throwIfAborted(signal);
  if (!searched.length) {
    throw new AppError(ERROR_TYPES.NO_RESULTS, '没有搜到相关帖子，换个关键词试试');
  }
  emit('search', 1);

  // 3a. 标题筛选
  emit('filter', 0.4);
  const topTopics = scoreTopics(searched, keywords, budget.topicLimit);
  emit('filter', 1);

  // 3b. 读回复
  emit('read', 0);
  const enriched = await readReplies(topTopics, budget, (done, total) => {
    emit('read', total ? done / total : 0);
  }, signal);
  throwIfAborted(signal);
  emit('read', 1);

  // 内容再筛选（async：内含戾气模型分类）
  const filtered = await filterTopics(enriched);
  throwIfAborted(signal);

  // 4. 总结
  emit('summarize', 0.5);
  const summary = await generateSummary(query, keywords, filtered);
  throwIfAborted(signal);

  report.topics = filtered;
  report.summary = summary;
  emit('done', 1);

  return report;
}
