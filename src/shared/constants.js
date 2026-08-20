// ============================================================
// 全局共享常量
// ============================================================

// CC98 站点
export const CC98_API_BASE = 'https://api.cc98.org';
export const CC98_WEB_BASE = 'https://www.cc98.org';
export const CC98_SEARCH_MIN_INTERVAL_MS = 1200; // 搜索限速
export const CC98_SEARCH_RETRY_ATTEMPTS = 2;

// 搜索预算默认值（可在设置页调）
export const SEARCH_BUDGET_DEFAULTS = {
  keywordCount: 4,        // 拆分多少个搜索关键词
  searchLimitPerKeyword: 20, // 每个关键词最多搜多少条
  topicLimit: 10,         // 最终选取多少个主题
  maxRepliesPerTopic: 30, // 每个主题最多读多少楼
  maxCharsPerReply: 1000, // 每楼最多截取多少字
};

// LLM 默认配置
export const LLM_DEFAULTS = {
  provider: 'openai',                       // 'openai' | 'anthropic'
  baseUrl: 'https://api.siliconflow.cn/v1', // OpenAI 兼容地址
  model: 'Qwen/Qwen2.5-14B-Instruct',
  apiKey: '',
  temperature: 0.3,
  // 0 = 不限制：OpenAI 兼容接口不传 max_tokens 即用模型自身上限。
  // 推理模型的思维链也算在这个额度里，给小了正文会被挤掉，所以默认不限制。
  maxTokens: 0,
};

// Anthropic 的 max_tokens 是必填参数，不能省略，不限制时用这个兜底
export const ANTHROPIC_MAX_TOKENS_FALLBACK = 32000;

// 后端（Watch）默认地址
export const BACKEND_DEFAULT_BASE = 'http://127.0.0.1:8000';
// 订阅配额上限兜底值（后端暂未通过 /health 暴露，先硬编码，读到了以后端为准）
export const SUBSCRIPTION_LIMIT_FALLBACK = 10;

// 通知间隔可选项（分钟，10 的倍数），下拉框档位
export const NOTIFY_INTERVAL_PRESETS = [10, 30, 60, 120, 240, 360, 720, 1440];

// 通知渠道
export const NOTIFY_PROVIDERS = ['dingtalk', 'email'];

// 本地持久化存储 key（chrome.storage.local）
export const STORAGE_KEYS = {
  LLM: 'llmConfig',
  BUDGET: 'searchBudget',
  BACKEND_BASE: 'backendBaseUrl',
  USER_EMAIL: 'userEmail',
  AUTH_TOKEN: 'authToken',
  LAST_SEARCH: 'lastSearch',   // 上次搜索结果（跨标签页 / 刷新后恢复）
  NOTIFY_INTERVAL: 'notifyIntervalMinutes',
};

// 内存态存储 key（chrome.storage.session）
export const SESSION_KEYS = {
  CC98_TOKEN: 'cc98Token',
  CC98_AUTH_TYPE: 'cc98AuthType',
};

// 后台 Service Worker ↔ 内容脚本 消息类型
export const MSG = {
  FETCH: 'FETCH',                 // 通用网络代理
  REFRESH_BADGE: 'REFRESH_BADGE', // 刷新未读徽章
};
