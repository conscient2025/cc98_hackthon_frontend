// ============================================================
// 设置页：清晰的 LLM 连接配置 + 搜索范围
// ============================================================
import { LLM_DEFAULTS, SEARCH_BUDGET_DEFAULTS, STORAGE_KEYS } from '../../shared/constants.js';

const $ = (id) => document.getElementById(id);

const LLM_PRESETS = {
  siliconflow: {
    provider: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-14B-Instruct',
  },
  deepseek: {
    provider: 'openai',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  zhipu: {
    provider: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  dashscope: {
    provider: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
};

let savedLLMSnapshot = '';
let savedBudgetSnapshot = '';

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function setStatus(id, message, state = 'ok') {
  const element = $(id);
  element.textContent = message;
  element.className = `status${state === 'error' ? ' error' : state === 'pending' ? ' pending' : ''}`;
}

function detectPreset(config) {
  const baseUrl = normalizeBaseUrl(config.baseUrl).toLowerCase();
  return Object.entries(LLM_PRESETS).find(([, preset]) =>
    preset.provider === config.provider && normalizeBaseUrl(preset.baseUrl).toLowerCase() === baseUrl
  )?.[0] || 'custom';
}

function applyServiceSelection({ replaceValues = true } = {}) {
  const service = $('service').value;
  const preset = LLM_PRESETS[service];
  $('customProtocolField').hidden = service !== 'custom';
  $('baseUrl').readOnly = !!preset;
  if (preset && replaceValues) {
    $('provider').value = preset.provider;
    $('baseUrl').value = preset.baseUrl;
    $('model').value = preset.model;
  }
}

function readLLMForm() {
  return {
    provider: $('provider').value,
    baseUrl: normalizeBaseUrl($('baseUrl').value),
    model: $('model').value.trim(),
    apiKey: $('apiKey').value.trim(),
    // 不再把低频高级项放进 UI；保存时统一使用稳定默认值。
    temperature: LLM_DEFAULTS.temperature,
    maxTokens: LLM_DEFAULTS.maxTokens,
  };
}

function readBudgetForm() {
  return {
    keywordCount: Number($('keywordCount').value),
    searchLimitPerKeyword: Number($('searchLimitPerKeyword').value),
    topicLimit: Number($('topicLimit').value),
    maxRepliesPerTopic: Number($('maxRepliesPerTopic').value),
    maxCharsPerReply: Number($('maxCharsPerReply').value),
  };
}

function validateLLM(config) {
  if (!config.apiKey) return '请填写 API Key';
  if (!config.model) return '请填写模型名称';
  if (!config.baseUrl) return '请填写 API 地址';
  try {
    const url = new URL(config.baseUrl);
    if (!/^https?:$/.test(url.protocol)) return 'API 地址必须使用 http 或 https';
  } catch (_) {
    return 'API 地址格式不正确';
  }
  return '';
}

function markLLMDirty() {
  const dirty = JSON.stringify(readLLMForm()) !== savedLLMSnapshot;
  if (dirty) setStatus('llmStatus', '有未保存修改', 'pending');
  else setStatus('llmStatus', '');
}

function markBudgetDirty() {
  const dirty = JSON.stringify(readBudgetForm()) !== savedBudgetSnapshot;
  if (dirty) setStatus('budgetStatus', '有未保存修改', 'pending');
  else setStatus('budgetStatus', '');
}

function fillLLM(config) {
  const preset = detectPreset(config);
  $('service').value = preset;
  $('provider').value = config.provider;
  $('baseUrl').value = config.baseUrl;
  $('model').value = config.model;
  $('apiKey').value = config.apiKey;
  applyServiceSelection({ replaceValues: false });
  savedLLMSnapshot = JSON.stringify(readLLMForm());
}

function fillBudget(config) {
  for (const key of Object.keys(SEARCH_BUDGET_DEFAULTS)) {
    $(key).value = config[key];
    $(key + 'Val').textContent = config[key];
  }
  savedBudgetSnapshot = JSON.stringify(readBudgetForm());
}

async function load() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.LLM, STORAGE_KEYS.BUDGET]);
  fillLLM({ ...LLM_DEFAULTS, ...(stored[STORAGE_KEYS.LLM] || {}) });
  fillBudget({ ...SEARCH_BUDGET_DEFAULTS, ...(stored[STORAGE_KEYS.BUDGET] || {}) });
}

async function ensureOriginPermission(baseUrl) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch (_) {
    return false;
  }
  const pattern = origin + '/*';
  try {
    if (await chrome.permissions.contains({ origins: [pattern] })) return true;
    return await chrome.permissions.request({ origins: [pattern] });
  } catch (_) {
    return false;
  }
}

async function saveLLM() {
  const config = readLLMForm();
  const error = validateLLM(config);
  if (error) {
    setStatus('llmStatus', error, 'error');
    return;
  }
  if (!(await ensureOriginPermission(config.baseUrl))) {
    setStatus('llmStatus', '未获得访问该 AI 地址的权限，未保存', 'error');
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.LLM]: config });
  savedLLMSnapshot = JSON.stringify(config);
  setStatus('llmStatus', 'AI 配置已保存 ✓');
}

async function testLLM() {
  const config = readLLMForm();
  const error = validateLLM(config);
  if (error) {
    setStatus('llmStatus', error, 'error');
    return;
  }
  if (!(await ensureOriginPermission(config.baseUrl))) {
    setStatus('llmStatus', '未获得访问该 AI 地址的权限，无法测试', 'error');
    return;
  }

  const button = $('testLLM');
  button.disabled = true;
  button.textContent = '测试中…';
  setStatus('llmStatus', '正在连接…', 'pending');
  try {
    const headers = { 'Content-Type': 'application/json' };
    let url;
    let body;
    if (config.provider === 'anthropic') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      url = config.baseUrl + '/messages';
      body = { model: config.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1024 };
    } else {
      headers.Authorization = 'Bearer ' + config.apiKey;
      url = config.baseUrl + '/chat/completions';
      body = { model: config.model, messages: [{ role: 'user', content: 'ping' }] };
    }
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const text = await response.text();
      setStatus('llmStatus', `连接失败：HTTP ${response.status} ${text.slice(0, 160)}`, 'error');
      return;
    }
    const dirty = JSON.stringify(config) !== savedLLMSnapshot;
    setStatus('llmStatus', dirty ? '连接成功；当前修改尚未保存' : '连接成功 ✓', dirty ? 'pending' : 'ok');
  } catch (e) {
    setStatus('llmStatus', `连接失败：${e.message || e}`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '测试当前填写';
  }
}

async function resetLLM() {
  await chrome.storage.local.remove(STORAGE_KEYS.LLM);
  fillLLM({ ...LLM_DEFAULTS });
  setStatus('llmStatus', '已恢复默认，API Key 已清除');
}

async function saveBudget() {
  const budget = readBudgetForm();
  await chrome.storage.local.set({ [STORAGE_KEYS.BUDGET]: budget });
  savedBudgetSnapshot = JSON.stringify(budget);
  setStatus('budgetStatus', '搜索范围已保存 ✓');
}

async function resetBudget() {
  await chrome.storage.local.remove(STORAGE_KEYS.BUDGET);
  fillBudget({ ...SEARCH_BUDGET_DEFAULTS });
  setStatus('budgetStatus', '已恢复默认');
}

for (const id of ['keywordCount', 'searchLimitPerKeyword', 'topicLimit', 'maxRepliesPerTopic', 'maxCharsPerReply']) {
  $(id).addEventListener('input', () => {
    $(id + 'Val').textContent = $(id).value;
    markBudgetDirty();
  });
}

$('service').addEventListener('change', () => {
  applyServiceSelection();
  markLLMDirty();
});
for (const id of ['provider', 'baseUrl', 'model', 'apiKey']) {
  $(id).addEventListener('input', markLLMDirty);
  $(id).addEventListener('change', markLLMDirty);
}
$('toggleApiKey').addEventListener('click', () => {
  const show = $('apiKey').type === 'password';
  $('apiKey').type = show ? 'text' : 'password';
  $('toggleApiKey').textContent = show ? '隐藏' : '显示';
  $('toggleApiKey').setAttribute('aria-pressed', String(show));
});
$('saveLLM').addEventListener('click', saveLLM);
$('testLLM').addEventListener('click', testLLM);
$('resetLLM').addEventListener('click', resetLLM);
$('saveBudget').addEventListener('click', saveBudget);
$('resetBudget').addEventListener('click', resetBudget);

load().catch((error) => setStatus('llmStatus', `读取设置失败：${error.message || error}`, 'error'));
