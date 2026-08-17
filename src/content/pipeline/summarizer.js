// ============================================================
// 阶段4：把筛选后的主题 + 楼层拼给 LLM，生成 Markdown 总结
// ============================================================
import { callLLM } from '../lib/llm-client.js';
import { SUMMARIZE_TOPICS_SYSTEM, summarizeTopicsUser } from '../lib/prompts.js';

export async function generateSummary(query, keywords, topics) {
  const topicsText = formatTopics(topics);
  const user = summarizeTopicsUser(query, keywords.join('、'), topicsText);
  return callLLM({ system: SUMMARIZE_TOPICS_SYSTEM, user });
}

function formatTopics(topics) {
  return topics
    .map((t, i) => {
      const lines = [];
      lines.push(`[${i + 1}] 标题：${t.title || '(无标题)'}`);
      if (t.author_name) lines.push(`作者：${t.author_name}`);
      if (t.board_name) lines.push(`板块：${t.board_name}`);
      if (t.url) lines.push(`链接：${t.url}`);
      if (t.replies && t.replies.length) {
        lines.push('楼层回复：');
        for (const r of t.replies) {
          lines.push(`  ${r.floor}楼 ${r.author}：${r.content}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n\n---\n\n');
}
