// ============================================================
// 网络代理：所有跨域请求都经过后台 Service Worker 转发
// 原因：MV3 内容脚本里的 fetch 受页面 CORS 限制，
//       而 CC98 接口 / LLM 接口一般不放行浏览器跨域。
//       后台 SW 拥有 host_permissions，可绕过 CORS。
// ============================================================
import { MSG } from '../../shared/constants.js';

export async function fetchProxy(url, options = {}) {
  const headers = {};
  for (const [k, v] of Object.entries(options.headers || {})) {
    if (v !== undefined && v !== null) headers[k] = String(v);
  }

  const res = await chrome.runtime.sendMessage({
    type: MSG.FETCH,
    url,
    options: {
      method: options.method || 'GET',
      headers,
      body: options.body || undefined,
      // 默认不带 cookie，避免把站点凭证泄露给 LLM 服务商；WebVPN 场景显式传 'include'
      credentials: options.credentials || 'omit',
    },
  });

  if (!res) {
    throw new Error('后台服务未响应，请重新加载插件');
  }
  if (!res.ok) {
    const err = new Error(extractMessage(res));
    err.status = res.status;
    err.detail = res.data;
    throw err;
  }
  return res.data;
}

// 从后端返回的 JSON 里提取可读错误信息
function extractMessage(res) {
  const data = res.data;
  if (data && typeof data === 'object') {
    const detail = data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      if (first && first.msg) return first.msg;
      return JSON.stringify(detail).slice(0, 300);
    }
    if (data.message) return data.message;
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  }
  if (typeof data === 'string') return data.slice(0, 300);
  return '请求失败 (HTTP ' + res.status + ')';
}
