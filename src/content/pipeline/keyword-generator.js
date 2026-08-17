// ============================================================
// 阶段1：把用户话题拆成多个搜索关键词（LLM + JSON 容错 + 中文回退）
// ============================================================
import { callLLM } from '../lib/llm-client.js';
import { KEYWORD_SYSTEM, keywordUser } from '../lib/prompts.js';

export async function generateKeywords(topic, maxKeywords) {
  const raw = await callLLM({ system: KEYWORD_SYSTEM, user: keywordUser(topic, maxKeywords) });
  const parsed = robustParseJSON(raw);
  const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
  const cleaned = keywords
    .map((k) => String(k).trim())
    .filter((k) => k.length > 0)
    .slice(0, maxKeywords);

  if (!cleaned.length) {
    return fallbackSegment(topic, maxKeywords);
  }
  return cleaned;
}

// 容错解析：先整段 JSON.parse，失败再抓取第一个 {...}
export function robustParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) { /* fall through */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch (e2) { /* fall through */ }
  }
  return {};
}

// 中文回退：按空白/标点切分后做滑动组合
function fallbackSegment(topic, maxKeywords) {
  const words = String(topic).split(/[\s,，、。；;]+/).filter(Boolean);
  const result = [];
  if (words.length > 1) {
    for (let i = 0; i < words.length && result.length < maxKeywords; i++) {
      result.push(words.slice(i).join(' '));
    }
  }
  if (!result.length) result.push(String(topic).trim());
  return result.slice(0, maxKeywords);
}
