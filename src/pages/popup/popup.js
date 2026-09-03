// ============================================================
// 工具栏弹窗：快速状态 + 跳转
// ============================================================
import { STORAGE_KEYS, SESSION_KEYS } from '../../shared/constants.js';

const $ = (id) => document.getElementById(id);

async function init() {
  const local = await chrome.storage.local.get([STORAGE_KEYS.USER_EMAIL, STORAGE_KEYS.AUTH_TOKEN]);
  const email = local[STORAGE_KEYS.USER_EMAIL];
  const watchToken = local[STORAGE_KEYS.AUTH_TOKEN];
  const token = (await chrome.storage.session.get(SESSION_KEYS.CC98_TOKEN))[SESSION_KEYS.CC98_TOKEN];

  const emailEl = $('email');
  emailEl.textContent = email && watchToken ? email : '未登录';
  emailEl.className = 'v ' + (email && watchToken ? 'ok' : 'no');

  const tokenEl = $('token');
  tokenEl.textContent = token ? '已获取' : '未获取';
  tokenEl.className = 'v ' + (token ? 'ok' : 'no');

  $('openCC98').addEventListener('click', () => chrome.tabs.create({ url: 'https://www.cc98.org' }));
  $('openSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

init();
