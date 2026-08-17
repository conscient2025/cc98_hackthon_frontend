// ============================================================
// CC98 登录凭证提取（同步读页面 localStorage / cookie）
// 只用于 AI 搜索，token 只发给 api.cc98.org，绝不发给其他服务器
//
// CC98 前端把值存成带类型前缀的形式：
//   __1_accessToken            → "str-Bearer eyJhbGciOi..."   （字符串）
//   __1_userInfo               → "obj-{...}"                  （对象）
//   __1_accessToken_expirationTime → "1786867157"             （秒级时间戳）
// 所以取值前必须剥掉 str-/obj- 前缀，再剥掉 Bearer 前缀，才是真正的 JWT。
// ============================================================
import { setCC98Auth } from './storage.js';

const CC98_TOKEN_KEY = '__1_accessToken';
const CC98_TOKEN_EXPIRE_KEY = '__1_accessToken_expirationTime';

// JWT：三段 base64url，用点分隔；CC98 的 access_token 有近千字符
function looksLikeJWT(v) {
  return typeof v === 'string' && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v) && v.length >= 100;
}

// 剥掉 CC98 的存储类型前缀和 Bearer 前缀，取出裸 JWT；不像 JWT 则返回 null
function unwrapToken(raw) {
  if (!raw) return null;
  let v = String(raw).trim();
  if (v.startsWith('str-')) v = v.slice(4).trim();
  else if (v.startsWith('obj-')) v = v.slice(4).trim();
  const m = /^bearer\s+(.+)$/i.exec(v);
  if (m) v = m[1].trim();
  return looksLikeJWT(v) ? v : null;
}

// token 是否已过期（CC98 把过期时间单独存成秒级时间戳）
export function isTokenExpired() {
  try {
    const raw = localStorage.getItem(CC98_TOKEN_EXPIRE_KEY);
    if (!raw) return false; // 读不到就不拦，交给服务端判断
    const expireAt = Number(String(raw).replace(/^str-/, '').trim());
    if (!expireAt) return false;
    return Date.now() / 1000 >= expireAt;
  } catch (e) {
    return false;
  }
}

// 扫描整个 localStorage，收集所有能还原成 JWT 的值（兜底用）
function scanForJWT() {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const raw = key && localStorage.getItem(key);
      if (!raw) continue;

      const direct = unwrapToken(raw);
      if (direct) {
        found.push({ key, value: direct });
        continue;
      }

      // OIDC 风格：JSON 对象里套 access_token
      const body = String(raw).startsWith('obj-') ? String(raw).slice(4) : String(raw);
      if (body.charAt(0) === '{') {
        try {
          const parsed = JSON.parse(body);
          for (const field of ['access_token', 'accessToken', 'token', 'id_token']) {
            const t = unwrapToken(parsed && parsed[field]);
            if (t) found.push({ key: `${key} → ${field}`, value: t });
          }
        } catch (e) { /* 不是合法 JSON */ }
      }
    }
  } catch (e) { /* localStorage 不可访问 */ }
  return found;
}

// 从页面提取 CC98 登录凭证
export function extractCC98Token() {
  // 1. 先读 CC98 的已知存储位置，命中率最高
  try {
    const direct = unwrapToken(localStorage.getItem(CC98_TOKEN_KEY));
    if (direct) return { type: 'bearer', value: direct, source: CC98_TOKEN_KEY };
  } catch (e) { /* ignore */ }

  // 2. 兜底：全量扫描，取最长的那个（access_token 通常比 id_token 长）
  const candidates = scanForJWT();
  if (candidates.length) {
    candidates.sort((a, b) => b.value.length - a.value.length);
    return { type: 'bearer', value: candidates[0].value, source: candidates[0].key };
  }

  // 3. 再兜底：cookie（靠 credentials:'include' 由浏览器携带）
  try {
    if (document.cookie) return { type: 'cookie', value: document.cookie, source: 'cookie' };
  } catch (e) { /* ignore */ }

  return null;
}

// 读取登录凭证
// 不做长期缓存：CC98 的 token 一小时就过期，一次搜索可能跑好几分钟，
// 缓存住会导致中途 401。localStorage 读取很便宜，每次重取更稳。
export function getAuth() {
  const auth = extractCC98Token();
  setCC98Auth(auth).catch(() => {});
  return auth;
}

// 刷新并打印诊断信息（页面初始化时调一次）
export function refreshAuth() {
  const auth = extractCC98Token();
  if (auth) {
    console.log(`[CC98 AI+] CC98 凭证：${auth.type}，长度 ${auth.value.length}，来源 ${auth.source}`);
    if (auth.type === 'bearer' && isTokenExpired()) {
      console.warn('[CC98 AI+] 该 token 已过期，请在 CC98 页面重新登录或刷新');
    }
  } else {
    console.warn('[CC98 AI+] 未找到 CC98 登录凭证，请确认已登录');
  }
  setCC98Auth(auth).catch(() => {});
  return auth;
}
