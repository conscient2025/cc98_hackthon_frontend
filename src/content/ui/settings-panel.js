// ============================================================
// 设置 Tab：登录 / 通知间隔 / 通知渠道（钉钉+邮箱）/ 后端状态
// ============================================================
import { listChannels, saveChannel, testChannel, getHealth } from '../lib/backend-api.js';
import { isLoggedIn, getEmail, logout, sendCode, verifyCode } from '../lib/auth.js';
import { getBackendBase, getLocal, setLocal } from '../lib/storage.js';
import { STORAGE_KEYS, NOTIFY_INTERVAL_PRESETS } from '../../shared/constants.js';
import { esc, toast } from '../lib/html-utils.js';

function fmtInterval(min) {
  if (!min) return '';
  if (min % 1440 === 0) return min / 1440 + ' 天';
  if (min % 60 === 0) return min / 60 + ' 小时';
  return min + ' 分钟';
}

export async function renderSettings(body) {
  if (!(await isLoggedIn())) {
    renderLogin(body);
    return;
  }
  body.innerHTML = `<div class="cc98-loading"><span class="cc98-spin"></span>加载中…</div>`;
  try {
    await draw(body);
  } catch (e) {
    body.innerHTML = `<div class="cc98-error"><div class="cc98-error-head">${esc(e.message || '加载失败')}</div></div>`;
  }
}

// ---------- 登录表单 ----------
function renderLogin(body) {
  body.innerHTML = `
    <div class="cc98-login-hint">用浙大邮箱登录，订阅提醒会把命中的新帖推送给你配置的渠道。</div>
    <div class="cc98-form-row">
      <input id="cc98-login-email" class="cc98-input" type="email" placeholder="xxx@zju.edu.cn" />
      <button id="cc98-login-send" class="cc98-btn-primary" type="button">发送验证码</button>
    </div>
    <div id="cc98-login-step2" style="display:none">
      <div class="cc98-form-row" style="margin-top:12px">
        <input id="cc98-login-code" class="cc98-input" type="text" placeholder="6 位验证码" />
        <button id="cc98-login-verify" class="cc98-primary" type="button">验证登录</button>
      </div>
    </div>`;

  const emailEl = body.querySelector('#cc98-login-email');
  const sendBtn = body.querySelector('#cc98-login-send');
  const step2 = body.querySelector('#cc98-login-step2');
  const codeEl = body.querySelector('#cc98-login-code');
  const verifyBtn = body.querySelector('#cc98-login-verify');

  sendBtn.addEventListener('click', async () => {
    const email = emailEl.value.trim();
    if (!email.includes('@')) {
      toast('请输入正确的邮箱');
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中…';
    try {
      const res = await sendCode(email);
      // 本地 demo：后端直接返回 dev_code，自动完成验证，无需收邮件
      if (res && res.dev_code) {
        await verifyCode(email, res.dev_code);
        toast('已登录（本地测试模式）');
        await renderSettings(body);
        return;
      }
      step2.style.display = 'block';
      toast('验证码已发送，请查收邮箱');
      codeEl.focus();
    } catch (e) {
      toast(e.message || '发送失败');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送验证码';
    }
  });

  verifyBtn.addEventListener('click', async () => {
    const code = codeEl.value.trim();
    if (!code) {
      toast('请输入验证码');
      return;
    }
    verifyBtn.disabled = true;
    try {
      await verifyCode(emailEl.value.trim(), code);
      toast('登录成功');
      await renderSettings(body);
    } catch (e) {
      toast(e.message || '验证失败');
      verifyBtn.disabled = false;
    }
  });
}

// ---------- 已登录：设置表单 ----------
async function draw(body) {
  const email = await getEmail();
  const backendBase = await getBackendBase();
  const storedInterval = (await getLocal(STORAGE_KEYS.NOTIFY_INTERVAL)) || 60;

  let channels = [];
  try {
    channels = (await listChannels()) || [];
  } catch (_) {
    channels = [];
  }
  const ding = channels.find((c) => c.provider === 'dingtalk') || null;
  const mail = channels.find((c) => c.provider === 'email') || null;

  // 共享通知间隔：优先取已存渠道的值
  const currentInterval = ding ? ding.notify_interval_minutes : (mail ? mail.notify_interval_minutes : storedInterval);

  const intervalOptions = NOTIFY_INTERVAL_PRESETS.map((m) =>
    `<option value="${m}"${m === currentInterval ? ' selected' : ''}>${fmtInterval(m)}</option>`
  ).join('');

  body.innerHTML = `
    <div class="cc98-setting-field">
      <label>高级配置</label>
      <div class="cc98-setting-inline">
        <button id="cc98-open-options" class="cc98-secondary" type="button">打开完整设置页</button>
      </div>
      <div class="cc98-setting-help" style="margin-top:6px">
        LLM（API Key / 模型）、搜索预算、内容过滤强度都在设置页里改，这里只管理登录和通知渠道。
      </div>
    </div>

    <div class="cc98-setting-field">
      <label>账号</label>
      <div class="cc98-setting-inline">
        <span style="font-size:13px;color:var(--cc98-txt)">${esc(email)}</span>
        <button id="cc98-logout" class="cc98-secondary" type="button">退出登录</button>
      </div>
    </div>

    <div class="cc98-setting-field">
      <label>通知间隔（攒一批发）</label>
      <select id="cc98-interval" class="cc98-select">${intervalOptions}</select>
      <div class="cc98-setting-help" style="margin-top:6px">
        扫描固定每 10 分钟一次；命中的新帖会先「攒」起来，到所选间隔再合并成一条消息推送给你。
      </div>
    </div>

    <div class="cc98-setting-field">
      <label>通知渠道</label>

      <div class="cc98-channel">
        <div class="ch-head">
          <span class="ch-title">🔔 钉钉机器人</span>
          <label class="cc98-setting-inline"><input id="cc98-ding-en" type="checkbox" ${ding && ding.enabled ? 'checked' : ''} /> 启用</label>
        </div>
        <div class="cc98-setting-field" style="margin-bottom:8px">
          <label>Webhook 地址</label>
          <input id="cc98-ding-webhook" class="cc98-input" type="text" placeholder="https://oapi.dingtalk.com/robot/send?access_token=…"
                 value="${esc((ding && ding.config && ding.config.webhook) || '')}" />
        </div>
        <div class="cc98-setting-field" style="margin-bottom:8px">
          <label>加签 Secret</label>
          <input id="cc98-ding-secret" class="cc98-input" type="text"
                 placeholder="${ding && ding.has_secret ? '已保存，留空则保持不变' : 'SEC…'}" />
        </div>
        <div class="cc98-panel-actions" style="margin-bottom:0">
          <button class="cc98-primary" type="button" data-save="dingtalk">保存</button>
          <button class="cc98-secondary" type="button" data-test="dingtalk">测试</button>
        </div>
      </div>

      <div class="cc98-channel">
        <div class="ch-head">
          <span class="ch-title">✉️ 邮箱通知</span>
          <label class="cc98-setting-inline"><input id="cc98-mail-en" type="checkbox" ${mail && mail.enabled ? 'checked' : ''} /> 启用</label>
        </div>
        <div class="cc98-setting-field" style="margin-bottom:8px">
          <label>接收邮箱</label>
          <input id="cc98-mail-to" class="cc98-input" type="email" placeholder="student@zju.edu.cn"
                 value="${esc((mail && mail.config && mail.config.to) || '')}" />
        </div>
        <div class="cc98-setting-field" style="margin-bottom:8px">
          <label>主题前缀</label>
          <input id="cc98-mail-prefix" class="cc98-input" type="text" placeholder="CC98 订阅提醒"
                 value="${esc((mail && mail.config && mail.config.subject_prefix) || '')}" />
        </div>
        <div class="cc98-panel-actions" style="margin-bottom:0">
          <button class="cc98-primary" type="button" data-save="email">保存</button>
          <button class="cc98-secondary" type="button" data-test="email">测试</button>
        </div>
      </div>
    </div>

    <div class="cc98-setting-field" style="margin-bottom:0">
      <label>后端状态</label>
      <div class="cc98-setting-help" id="cc98-backend-status">后端地址：${esc(backendBase)} · 检测中…</div>
    </div>`;

  // 后端状态
  getHealth()
    .then((h) => {
      const st = body.querySelector('#cc98-backend-status');
      const scan = h && h.components && h.components.scan_interval_minutes;
      st.textContent = `后端地址：${backendBase} · 在线 · 扫描间隔 ${scan} 分钟`;
    })
    .catch(() => {
      const st = body.querySelector('#cc98-backend-status');
      st.textContent = `后端地址：${backendBase} · 离线（请确认已启动）`;
    });

  // 退出登录
  body.querySelector('#cc98-logout').addEventListener('click', async () => {
    await logout();
    renderLogin(body);
  });

  // 打开完整设置页（LLM / 预算 / 过滤强度都在那里）
  body.querySelector('#cc98-open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 读取各渠道表单
  function dingConfig() {
    const secretInput = body.querySelector('#cc98-ding-secret');
    const secret = secretInput.value.trim();
    return {
      provider: 'dingtalk',
      enabled: body.querySelector('#cc98-ding-en').checked,
      notifyIntervalMinutes: Number(body.querySelector('#cc98-interval').value),
      config: {
        webhook: body.querySelector('#cc98-ding-webhook').value.trim(),
        secret: secret || (ding && ding.has_secret ? '***' : ''),
      },
    };
  }
  function mailConfig() {
    return {
      provider: 'email',
      enabled: body.querySelector('#cc98-mail-en').checked,
      notifyIntervalMinutes: Number(body.querySelector('#cc98-interval').value),
      config: {
        to: body.querySelector('#cc98-mail-to').value.trim(),
        subject_prefix: body.querySelector('#cc98-mail-prefix').value.trim() || 'CC98 订阅提醒',
      },
    };
  }

  // 保存 / 测试
  body.querySelectorAll('[data-save], [data-test]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.save || btn.dataset.test;
      const isTest = !!btn.dataset.test;
      const cfg = provider === 'dingtalk' ? dingConfig() : mailConfig();
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = isTest ? '发送中…' : '保存中…';
      try {
        if (isTest) {
          await testChannel(cfg);
          toast('测试消息已发送，请查看你的渠道');
        } else {
          await saveChannel(cfg);
          // 记住共享间隔，供下次打开默认
          await setLocal(STORAGE_KEYS.NOTIFY_INTERVAL, cfg.notifyIntervalMinutes);
          toast('已保存');
        }
      } catch (e) {
        toast(e.message || '操作失败');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}
