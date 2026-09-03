// ============================================================
// 统一设置页：并列管理 AI 搜索与订阅通知，两项功能互不依赖
// ============================================================
import {
  LLM_DEFAULTS,
  MSG,
  NOTIFY_INTERVAL_PRESETS,
  SEARCH_BUDGET_DEFAULTS,
  STORAGE_KEYS,
} from '../../shared/constants.js';
import {
  getHealth,
  listChannels,
  saveChannel,
  setChannelEnabled,
  testChannel,
} from '../../content/lib/backend-api.js';
import { getEmail, isLoggedIn, logout, sendCode, verifyCode } from '../../content/lib/auth.js';
import { fmtBeijingDateTime } from '../../content/lib/html-utils.js';

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
let watchChannels = [];
let watchChannelsLoaded = false;
const channelDirty = { dingtalk: false, email: false };

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
  if (!config.apiKey) return '请填写 AI 密钥';
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
  await loadWatchSettings();
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
  setStatus('llmStatus', 'AI 设置已保存 ✓');
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
  setStatus('llmStatus', '已恢复默认，AI 密钥已清除');
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

function formatInterval(minutes) {
  if (minutes % 1440 === 0) return `${minutes / 1440} 天`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${minutes} 分钟`;
}

function getChannel(provider) {
  return watchChannels.find((channel) => channel.provider === provider) || null;
}

function renderChannelState(provider) {
  const channel = getChannel(provider);
  const state = $(provider === 'dingtalk' ? 'dingtalkState' : 'emailState');
  const toggle = $(provider === 'dingtalk' ? 'toggleDingtalk' : 'toggleEmailChannel');

  state.textContent = channel ? (channel.enabled ? '已启用' : '未启用') : '未配置';
  state.classList.toggle('enabled', !!(channel && channel.enabled));
  toggle.hidden = !channel;
  if (channel) {
    toggle.dataset.enabled = String(!channel.enabled);
    toggle.textContent = channel.enabled ? '停用' : '启用';
  }
}

function renderChannelRuntime(provider) {
  const channel = getChannel(provider);
  const runtime = $(provider === 'dingtalk' ? 'dingtalkRuntime' : 'emailRuntime');
  runtime.className = 'runtime';
  runtime.textContent = '';
  if (!channel || !channel.last_dispatch_status) return;
  if (channel.last_dispatch_status === 'failed') {
    runtime.classList.add('error');
    runtime.textContent = `最近一次提醒没有发出去：${channel.last_dispatch_error || '请检查接收方式'}。这次提醒不会自动重发。`;
    return;
  }
  if (channel.last_sent_at) {
    runtime.classList.add('ok');
    runtime.textContent = `最近发送成功（北京时间）：${fmtBeijingDateTime(channel.last_sent_at)}`;
  }
}

function renderChannelForm(provider, { resetFields = true } = {}) {
  const channel = getChannel(provider);
  renderChannelState(provider);
  renderChannelRuntime(provider);

  const saveButton = $(provider === 'dingtalk' ? 'saveDingtalk' : 'saveEmailChannel');
  saveButton.textContent = channel ? '保存修改' : '保存并启用';
  if (!resetFields) return;

  channelDirty[provider] = false;
  if (provider === 'dingtalk') {
    $('dingtalkWebhook').value = '';
    $('dingtalkSecret').value = '';
    const hasWebhook = !!(channel && channel.config && channel.config.webhook);
    $('dingtalkWebhookHint').hidden = !hasWebhook;
    $('dingtalkSecret').placeholder = channel && channel.has_secret
      ? '已保存；保存时可留空，测试时需重填'
      : 'SEC…';
  } else {
    $('notificationEmail').value = (channel && channel.config && channel.config.to)
      || $('watchAccountEmail').textContent
      || '';
    $('emailSubjectPrefix').value = (channel && channel.config && channel.config.subject_prefix) || '';
  }
}

function setWatchPanels(loggedIn) {
  $('watchLoggedOut').hidden = loggedIn;
  $('watchLoggedIn').hidden = !loggedIn;
}

async function loadWatchHealth() {
  const status = $('watchBackendStatus');
  status.classList.remove('error');
  status.textContent = '正在连接订阅提醒服务…';
  try {
    const health = await getHealth();
    const scan = health && health.components && health.components.scan_interval_minutes;
    status.textContent = `订阅提醒服务正常 · 每 ${scan || '—'} 分钟查看一次新帖`;
  } catch (_) {
    status.classList.add('error');
    status.textContent = '订阅提醒服务暂时不可用，请稍后重试。AI 搜索仍然可以使用。';
  }
}

async function loadWatchChannels() {
  watchChannelsLoaded = false;
  watchChannels = (await listChannels()) || [];
  watchChannelsLoaded = true;
  const stored = await chrome.storage.local.get(STORAGE_KEYS.NOTIFY_INTERVAL);
  const ding = getChannel('dingtalk');
  const mail = getChannel('email');
  const interval = (ding && ding.notify_interval_minutes)
    || (mail && mail.notify_interval_minutes)
    || stored[STORAGE_KEYS.NOTIFY_INTERVAL]
    || 60;
  $('notifyInterval').value = String(interval);
  renderChannelForm('dingtalk');
  renderChannelForm('email');
}

async function loadWatchSettings() {
  $('notifyInterval').innerHTML = NOTIFY_INTERVAL_PRESETS
    .map((minutes) => `<option value="${minutes}">${formatInterval(minutes)}</option>`)
    .join('');
  loadWatchHealth();

  const loggedIn = await isLoggedIn();
  setWatchPanels(loggedIn);
  if (!loggedIn) return;

  $('watchAccountEmail').textContent = await getEmail();
  try {
    await loadWatchChannels();
  } catch (error) {
    if (!(await isLoggedIn())) {
      setWatchPanels(false);
      setStatus('watchLoginStatus', '登录已过期，请重新登录', 'error');
      return;
    }
    setStatus('intervalStatus', error.message || '读取通知设置失败', 'error');
  }
}

async function sendWatchLoginCode() {
  const email = $('watchEmail').value.trim();
  if (!/@zju\.edu\.cn$/i.test(email)) {
    setStatus('watchLoginStatus', '请输入浙大邮箱', 'error');
    return;
  }
  const button = $('sendWatchCode');
  button.disabled = true;
  button.textContent = '发送中…';
  setStatus('watchLoginStatus', '');
  try {
    const response = await sendCode(email);
    if (response && response.dev_code) {
      await verifyCode(email, response.dev_code);
      setStatus('watchLoginStatus', '已登录（测试模式）');
      await loadWatchSettings();
      return;
    }
    $('watchCodeStep').hidden = false;
    setStatus('watchLoginStatus', '验证码已发送，请查收邮箱');
    $('watchCode').focus();
  } catch (error) {
    setStatus('watchLoginStatus', error.message || '验证码发送失败', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '发送验证码';
  }
}

async function verifyWatchLoginCode() {
  const email = $('watchEmail').value.trim();
  const code = $('watchCode').value.trim();
  if (!code) {
    setStatus('watchLoginStatus', '请输入验证码', 'error');
    return;
  }
  const button = $('verifyWatchCode');
  button.disabled = true;
  button.textContent = '验证中…';
  try {
    await verifyCode(email, code);
    setStatus('watchLoginStatus', '登录成功');
    await loadWatchSettings();
  } catch (error) {
    setStatus('watchLoginStatus', error.message || '验证失败', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '验证并登录';
  }
}

function readDingtalkConfig() {
  const config = {};
  const webhook = $('dingtalkWebhook').value.trim();
  const secret = $('dingtalkSecret').value.trim();
  if (webhook) config.webhook = webhook;
  if (secret) config.secret = secret;
  return config;
}

function readEmailConfig() {
  return {
    to: $('notificationEmail').value.trim(),
    subject_prefix: $('emailSubjectPrefix').value.trim() || 'CC98 订阅提醒',
  };
}

async function saveNotifyInterval() {
  const button = $('saveNotifyInterval');
  const interval = Number($('notifyInterval').value);
  if (!watchChannelsLoaded) {
    setStatus('intervalStatus', '还没有读到接收方式，请稍后重试', 'error');
    return;
  }
  button.disabled = true;
  button.textContent = '保存中…';
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.NOTIFY_INTERVAL]: interval });
    const channel = getChannel('dingtalk') || getChannel('email');
    if (channel) {
      await saveChannel({
        provider: channel.provider,
        enabled: channel.enabled,
        notifyIntervalMinutes: interval,
        config: undefined,
      });
      for (const item of watchChannels) item.notify_interval_minutes = interval;
      setStatus('intervalStatus', '通知间隔已保存 ✓');
    } else {
      setStatus('intervalStatus', '已记住，将在首次保存渠道时生效', 'pending');
    }
  } catch (error) {
    setStatus('intervalStatus', error.message || '保存失败', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '保存通知间隔';
  }
}

async function saveWatchChannel(provider) {
  const current = getChannel(provider);
  const config = provider === 'dingtalk' ? readDingtalkConfig() : readEmailConfig();
  const statusId = provider === 'dingtalk' ? 'dingtalkStatus' : 'emailChannelStatus';
  const button = $(provider === 'dingtalk' ? 'saveDingtalk' : 'saveEmailChannel');

  if (!watchChannelsLoaded) {
    setStatus(statusId, '还没有读到接收方式，请稍后重试', 'error');
    return;
  }

  if (provider === 'dingtalk' && !current && !config.webhook) {
    setStatus(statusId, '请填写完整的 Webhook 地址', 'error');
    return;
  }
  if (provider === 'email' && !config.to) {
    setStatus(statusId, '请填写接收邮箱', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = '保存中…';
  try {
    const savedChannel = await saveChannel({
      provider,
      enabled: current ? current.enabled : true,
      notifyIntervalMinutes: Number($('notifyInterval').value),
      config,
    });
    await chrome.storage.local.set({
      [STORAGE_KEYS.NOTIFY_INTERVAL]: Number($('notifyInterval').value),
    });
    const existingIndex = watchChannels.findIndex((item) => item.provider === provider);
    if (existingIndex >= 0) watchChannels[existingIndex] = savedChannel;
    else watchChannels.push(savedChannel);
    for (const item of watchChannels) {
      item.notify_interval_minutes = Number($('notifyInterval').value);
    }
    renderChannelForm(provider);
    channelDirty[provider] = false;
    setStatus(statusId, '接收方式已保存 ✓');
  } catch (error) {
    setStatus(statusId, error.message || '保存失败', 'error');
  } finally {
    button.disabled = false;
    button.textContent = getChannel(provider) ? '保存修改' : '保存并启用';
  }
}

async function testWatchChannel(provider) {
  const current = getChannel(provider);
  const config = provider === 'dingtalk' ? readDingtalkConfig() : readEmailConfig();
  const statusId = provider === 'dingtalk' ? 'dingtalkStatus' : 'emailChannelStatus';
  const button = $(provider === 'dingtalk' ? 'testDingtalk' : 'testEmailChannel');

  if (provider === 'dingtalk' && !config.webhook) {
    setStatus(statusId, '测试时请重新填写完整 Webhook', 'error');
    return;
  }
  if (provider === 'dingtalk' && current && current.has_secret && !config.secret) {
    setStatus(statusId, '这个机器人设置了加签，发送测试时请重新填写完整 Secret', 'error');
    return;
  }
  if (provider === 'email' && !config.to) {
    setStatus(statusId, '请填写接收邮箱', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = '发送中…';
  try {
    await testChannel({ provider, config });
    setStatus(
      statusId,
      channelDirty[provider] ? '测试成功；当前修改尚未保存' : '测试消息已发送 ✓',
      channelDirty[provider] ? 'pending' : 'ok',
    );
  } catch (error) {
    setStatus(statusId, error.message || '发送失败', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '发送测试（不保存）';
  }
}

async function toggleWatchChannel(provider) {
  const channel = getChannel(provider);
  if (!channel) return;
  const button = $(provider === 'dingtalk' ? 'toggleDingtalk' : 'toggleEmailChannel');
  const statusId = provider === 'dingtalk' ? 'dingtalkStatus' : 'emailChannelStatus';
  const enabled = !channel.enabled;
  button.disabled = true;
  button.textContent = enabled ? '启用中…' : '停用中…';
  try {
    await setChannelEnabled(provider, enabled);
    channel.enabled = enabled;
    renderChannelState(provider);
    setStatus(
      statusId,
      channelDirty[provider]
        ? `已${enabled ? '开始' : '停止'}发送提醒；上面的修改尚未保存`
        : `已${enabled ? '开始' : '停止'}发送提醒 ✓`,
      channelDirty[provider] ? 'pending' : 'ok',
    );
  } catch (error) {
    setStatus(statusId, error.message || '操作失败', 'error');
  } finally {
    button.disabled = false;
    renderChannelState(provider);
  }
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

$('sendWatchCode').addEventListener('click', sendWatchLoginCode);
$('verifyWatchCode').addEventListener('click', verifyWatchLoginCode);
$('watchCode').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') verifyWatchLoginCode();
});
$('logoutWatch').addEventListener('click', async () => {
  await logout();
  watchChannels = [];
  watchChannelsLoaded = false;
  $('watchCodeStep').hidden = true;
  $('watchCode').value = '';
  setWatchPanels(false);
  chrome.runtime.sendMessage({ type: MSG.SET_BADGE, count: 0 }).catch(() => {});
  setStatus('watchLoginStatus', '已退出订阅提醒');
});
$('saveNotifyInterval').addEventListener('click', saveNotifyInterval);
$('notifyInterval').addEventListener('change', () => {
  setStatus('intervalStatus', '有未保存修改', 'pending');
});

$('saveDingtalk').addEventListener('click', () => saveWatchChannel('dingtalk'));
$('testDingtalk').addEventListener('click', () => testWatchChannel('dingtalk'));
$('toggleDingtalk').addEventListener('click', () => toggleWatchChannel('dingtalk'));
$('saveEmailChannel').addEventListener('click', () => saveWatchChannel('email'));
$('testEmailChannel').addEventListener('click', () => testWatchChannel('email'));
$('toggleEmailChannel').addEventListener('click', () => toggleWatchChannel('email'));

for (const id of ['dingtalkWebhook', 'dingtalkSecret']) {
  $(id).addEventListener('input', () => {
    channelDirty.dingtalk = true;
    setStatus('dingtalkStatus', '有未保存修改', 'pending');
  });
}
for (const id of ['notificationEmail', 'emailSubjectPrefix']) {
  $(id).addEventListener('input', () => {
    channelDirty.email = true;
    setStatus('emailChannelStatus', '有未保存修改', 'pending');
  });
}

load().catch((error) => setStatus('llmStatus', `读取设置失败：${error.message || error}`, 'error'));
