// ============================================================
// 工具栏弹窗：快速状态 + 跳转
// ============================================================
import { STORAGE_KEYS, SESSION_KEYS } from '../../shared/constants.js';

const $ = (id) => document.getElementById(id);

async function init() {
  const email = (await chrome.storage.local.get(STORAGE_KEYS.USER_EMAIL))[STORAGE_KEYS.USER_EMAIL];
  const token = (await chrome.storage.session.get(SESSION_KEYS.CC98_TOKEN))[SESSION_KEYS.CC98_TOKEN];

  const emailEl = $('email');
  emailEl.textContent = email || '未登录';
  emailEl.className = 'v ' + (email ? 'ok' : 'no');

  const tokenEl = $('token');
  tokenEl.textContent = token ? '已获取' : '未获取';
  tokenEl.className = 'v ' + (token ? 'ok' : 'no');

  $('openCC98').addEventListener('click', () => chrome.tabs.create({ url: 'https://www.cc98.org' }));
  $('openSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

init();
