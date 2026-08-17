// ============================================================
// ZJU WebVPN 适配
//   校外访问时页面地址形如：
//     https://webvpn.zju.edu.cn/https/<加密后的主机名>/topic/123
//   加密方案（深信服 WebVPN）：AES-128-CFB，key 和 IV 均为 "wrdvpnisthebest!"，
//   最终路径 = hex(IV) + hex(密文)。
//
//   所以在 WebVPN 下：
//     - 网页链接：直接复用当前页面的前缀（www.cc98.org 已经编码在地址里）
//     - API 请求：需要自己算出 api.cc98.org 的编码路径
// ============================================================
import { CC98_API_BASE, CC98_WEB_BASE } from '../../shared/constants.js';

const WEBVPN_HOSTS = ['webvpn.zju.edu.cn'];
const WEBVPN_SECRET = 'wrdvpnisthebest!'; // key 与 IV 相同，16 字节

// 当前页面是否经由 WebVPN 访问
export function isWebVPN() {
  try {
    return WEBVPN_HOSTS.includes(location.hostname);
  } catch (e) {
    return false;
  }
}

// ---------- 网页地址（同步） ----------
// WebVPN 下直接从当前地址里取 "/https/<编码>" 前缀，无需解密
export function getWebBase() {
  if (!isWebVPN()) return CC98_WEB_BASE;
  const seg = location.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && (seg[0] === 'https' || seg[0] === 'http')) {
    return `${location.origin}/${seg[0]}/${seg[1]}`;
  }
  return CC98_WEB_BASE;
}

// 当前页面是否确实是 CC98
//   WebVPN 域名下挂着全校的站点，必须确认编码段对应的是 cc98.org，
//   否则教务网、图书馆等页面也会被注入 UI。
export async function isCC98Site() {
  if (!isWebVPN()) return true; // 非 WebVPN 时由 manifest 的 matches 保证
  const seg = location.pathname.split('/').filter(Boolean);
  if (seg.length < 2) return false;
  const current = seg[1].toLowerCase();
  for (const host of ['www.cc98.org', 'cc98.org']) {
    if ((await encryptHost(host)).toLowerCase() === current) return true;
  }
  return false;
}

// ---------- API 地址（异步，需要做一次 AES 运算） ----------
let _apiBaseCache = null;

export async function getApiBase() {
  if (!isWebVPN()) return CC98_API_BASE;
  if (_apiBaseCache) return _apiBaseCache;
  const host = new URL(CC98_API_BASE).host; // api.cc98.org
  _apiBaseCache = `${location.origin}/https/${await encryptHost(host)}`;
  return _apiBaseCache;
}

// ---------- 加密实现 ----------
// WebCrypto 不支持 CFB 模式，但 CFB 只需要「原始 AES 块加密」这一个原语：
//   keystream_i = E_k(前一个密文块)，C_i = P_i XOR keystream_i
// 而 E_k(block) 可以用零 IV 的单块 AES-CBC 得到（C1 = E_k(P1 XOR 0)）。
export async function encryptHost(host) {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(WEBVPN_SECRET);
  const iv = enc.encode(WEBVPN_SECRET);
  const cipher = await aesCfbEncrypt(keyBytes, iv, enc.encode(host));
  return toHex(iv) + toHex(cipher);
}

async function aesCfbEncrypt(keyBytes, iv, plaintext) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']);
  const out = new Uint8Array(plaintext.length);
  let prev = iv;

  for (let i = 0; i < plaintext.length; i += 16) {
    const keystream = await aesEncryptBlock(key, prev);
    const chunk = plaintext.subarray(i, Math.min(i + 16, plaintext.length));
    const block = new Uint8Array(chunk.length);
    for (let j = 0; j < chunk.length; j++) block[j] = chunk[j] ^ keystream[j];
    out.set(block, i);
    if (block.length === 16) prev = block; // 只有完整块才参与下一轮反馈
  }
  return out;
}

// 用零 IV 的 AES-CBC 加密单个 16 字节块，取前 16 字节即 E_k(block)
async function aesEncryptBlock(key, block) {
  const buf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, key, block);
  return new Uint8Array(buf).slice(0, 16);
}

function toHex(bytes) {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}
