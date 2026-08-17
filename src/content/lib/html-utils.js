// ============================================================
// 小型 DOM / 文本工具
// ============================================================

// HTML 转义（把用户/LLM 内容安全地塞进 innerHTML）
export function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

// 顶部 toast 提示
export function toast(msg, dur = 3000) {
  const t = document.createElement('div');
  t.className = 'cc98-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

// 相对时间格式化
export function fmtTime(s) {
  if (!s) return '';
  try {
    let normalized = String(s);
    // 后端返回的 UTC 时间没有时区后缀时补 Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
      normalized += 'Z';
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return s;
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return d.toLocaleDateString('zh-CN');
  } catch (e) {
    return String(s);
  }
}

// 通知投递状态中文映射
export function deliveryStatusText(status) {
  const map = {
    pending: '待发送',
    sent: '已发送',
    failed: '发送失败',
    skipped: '未配置渠道',
  };
  return map[status] || status || '未知';
}

// 通知投递状态颜色
export function deliveryStatusColor(status) {
  const map = {
    pending: '#92400e', // 棕
    sent: '#065f46',    // 绿
    failed: '#b91c1c',  // 红
    skipped: '#6b7280', // 灰
  };
  return map[status] || '#6b7280';
}
