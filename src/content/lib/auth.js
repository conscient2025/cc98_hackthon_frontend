// ============================================================
// 认证流程：浙大邮箱登录（请求验证码 → 校验）
//   后端以 JWT 识别用户；本地 demo 会返回 dev_code 直接通过
// ============================================================
import { getLocal, setLocal } from './storage.js';
import { STORAGE_KEYS } from '../../shared/constants.js';
import { requestEmailCode, verifyEmailCode } from './backend-api.js';

export async function isLoggedIn() {
  const [email, token] = await Promise.all([
    getLocal(STORAGE_KEYS.USER_EMAIL),
    getLocal(STORAGE_KEYS.AUTH_TOKEN),
  ]);
  return !!(email && token);
}

export async function getEmail() {
  return (await getLocal(STORAGE_KEYS.USER_EMAIL)) || '';
}

export async function logout() {
  await setLocal(STORAGE_KEYS.USER_EMAIL, '');
  await setLocal(STORAGE_KEYS.USER_ID, '');
  await setLocal(STORAGE_KEYS.AUTH_TOKEN, '');
}

// 请求验证码，返回 { status, email, dev_code }
//   dev_code 非空时（本地 demo / 测试环境）可直接用它验证，无需收邮件
export async function sendCode(email) {
  return requestEmailCode(email);
}

// 校验验证码，成功后写入邮箱 + token
export async function verifyCode(email, code) {
  const res = await verifyEmailCode(email, code);
  await setLocal(STORAGE_KEYS.USER_EMAIL, email);
  await setLocal(STORAGE_KEYS.USER_ID, (res && res.user && res.user.id) || '');
  await setLocal(STORAGE_KEYS.AUTH_TOKEN, (res && res.access_token) || '');
  return res;
}
