// ============================================================
// 错误分类 + 中文提示
// 把底层抛出的各种异常，映射成用户能看懂的类型和操作建议
// ============================================================

export const ERROR_TYPES = {
  CC98_NOT_LOGGED_IN: 'cc98_not_logged_in',
  CC98_TOKEN_EXPIRED: 'cc98_token_expired',
  CC98_API_FAILED: 'cc98_api_failed',
  LLM_API_KEY_INVALID: 'llm_api_key_invalid',
  LLM_QUOTA_EXHAUSTED: 'llm_quota_exhausted',
  LLM_NETWORK: 'llm_network',
  CONTEXT_OVERFLOW: 'context_overflow',
  OUTPUT_TRUNCATED: 'output_truncated',
  MODEL_FORMAT_ERROR: 'model_format_error',
  NO_RESULTS: 'no_results',
  ABORTED: 'aborted',            // 用户主动终止搜索
  BACKEND_OFFLINE: 'backend_offline',
  BACKEND_ERROR: 'backend_error',
  NOT_LOGGED_IN_BACKEND: 'not_logged_in_backend',
  UNKNOWN: 'unknown',
};

export class AppError extends Error {
  constructor(type, message, detail) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.detail = detail || null;
  }
}

// 把任意错误分类成 { type, message, hint, detail }
// 无论走哪个分支都保留 detail（服务器返回的原文），否则排查时看不到真正的失败原因
export function classifyError(err) {
  const result = _classify(err);
  if (!result.detail) {
    const raw = err && (err.detail || err.message);
    if (raw) result.detail = typeof raw === 'string' ? raw : JSON.stringify(raw);
  }
  return result;
}

function _classify(err) {
  if (err && err instanceof AppError) {
    return {
      type: err.type,
      message: err.message,
      hint: hintFor(err.type),
      detail: err.detail,
    };
  }

  const msg = String((err && err.message) || err || '').toLowerCase();
  const status = err && err.status;

  // 后端离线
  if (status === 0 || /failed to fetch|networkerror|加载失败/i.test(msg)) {
    return { type: ERROR_TYPES.BACKEND_OFFLINE, message: '无法连接服务器', hint: hintFor(ERROR_TYPES.BACKEND_OFFLINE) };
  }

  // LLM 相关
  if (/401|unauthorized|invalid.*key|api key/i.test(msg) || status === 401) {
    return { type: ERROR_TYPES.LLM_API_KEY_INVALID, message: 'API Key 无效或未配置', hint: hintFor(ERROR_TYPES.LLM_API_KEY_INVALID) };
  }
  if (/quota|insufficient|余额|insufficient_quota|billing|402|429/i.test(msg) || status === 402 || status === 429) {
    return { type: ERROR_TYPES.LLM_QUOTA_EXHAUSTED, message: '额度不足或请求过于频繁', hint: hintFor(ERROR_TYPES.LLM_QUOTA_EXHAUSTED) };
  }
  if (/context|maximum context|too many tokens|token.*limit/i.test(msg)) {
    return { type: ERROR_TYPES.CONTEXT_OVERFLOW, message: '上下文超出模型上限', hint: hintFor(ERROR_TYPES.CONTEXT_OVERFLOW) };
  }

  // CC98 相关
  if (/401|unauthorized|token.*expired/i.test(msg)) {
    return { type: ERROR_TYPES.CC98_TOKEN_EXPIRED, message: 'CC98 登录已过期', hint: hintFor(ERROR_TYPES.CC98_TOKEN_EXPIRED) };
  }
  if (/403|forbidden/i.test(msg) || status === 403) {
    return { type: ERROR_TYPES.CC98_API_FAILED, message: 'CC98 接口拒绝访问', hint: hintFor(ERROR_TYPES.CC98_API_FAILED) };
  }
  if (/no results|没有找到|无结果/i.test(msg)) {
    return { type: ERROR_TYPES.NO_RESULTS, message: '没有找到相关内容', hint: hintFor(ERROR_TYPES.NO_RESULTS) };
  }

  return { type: ERROR_TYPES.UNKNOWN, message: (err && err.message) || '发生未知错误', hint: hintFor(ERROR_TYPES.UNKNOWN) };
}

function hintFor(type) {
  switch (type) {
    case ERROR_TYPES.CC98_NOT_LOGGED_IN:
      return '请先在 cc98.org 登录，插件会自动读取你的登录凭证。';
    case ERROR_TYPES.CC98_TOKEN_EXPIRED:
      return '请刷新 cc98.org 页面重新登录，或在设置里检查登录状态。';
    case ERROR_TYPES.CC98_API_FAILED:
      return '请确认已连接校园网 / RVPN，并已在 cc98.org 登录。';
    case ERROR_TYPES.LLM_API_KEY_INVALID:
      return '请到插件设置页检查 API Key 和 Base URL。';
    case ERROR_TYPES.LLM_QUOTA_EXHAUSTED:
      return '请检查模型供应商账户余额，或稍后再试。';
    case ERROR_TYPES.LLM_NETWORK:
      return '无法连接 LLM 服务，请检查网络或 Base URL。';
    case ERROR_TYPES.CONTEXT_OVERFLOW:
      return '请减少搜索预算（关键词数 / 回复数）后重试。';
    case ERROR_TYPES.OUTPUT_TRUNCATED:
      return '把设置页的 Max Tokens 调大（建议 8192 以上），或换用非推理模型（如 deepseek-chat）——推理模型的思维链会占掉大量额度。';
    case ERROR_TYPES.MODEL_FORMAT_ERROR:
      return '模型返回格式异常，请重试，或更换更稳定的模型。';
    case ERROR_TYPES.NO_RESULTS:
      return '换个更宽泛的关键词试试。';
    case ERROR_TYPES.BACKEND_OFFLINE:
      return '请确认后端已启动，或在设置页检查后端地址。';
    case ERROR_TYPES.NOT_LOGGED_IN_BACKEND:
      return '请先用浙大邮箱登录。';
    default:
      return '';
  }
}
