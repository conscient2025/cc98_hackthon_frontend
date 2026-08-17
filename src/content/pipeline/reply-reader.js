// ============================================================
// 阶段3b：读取每个主题的楼层回复，清洗并截断
// ============================================================
import { getPostDetail } from '../lib/cc98-api.js';
import { AppError, ERROR_TYPES } from '../lib/errors.js';

export async function readReplies(topics, budget, onProgress, signal) {
  const maxReplies = budget.maxRepliesPerTopic || 30;
  const maxChars = budget.maxCharsPerReply || 1000;
  const enriched = [];

  for (let i = 0; i < topics.length; i++) {
    // 每个主题前检查一次，让「停止」在读回复阶段也能及时生效
    if (signal && signal.aborted) throw new AppError(ERROR_TYPES.ABORTED, '搜索已终止');
    const t = topics[i];
    try {
      const detail = await getPostDetail(t.id, {
        pageSize: 20,
        maxPages: Math.ceil(maxReplies / 20),
      });
      const posts = (detail.posts || []).slice(0, maxReplies);
      const replies = posts.map((p) => ({
        floor: p.floor,
        author: p.is_anonymous ? '匿名' : (p.user_name || '匿名'),
        content: truncate(cleanText(p.content), maxChars),
      }));
      enriched.push({
        ...t,
        replies,
        reply_count: replies.length,
        url: detail.url || t.url,
      });
    } catch (e) {
      // 单个主题读取失败不致命，保留主题但不带回复
      enriched.push({ ...t, replies: [], reply_count: 0, url: t.url, readError: e && e.message });
    }
    if (onProgress) onProgress(i + 1, topics.length);
  }

  return enriched;
}

// 去掉 HTML 标签、解码实体、压缩空白
export function cleanText(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = String(html);
  const text = div.textContent || '';
  return text.replace(/\s+/g, ' ').trim();
}

export function truncate(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '…';
}
