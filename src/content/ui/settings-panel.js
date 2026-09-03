// ============================================================
// 设置 Tab：展示两项独立功能的状态，并进入唯一的完整设置页
// ============================================================
import { isLoggedIn, getEmail } from '../lib/auth.js';
import { getLLMConfig } from '../lib/storage.js';
import { esc } from '../lib/html-utils.js';
import { MSG } from '../../shared/constants.js';

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
        AI 搜索和订阅通知都在同一个设置页，但可以分开使用，只配置你需要的功能即可。
      </div>
      <div class="cc98-settings-features">
        <div class="cc98-settings-feature">
          <div class="feature-name">AI 搜索</div>
          <div class="feature-desc">使用你自己的 AI 密钥，不用登录订阅提醒。</div>
          <div class="feature-status ${llmReady ? 'ready' : ''}">${llmReady ? 'AI 服务已设置' : '还未填写 AI 密钥'}</div>
        </div>
        <div class="cc98-settings-feature">
          <div class="feature-name">订阅通知</div>
          <div class="feature-desc">服务器定时查找新帖，不需要 AI 密钥。</div>
          <div class="feature-status ${watchLoggedIn ? 'ready' : ''}">${watchLoggedIn ? `已登录 ${esc(email)}` : '还未登录订阅提醒'}</div>
        </div>
      </div>
      <div class="cc98-setting-help cc98-settings-security">
        AI 密钥只保存在当前浏览器并发给所选 AI 服务；订阅关键词和接收方式只发给订阅提醒服务器。两边不会共用账号或密钥。
      </div>
      <div class="cc98-panel-actions">
        <button id="cc98-open-full-settings" class="cc98-primary" type="button">打开完整设置</button>
      </div>`;

    const openButton = body.querySelector('#cc98-open-full-settings');
    openButton.addEventListener('click', async () => {
      openButton.disabled = true;
      openButton.textContent = '正在打开…';
      try {
        const response = await chrome.runtime.sendMessage({ type: MSG.OPEN_OPTIONS });
        if (!response || !response.ok) throw new Error((response && response.error) || '打开失败');
        openButton.disabled = false;
        openButton.textContent = '打开完整设置';
      } catch (error) {
        openButton.disabled = false;
        openButton.textContent = '打开完整设置';
        const security = body.querySelector('.cc98-settings-security');
        security.textContent = `设置页打开失败：${error.message || error}。请从浏览器右上角的扩展菜单进入设置。`;
      }
    });
  } catch (error) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">读取设置失败</div><div class="cc98-error-hint">${esc(error.message || error)}</div></div>`;
  }
}
