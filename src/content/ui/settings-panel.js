// ============================================================
// 设置 Tab：用非技术语言介绍两项功能的使用方法，并进入完整设置页
// ============================================================
import { MSG } from '../../shared/constants.js';

export function renderSettings(body) {
  body.innerHTML = `
    <div class="cc98-settings-intro">
      第一次使用时，选择需要的功能按下面操作。两个功能可以单独使用。
    </div>
    <div class="cc98-settings-features">
      <div class="cc98-settings-feature">
        <div class="feature-name">AI 搜索</div>
        <div class="feature-desc">把相关帖子和回复整理成一份带原帖链接的回答。</div>
        <div class="feature-steps">
          <div class="feature-step"><span class="step-no">1</span><span>按照完整设置页的提示连接 AI 服务</span></div>
          <div class="feature-step"><span class="step-no">2</span><span>回到「搜索」，输入想了解的话题</span></div>
        </div>
      </div>
      <div class="cc98-settings-feature">
        <div class="feature-name">订阅提醒</div>
        <div class="feature-desc">持续关注感兴趣的新帖，并通过邮箱或钉钉提醒你。</div>
        <div class="feature-steps">
          <div class="feature-step"><span class="step-no">1</span><span>在完整设置中用浙大邮箱登录，并选择提醒方式</span></div>
          <div class="feature-step"><span class="step-no">2</span><span>回到「订阅」，添加想关注的关键词</span></div>
        </div>
        <div class="feature-note">设置完成后由服务器自动运行，关闭网页或电脑也不影响。</div>
      </div>
    </div>
    <div class="cc98-panel-actions cc98-settings-actions">
      <button id="cc98-open-full-settings" class="cc98-primary" type="button">打开完整设置</button>
    </div>
    <div class="cc98-settings-feedback" hidden></div>`;

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
      const feedback = body.querySelector('.cc98-settings-feedback');
      feedback.hidden = false;
      feedback.textContent = `设置页打开失败：${error.message || error}。请从浏览器右上角的扩展菜单进入设置。`;
    }
  });
}
