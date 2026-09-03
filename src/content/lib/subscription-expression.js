// ============================================================
// 订阅表达式解析：空白 = AND，半角 / = OR，其余字符均为关键词正文
// 与后端 app/matcher.py 保持相同约束，前端仅用于实时预览和提前拦截。
// ============================================================

function codePointLength(value) {
  return Array.from(value).length;
}

export function parseSubscriptionExpression(value, maxLength = 255) {
  const raw = String(value || '');
  if (raw.includes('／')) {
    return { valid: false, normalized: '', groups: [], error: '同义词分隔符请使用半角 /' };
  }

  const normalized = raw.trim().replace(/\s*\/\s*/gu, '/').replace(/\s+/gu, ' ');
  const length = codePointLength(normalized);
  if (!normalized) {
    return { valid: false, normalized, groups: [], length, error: '请输入订阅关键词' };
  }
  if (length > maxLength) {
    return { valid: false, normalized, groups: [], length, error: `订阅内容不能超过 ${maxLength} 个字符` };
  }

  const groups = [];
  for (const groupText of normalized.split(' ')) {
    const terms = groupText.split('/');
    if (terms.some((term) => !term)) {
      return { valid: false, normalized, groups: [], length, error: '斜杠两侧都必须填写关键词' };
    }
    for (const term of terms) {
      if (codePointLength(term) < 2) {
        return { valid: false, normalized, groups: [], length, error: `关键词“${term}”至少需要 2 个字符` };
      }
      if (!/[\p{L}\p{N}]/u.test(term)) {
        return { valid: false, normalized, groups: [], length, error: `关键词“${term}”不能只包含标点符号` };
      }
    }
    groups.push(terms);
  }

  return { valid: true, normalized, groups, length, error: '' };
}
