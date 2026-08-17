// ============================================================
// CC98 API 客户端（旧 data/cc98_client.py 的 JS 翻译）
//   searchPosts：搜主题，1.2s 限速 + 403 重试
//   getPostDetail：读一个主题 + 所有楼层，404 回退 /post/basic
// ============================================================
import { fetchProxy } from './net.js';
import { getAuth, isTokenExpired } from './token-extractor.js';
import { AppError, ERROR_TYPES } from './errors.js';
import { isWebVPN, getApiBase, getWebBase } from './webvpn.js';
import {
  CC98_SEARCH_MIN_INTERVAL_MS,
  CC98_SEARCH_RETRY_ATTEMPTS,
} from '../../shared/constants.js';

// 搜索限速状态
let _searchChain = Promise.resolve();
let _lastSearchAt = 0;

function _withRateLimit(fn) {
  const run = _searchChain.then(async () => {
    const wait = CC98_SEARCH_MIN_INTERVAL_MS - (Date.now() - _lastSearchAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _lastSearchAt = Date.now();
    return fn();
  });
  _searchChain = run.catch(() => {});
  return run;
}

function _ensureAuth() {
  const auth = getAuth();
  if (!auth) {
    throw new AppError(ERROR_TYPES.CC98_NOT_LOGGED_IN, '未检测到 CC98 登录凭证，请先在 cc98.org 登录');
  }
  // CC98 的 access_token 一小时过期，靠页面自身用 refresh_token 续期。
  // 已过期时直接提示刷新，省得发一堆注定 401 的请求。
  if (auth.type === 'bearer' && isTokenExpired()) {
    throw new AppError(
      ERROR_TYPES.CC98_TOKEN_EXPIRED,
      'CC98 登录已过期，请刷新 CC98 页面后重试（页面会自动续期）'
    );
  }
  return auth;
}

function _headers(auth) {
  // 注意：User-Agent 和 Cookie 都是 fetch 的 forbidden header，手动设置会被浏览器丢弃。
  // 所以 cookie 型凭证不能靠 header 传，改用 credentials:'include' 让浏览器自己带。
  const headers = { Accept: 'application/json' };
  if (auth.type === 'bearer') {
    const v = auth.value;
    headers.Authorization = v.toLowerCase().startsWith('bearer ') ? v : 'Bearer ' + v;
  }
  return headers;
}

async function _getJson(path, params, auth) {
  const qs = new URLSearchParams(params || {}).toString();
  const url = (await getApiBase()) + path + (qs ? '?' + qs : '');
  console.debug('[CC98 AI+] 请求：', url);
  // WebVPN 靠 cookie 维持会话；cookie 型凭证也只能靠浏览器自动携带
  const credentials = isWebVPN() || auth.type === 'cookie' ? 'include' : 'omit';
  try {
    return await fetchProxy(url, { method: 'GET', headers: _headers(auth), credentials });
  } catch (err) {
    // 明确标记成 CC98 的错误，否则上层只看到 401 会误判成 LLM API Key 问题
    if (err && err.status === 401) {
      throw new AppError(
        ERROR_TYPES.CC98_TOKEN_EXPIRED,
        'CC98 登录凭证无效或已过期（插件没能拿到有效的登录态）',
        `${auth.type} 凭证，长度 ${String(auth.value || '').length}`
      );
    }
    throw err;
  }
}

async function _searchJson(path, params, auth) {
  for (let attempt = 0; attempt <= CC98_SEARCH_RETRY_ATTEMPTS; attempt++) {
    try {
      return await _withRateLimit(() => _getJson(path, params, auth));
    } catch (err) {
      const isRateLimited = err && err.status === 403;
      if (!isRateLimited || attempt >= CC98_SEARCH_RETRY_ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, Math.max(CC98_SEARCH_MIN_INTERVAL_MS, 1000)));
    }
  }
  throw new Error('搜索重试失败');
}

// 搜索主题，返回标准化主题数组
export async function searchPosts(query, boardId = null, limit = 20, offset = 0) {
  const q = (query || '').trim();
  if (!q) throw new Error('query must not be empty');
  const auth = _ensureAuth();

  let endpoint = '/topic/search';
  if (boardId != null && boardId !== 0) endpoint = `/topic/search/board/${boardId}`;

  const topics = [];
  let cur = offset;
  while (topics.length < limit) {
    const size = Math.min(20, limit - topics.length);
    const payload = await _searchJson(endpoint, { keyword: q, from: cur, size }, auth);
    // 返回不是数组，说明拿到的不是搜索结果（WebVPN 拦截页、登录跳转、错误 HTML 等）。
    // 这种情况必须报错，不能当成「搜不到」静默吞掉。
    if (!Array.isArray(payload)) {
      throw new AppError(
        ERROR_TYPES.CC98_API_FAILED,
        'CC98 搜索接口返回了非预期内容（可能是 WebVPN 拦截、未授权该子域，或登录已失效）',
        typeof payload === 'string' ? payload.slice(0, 300) : payload
      );
    }
    if (!payload.length) break;
    topics.push(...payload.map(normalizeTopic));
    if (payload.length < size) break;
    cur += payload.length;
  }
  return topics.slice(0, limit);
}

// 读一个主题 + 所有楼层
export async function getPostDetail(postId, opts = {}) {
  const pageSize = opts.pageSize || 10;
  const maxPages = opts.maxPages || null;
  const auth = _ensureAuth();

  let topicId = postId;
  let topicInfo;
  try {
    topicInfo = await _getJson(`/topic/${topicId}`, null, auth);
  } catch (err) {
    if (!err || err.status !== 404) throw err;
    const basic = await _getJson('/post/basic', { id: postId }, auth);
    const bp = Array.isArray(basic) ? basic[0] : basic;
    if (!bp || !bp.topicId) throw err;
    topicId = bp.topicId;
    topicInfo = await _getJson(`/topic/${topicId}`, null, auth);
  }

  const isDict = topicInfo && typeof topicInfo === 'object' && !Array.isArray(topicInfo);
  const topic = isDict ? normalizeTopic(topicInfo) : { id: topicId };
  const expectedFloorCount = isDict && typeof topicInfo.replyCount === 'number' ? topicInfo.replyCount + 1 : null;

  const posts = [];
  let offset = 0;
  let pagesRead = 0;
  while (true) {
    if (maxPages != null && pagesRead >= maxPages) break;
    const payload = await _getJson(`/topic/${topicId}/post`, { from: offset, size: pageSize }, auth);
    if (!Array.isArray(payload) || !payload.length) break;
    posts.push(...payload.map(normalizePost));
    pagesRead++;
    if (payload.length < pageSize) break;
    if (expectedFloorCount != null && posts.length >= expectedFloorCount) break;
    offset += payload.length;
  }

  return {
    topic,
    posts,
    post_count: posts.length,
    url: `${getWebBase()}/topic/${topicId}`,
  };
}

function _firstPresent(obj, names) {
  for (const n of names) if (obj && n in obj) return obj[n];
  return undefined;
}

export function normalizeTopic(item) {
  const topicId = _firstPresent(item, ['id', 'topicId']);
  return {
    id: topicId,
    title: item.title,
    board_id: item.boardId,
    board_name: item.boardName,
    author_id: item.userId,
    author_name: _firstPresent(item, ['userName', 'authorName', 'lastPostUser']),
    time: _firstPresent(item, ['time', 'createTime']),
    last_post_time: item.lastPostTime,
    last_post_user: item.lastPostUser,
    reply_count: item.replyCount,
    hit_count: item.hitCount,
    like_count: item.likeCount,
    is_anonymous: item.isAnonymous,
    type: item.type,
    url: `${getWebBase()}/topic/${topicId}`,
    raw: item,
  };
}

export function normalizePost(item) {
  return {
    id: item.id,
    topic_id: item.topicId,
    floor: item.floor,
    title: item.title,
    content: item.content,
    content_type: item.contentType,
    user_id: item.userId,
    user_name: item.userName,
    time: item.time,
    is_anonymous: item.isAnonymous,
    is_deleted: item.isDeleted,
    is_lz: item.isLZ,
    like_count: item.likeCount,
    url: `${getWebBase()}/topic/${item.topicId}`,
    raw: item,
  };
}
