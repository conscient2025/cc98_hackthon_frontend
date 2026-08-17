// ============================================================
// 搜索结果渲染：关键词标签 + Markdown 总结 + 来源引用
// ============================================================
import { marked } from '../../../vendor/marked.esm.js';
import { esc } from '../lib/html-utils.js';

// 把管线返回的 report 渲染成 HTML
export function renderResult(report, query) {
  const parts = [];

  // 关键词标签
  const keywords = report.keywords || [];
  if (keywords.length) {
    parts.push('<div class="cc98-keywords">');
    parts.push('<span class="cc98-keywords-label">关键词</span>');
    for (const kw of keywords) {
      parts.push(`<span class="cc98-kw">${esc(kw)}</span>`);
    }
    parts.push('</div>');
  }

  // Markdown 总结
  parts.push('<div class="cc98-summary">');
  try {
    parts.push(marked.parse(report.summary || ''));
  } catch (e) {
    parts.push(`<pre class="cc98-summary-plain">${esc(report.summary)}</pre>`);
  }
  parts.push('</div>');

  // 来源帖子
  const topics = report.topics || [];
  if (topics.length) {
    parts.push('<div class="cc98-sources">');
    parts.push(`<div class="cc98-sources-title">📎 来源帖子（${topics.length}）</div>`);
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      const meta = [t.board_name, t.author_name].filter(Boolean).join(' · ');
      parts.push(`
        <a class="cc98-src" href="${esc(t.url || '#')}" target="_blank" rel="noopener">
          <span class="cc98-src-idx">[${i + 1}]</span>
          <span class="cc98-src-body">
            <span class="cc98-src-title">${esc(t.title || '(无标题)')}</span>
            ${meta ? `<span class="cc98-src-meta">${esc(meta)}</span>` : ''}
          </span>
        </a>`);
    }
    parts.push('</div>');
  }

  return parts.join('');
}

// 渲染错误（分类后的 { type, message, hint }）
export function renderError(ce) {
  // detail 里通常是服务器实际返回的内容，排查时比 message 有用得多
  let detail = '';
  if (ce.detail) {
    detail = typeof ce.detail === 'string' ? ce.detail : JSON.stringify(ce.detail);
    detail = detail.slice(0, 300);
  }
  return `
    <div class="cc98-error">
      <div class="cc98-error-head">⚠️ ${esc(ce.message || '出错了')}</div>
      ${ce.hint ? `<div class="cc98-error-hint">${esc(ce.hint)}</div>` : ''}
      ${detail ? `<details class="cc98-error-detail"><summary>技术详情</summary><pre>${esc(detail)}</pre></details>` : ''}
    </div>`;
}
