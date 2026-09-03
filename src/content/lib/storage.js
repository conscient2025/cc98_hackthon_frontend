// ============================================================
// chrome.storage 封装
//   local  → 持久化（LLM 配置、后端地址、用户邮箱等）
//   session → 内存态（CC98 token，关闭浏览器即清空）
// ============================================================
import { STORAGE_KEYS, SESSION_KEYS, LLM_DEFAULTS, SEARCH_BUDGET_DEFAULTS, BACKEND_DEFAULT_BASE, SUBSCRIPTION_LIMIT_FALLBACK } from '../../shared/constants.js';

export async function getLocal(key) {
  const obj = await chrome.storage.local.get(key);
  return obj ? obj[key] : undefined;
}

export async function setLocal(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function getSession(key) {
  const obj = await chrome.storage.session.get(key);
  return obj ? obj[key] : undefined;
}

export async function setSession(key, value) {
  await chrome.storage.session.set({ [key]: value });
}

// ---------- 便捷读取（带默认值合并） ----------

export async function getLLMConfig() {
  const saved = (await getLocal(STORAGE_KEYS.LLM)) || {};
  return { ...LLM_DEFAULTS, ...saved };
}

export async function getSearchBudget() {
  const saved = (await getLocal(STORAGE_KEYS.BUDGET)) || {};
  return { ...SEARCH_BUDGET_DEFAULTS, ...saved };
}

export async function getBackendBase() {
  return (await getLocal(STORAGE_KEYS.BACKEND_BASE)) || BACKEND_DEFAULT_BASE;
}

export async function getUserEmail() {
  return (await getLocal(STORAGE_KEYS.USER_EMAIL)) || '';
}

export async function getUserId() {
  return (await getLocal(STORAGE_KEYS.USER_ID)) || '';
}

export async function getSubscriptionLimit() {
  const v = await getLocal('subscriptionLimit');
  return v || SUBSCRIPTION_LIMIT_FALLBACK;
}

export async function setSubscriptionLimit(n) {
  await setLocal('subscriptionLimit', n);
}

// ---------- CC98 token（内存态） ----------

export async function getCC98Auth() {
  const token = await getSession(SESSION_KEYS.CC98_TOKEN);
  const type = (await getSession(SESSION_KEYS.CC98_AUTH_TYPE)) || 'bearer';
  return token ? { type, value: token } : null;
}

export async function setCC98Auth(auth) {
  if (!auth || !auth.value) {
    await chrome.storage.session.remove([SESSION_KEYS.CC98_TOKEN, SESSION_KEYS.CC98_AUTH_TYPE]);
    return;
  }
  await setSession(SESSION_KEYS.CC98_TOKEN, auth.value);
  await setSession(SESSION_KEYS.CC98_AUTH_TYPE, auth.type || 'bearer');
}
