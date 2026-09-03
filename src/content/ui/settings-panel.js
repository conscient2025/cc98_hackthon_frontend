// ============================================================
// 设置 Tab：展示两项独立功能的状态，并进入唯一的完整设置页
// ============================================================
import { isLoggedIn, getEmail } from '../lib/auth.js';
import { getLLMConfig } from '../lib/storage.js';
import { esc } from '../lib/html-utils.js';

export async function renderSettings(body) {
  body.innerHTML = `<div class="cc98-loading"><span class="cc98-spin"></span>加载中…</div>`;

  try {
    const [llm, watchLoggedIn, email] = await Promise.all([
      getLLMConfig(),
      isLoggedIn(),
      getEmail(),
    ]);
    const llmReady = !!(llm && llm.apiKey && llm.baseUrl && llm.model);

    body.innerHTML = `
      <div class="cc98-settings-intro">
        AI 搜索和订阅通知是两个并列、互不依赖的功能。完整配置集中在同一个设置页中。
      </div>
      <div class="cc98-settings-features">
        <div class="cc98-settings-feature">
          <div class="feature-name">AI 搜索</div>
          <div class="feature-desc">本机调用你选择的 AI 服务，不依赖 Watch 登录。</div>
          <div class="feature-status ${llmReady ? 'ready' : ''}">${llmReady ? 'AI 服务已配置' : '尚未配置 API Key'}</div>
        </div>
        <div class="cc98-settings-feature">
          <div class="feature-name">订阅通知</div>
          <div class="feature-desc">由 Watch 后端扫描并投递，不依赖 LLM API Key。</div>
          <div class="feature-status ${watchLoggedIn ? 'ready' : ''}">${watchLoggedIn ? `已登录 ${esc(email)}` : '尚未登录 Watch'}</div>
        </div>
      </div>
      <div class="cc98-setting-help cc98-settings-security">
        API Key 只保存在浏览器扩展本地并发往所选 AI 地址；订阅登录令牌保存在本机，订阅表达式与渠道配置存入 Watch 后端。两套凭证不会共用。
      </div>
      <div class="cc98-panel-actions">
        <button id="cc98-open-full-settings" class="cc98-primary" type="button">打开完整设置</button>
      </div>`;

    body.querySelector('#cc98-open-full-settings').addEventListener('click', async () => {
      try {
        await chrome.runtime.openOptionsPage();
      } catch (_) {
        window.open(chrome.runtime.getURL('src/pages/options/options.html'), '_blank', 'noopener');
      }
    });
  } catch (error) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">读取设置失败</div><div class="cc98-error-hint">${esc(error.message || error)}</div></div>`;
  }
}
