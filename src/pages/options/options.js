// ============================================================
// 设置页：LLM 配置 + 搜索预算 + Watch 后端地址
// 扩展页拥有 host_permissions，可直接 fetch 跨域做连接测试
// ============================================================
import { LLM_DEFAULTS, SEARCH_BUDGET_DEFAULTS, STORAGE_KEYS, BACKEND_DEFAULT_BASE } from '../../shared/constants.js';

const $ = (id) => document.getElementById(id);

function setStatus(msg, isErr) {
  $('status').textContent = msg;
  // 用 CSS 变量而不是写死颜色，深色模式下才有足够对比度
  $('status').style.color = isErr ? 'var(--err)' : 'var(--ok)';
}

// 申请访问某个地址的权限：用户换了 LLM / 后端地址时动态授权。
// host_permissions 只默认放行了固定域名，其余按需弹出授权框。
async function ensureOriginPermission(baseUrl) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch (e) {
    return true; // 空 / 非法地址不申请，交给后续逻辑报错
  }
  const pattern = origin + '/*';
  try {
    const granted = await chrome.permissions.contains({ origins: [pattern] });
    if (granted) return true;
    return await chrome.permissions.request({ origins: [pattern] });
  } catch (e) {
    return false;
  }
}

// 滑块实时显示数值
function bindRange(id) {
  const el = $(id);
  const valEl = $(id + 'Val');
  el.addEventListener('input', () => { valEl.textContent = el.value; });
}

async function load() {
  const llm = (await chrome.storage.local.get(STORAGE_KEYS.LLM))[STORAGE_KEYS.LLM] || {};
  const budget = (await chrome.storage.local.get(STORAGE_KEYS.BUDGET))[STORAGE_KEYS.BUDGET] || {};
  const base = (await chrome.storage.local.get(STORAGE_KEYS.BACKEND_BASE))[STORAGE_KEYS.BACKEND_BASE] || BACKEND_DEFAULT_BASE;

  const L = { ...LLM_DEFAULTS, ...llm };
  const B = { ...SEARCH_BUDGET_DEFAULTS, ...budget };
  $('provider').value = L.provider;
  $('baseUrl').value = L.baseUrl;
  $('model').value = L.model;
  $('apiKey').value = L.apiKey;
  $('temperature').value = L.temperature;
  $('maxTokens').value = L.maxTokens;
  $('temperatureVal').textContent = L.temperature;

  $('keywordCount').value = B.keywordCount;
  $('searchLimitPerKeyword').value = B.searchLimitPerKeyword;
  $('topicLimit').value = B.topicLimit;
  $('maxRepliesPerTopic').value = B.maxRepliesPerTopic;
  $('maxCharsPerReply').value = B.maxCharsPerReply;
  ['keywordCount', 'searchLimitPerKeyword', 'topicLimit', 'maxRepliesPerTopic', 'maxCharsPerReply'].forEach((id) => {
    $(id + 'Val').textContent = $(id).value;
  });

  $('backendBase').value = base;
}

async function save() {
  const baseUrl = $('baseUrl').value.trim();
  const backendBase = $('backendBase').value.trim();

  // 换新的 LLM / 后端地址时，先申请访问权限（弹一次浏览器授权框）
  if (!(await ensureOriginPermission(baseUrl))) {
    setStatus('未获得访问 LLM 地址的权限，未保存', true);
    return;
  }
  if (backendBase && /^https?:\/\//i.test(backendBase) && !(await ensureOriginPermission(backendBase))) {
    setStatus('未获得访问后端地址的权限，未保存', true);
    return;
  }

  const llm = {
    provider: $('provider').value,
    baseUrl,
    model: $('model').value.trim(),
    apiKey: $('apiKey').value.trim(),
    temperature: Number($('temperature').value),
    maxTokens: Number($('maxTokens').value) || 0, // 空 / 非法 → 0 = 不限制
  };
  const budget = {
    keywordCount: Number($('keywordCount').value),
    searchLimitPerKeyword: Number($('searchLimitPerKeyword').value),
    topicLimit: Number($('topicLimit').value),
    maxRepliesPerTopic: Number($('maxRepliesPerTopic').value),
    maxCharsPerReply: Number($('maxCharsPerReply').value),
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.LLM]: llm,
    [STORAGE_KEYS.BUDGET]: budget,
    [STORAGE_KEYS.BACKEND_BASE]: backendBase,
  });
  setStatus('已保存 ✓');
}

async function testLLM() {
  const provider = $('provider').value;
  const baseUrl = $('baseUrl').value.trim().replace(/\/+$/, '');
  const apiKey = $('apiKey').value.trim();
  const model = $('model').value.trim();
  if (!apiKey) { setStatus('请先填写 API Key', true); return; }
  if (!baseUrl) { setStatus('请先填写 Base URL', true); return; }
  if (!(await ensureOriginPermission(baseUrl))) {
    setStatus('未获得访问该地址的权限，无法测试', true);
    return;
  }

  setStatus('测试中…', false);
  try {
    const headers = { 'Content-Type': 'application/json' };
    let url, body;
    // 不要给很小的 max_tokens：推理模型的思维链会把额度吃光，正文为空会被误判成失败
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      url = baseUrl + '/messages';
      body = { model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1024 };
    } else {
      headers.Authorization = 'Bearer ' + apiKey;
      url = baseUrl + '/chat/completions';
      body = { model, messages: [{ role: 'user', content: 'ping' }] };
    }
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text();
      setStatus('连接失败：HTTP ' + res.status + ' ' + txt.slice(0, 200), true);
      return;
    }
    setStatus('连接成功 ✓');
  } catch (e) {
    setStatus('连接失败：' + (e.message || e), true);
  }
}

async function reset() {
  await chrome.storage.local.remove([STORAGE_KEYS.LLM, STORAGE_KEYS.BUDGET, STORAGE_KEYS.BACKEND_BASE]);
  await load();
  setStatus('已恢复默认设置');
}

// 绑定
['temperature', 'keywordCount', 'searchLimitPerKeyword', 'topicLimit', 'maxRepliesPerTopic', 'maxCharsPerReply'].forEach(bindRange);
$('save').addEventListener('click', save);
$('testLLM').addEventListener('click', testLLM);
$('reset').addEventListener('click', reset);

load();
