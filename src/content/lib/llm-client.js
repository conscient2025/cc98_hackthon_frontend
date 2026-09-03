// ============================================================
// LLM 客户端：支持 OpenAI 兼容接口 + Anthropic 接口
// 用户自己的 API Key，只发给用户配置的 Base URL
// ============================================================
import { fetchProxy } from './net.js';
import { getLLMConfig } from './storage.js';
import { ANTHROPIC_MAX_TOKENS_FALLBACK } from '../../shared/constants.js';
import { AppError, ERROR_TYPES } from './errors.js';

export async function callLLM({ system, user, temperature, maxTokens }) {
  const cfg = await getLLMConfig();
  if (!cfg.apiKey) {
    throw new AppError(ERROR_TYPES.LLM_API_KEY_INVALID, '还未填写 AI 密钥，请到设置页完成设置');
  }

  const isAnthropic = cfg.provider === 'anthropic';
  const url = _join(cfg.baseUrl, isAnthropic ? '/messages' : '/chat/completions');

  const headers = { 'Content-Type': 'application/json' };
  let body;

  // 0 / 空 表示不限制输出长度
  const limit = Number(maxTokens || cfg.maxTokens) || 0;

  if (isAnthropic) {
    headers['x-api-key'] = cfg.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: cfg.model,
      system,
      messages: [{ role: 'user', content: user }],
      // Anthropic 的 max_tokens 必填，无法省略
      max_tokens: limit > 0 ? limit : ANTHROPIC_MAX_TOKENS_FALLBACK,
      temperature: temperature ?? cfg.temperature,
    };
  } else {
    headers.Authorization = 'Bearer ' + cfg.apiKey;
    body = {
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: temperature ?? cfg.temperature,
    };
    // OpenAI 兼容接口：不传 max_tokens 就用模型自身上限
    if (limit > 0) body.max_tokens = limit;
  }

  let data;
  try {
    data = await fetchProxy(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (err) {
    // 网络层错误已在 net.js 里标记 status；这里补一层 LLM 网络提示
    if (!err || !err.status) {
      throw new AppError(ERROR_TYPES.LLM_NETWORK, '无法连接 AI 服务', err && err.message);
    }
    // 明确标记来源，避免和 CC98 的 401 混为一谈
    if (err.status === 401) {
      throw new AppError(ERROR_TYPES.LLM_API_KEY_INVALID, 'AI 服务不接受这个密钥，请检查是否填写正确', err.detail || err.message);
    }
    throw err;
  }

  return extractText(data, isAnthropic);
}

function extractText(data, isAnthropic) {
  if (isAnthropic) {
    if (data && Array.isArray(data.content)) {
      const text = data.content.map((b) => (b && b.text) || '').join('');
      if (text) return text;
    }
    if (data && data.stop_reason === 'max_tokens') {
      throw new AppError(ERROR_TYPES.OUTPUT_TRUNCATED, '模型输出被截断，正文为空');
    }
  } else if (data && Array.isArray(data.choices) && data.choices.length) {
    const choice = data.choices[0];
    const msg = choice.message || {};
    if (msg.content) return msg.content;

    // 推理模型（deepseek-reasoner / deepseek-v4-pro 等）会先输出思维链 reasoning_content，
    // 再输出正文 content。输出额度不足时思维链可能占满额度，content 就是空字符串。
    const reasoningLen = String(msg.reasoning_content || '').length;
    if (choice.finish_reason === 'length') {
      throw new AppError(
        ERROR_TYPES.OUTPUT_TRUNCATED,
        '模型输出被截断，正文为空',
        reasoningLen
          ? `这是推理模型，思维链吃掉了全部额度（reasoning ${reasoningLen} 字符，content 0 字符）`
          : '输出长度不足，未能产生正文'
      );
    }
    if (reasoningLen) {
      // 有思维链但没正文，且不是长度问题：退而返回思维链，好过整个搜索白跑
      console.warn('[CC98 AI+] 模型只返回了思维链，没有正文，降级使用思维链内容');
      return msg.reasoning_content;
    }
  }
  throw new AppError(
    ERROR_TYPES.MODEL_FORMAT_ERROR,
    '模型返回格式异常，请重试或更换模型',
    JSON.stringify(data).slice(0, 300)
  );
}

function _join(base, path) {
  return String(base || '').replace(/\/+$/, '') + path;
}
