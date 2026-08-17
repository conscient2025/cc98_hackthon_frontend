// ============================================================
// 阶段3a：标题相关性筛选（关键词重叠 + 热度启发式评分，不用 embedding 重排）
// ============================================================

export function scoreTopics(topics, keywords, topicLimit) {
  // 收集所有关键词里的词元
  const tokens = new Set();
  for (const kw of keywords) {
    for (const t of String(kw).split(/\s+/)) {
      const token = t.trim().toLowerCase();
      if (token.length >= 1) tokens.add(token);
    }
  }

  const scored = topics.map((topic) => {
    const title = String(topic.title || '').toLowerCase();
    let overlap = 0;
    for (const tk of tokens) {
      if (tk && title.includes(tk)) overlap++;
    }
    // 标题匹配为主，回复数/点击数做小幅加权
    const replyBoost = Math.min((topic.reply_count || 0) / 100, 2);
    const hitBoost = Math.min((topic.hit_count || 0) / 1000, 1);
    return { topic, score: overlap * 10 + replyBoost + hitBoost };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topicLimit).map((s) => s.topic);
}
