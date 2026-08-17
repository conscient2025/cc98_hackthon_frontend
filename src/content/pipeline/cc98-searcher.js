// ============================================================
// 阶段2：用关键词搜 CC98 并去重
// ============================================================
import { searchPosts } from '../lib/cc98-api.js';
import { AppError, ERROR_TYPES } from '../lib/errors.js';

export async function searchAndDeduplicate(keywords, limitPerKeyword, onProgress, signal) {
  const seen = new Set();
  const topics = [];
  let lastError = null;
  let failedCount = 0;

  for (let i = 0; i < keywords.length; i++) {
    // 每个关键词前检查一次，用户点「停止」后最多再跑完当前这一个
    if (signal && signal.aborted) throw new AppError(ERROR_TYPES.ABORTED, '搜索已终止');
    const kw = keywords[i];
    let results = [];
    try {
      results = await searchPosts(kw, null, limitPerKeyword);
    } catch (e) {
      // 登录态 / 全局错误直接抛；单个关键词失败则跳过继续
      if (e && (e.type === ERROR_TYPES.CC98_NOT_LOGGED_IN || e.type === ERROR_TYPES.CC98_TOKEN_EXPIRED)) {
        throw e;
      }
      console.warn('[CC98 AI+] 关键词搜索失败：', kw, e);
      lastError = e;
      failedCount++;
      results = [];
    }
    for (const t of results) {
      if (t && t.id != null && !seen.has(t.id)) {
        seen.add(t.id);
        topics.push(t);
      }
    }
    if (onProgress) onProgress(i + 1, keywords.length);
  }

  // 每个关键词都失败了 → 把真实错误抛出去，别让上层显示成「没搜到帖子」
  if (!topics.length && failedCount === keywords.length && lastError) {
    throw lastError;
  }

  return topics;
}
