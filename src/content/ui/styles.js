// ============================================================
// 全部 CSS（统一到实际使用的类名，避免漏样式）
// ============================================================

const CSS = `
:root {
  --cc98-pri: #3b82f6; --cc98-pri-h: #2563eb; --cc98-bg: #fff; --cc98-txt: #1f2937;
  --cc98-txt2: #6b7280; --cc98-bd: #e5e7eb; --cc98-sh: 0 8px 32px rgba(0,0,0,0.12); --cc98-rad: 12px;
}

/* ============ 悬浮按钮 ============ */
#cc98-ai-float-btn{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;background:var(--cc98-pri);color:#fff;border:none;cursor:pointer;z-index:99990;box-shadow:0 4px 16px rgba(59,130,246,0.35);display:flex;align-items:center;justify-content:center;transition:all 0.2s;padding:0}
#cc98-ai-float-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(59,130,246,0.45)}
#cc98-ai-float-btn .cc98-fb-icon{font-size:22px;line-height:1}
#cc98-ai-float-btn .cc98-fb-badge{position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;font-size:11px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px;font-weight:700;border:2px solid #fff;box-sizing:border-box}
#cc98-ai-float-btn .cc98-fb-badge[hidden]{display:none}
#cc98-ai-float-btn{touch-action:none;user-select:none;-webkit-user-select:none}
#cc98-ai-float-btn.dragging{transform:none!important;transition:none!important;cursor:grabbing}

/* ============ 侧边面板 ============ */
#cc98-ai-panel{position:fixed;bottom:88px;right:24px;width:480px;max-width:94vw;max-height:640px;background:var(--cc98-bg);border-radius:var(--cc98-rad);box-shadow:var(--cc98-sh);z-index:99989;display:none;flex-direction:column;overflow:hidden;border:1px solid var(--cc98-bd)}
#cc98-ai-panel.open{display:flex}
.cc98-panel-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--cc98-bd);background:#f9fafb}
.cc98-panel-title{font-size:15px;font-weight:600;color:var(--cc98-txt)}
.cc98-panel-close{background:none;border:none;color:var(--cc98-txt2);font-size:15px;cursor:pointer;padding:4px 8px;border-radius:6px}
.cc98-panel-close:hover{background:#e5e7eb;color:var(--cc98-txt)}
.cc98-panel-tabs{display:flex;border-bottom:1px solid var(--cc98-bd);background:#fff}
.cc98-tab{flex:1;padding:10px 0;text-align:center;font-size:13px;font-weight:500;color:var(--cc98-txt2);cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;transition:all 0.2s}
.cc98-tab:hover{color:var(--cc98-txt)}
.cc98-tab.active{color:var(--cc98-pri);border-bottom-color:var(--cc98-pri)}
.cc98-panel-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px}
.cc98-panel-body::-webkit-scrollbar{width:5px}
.cc98-panel-body::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}

/* ============ 面板右下角拖拽手柄 ============ */
.cc98-panel-resize{position:absolute;bottom:0;right:0;width:20px;height:20px;cursor:nwse-resize;z-index:20;touch-action:none;user-select:none}
.cc98-panel-resize::after{content:'';position:absolute;right:4px;bottom:4px;width:9px;height:9px;border-right:2px solid var(--cc98-txt2);border-bottom:2px solid var(--cc98-txt2)}
#cc98-ai-panel.resizing{user-select:none}

/* ============ 表单 ============ */
.cc98-form-row{display:flex;gap:8px;margin-bottom:12px}
.cc98-input{flex:1;box-sizing:border-box;padding:9px 12px;border:1px solid var(--cc98-bd);border-radius:8px;font-size:13px;color:var(--cc98-txt);outline:none;background:#fff;min-width:0}
.cc98-input:focus{border-color:var(--cc98-pri);box-shadow:0 0 0 2px rgba(59,130,246,0.12)}
.cc98-select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--cc98-bd);border-radius:8px;font-size:13px;color:var(--cc98-txt);outline:none;background:#fff}
.cc98-range{flex:1;min-width:0;accent-color:var(--cc98-pri)}
.cc98-textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--cc98-bd);border-radius:8px;font-size:13px;color:var(--cc98-txt);outline:none;background:#fff;resize:vertical;min-height:52px}
.cc98-btn-primary,.cc98-primary,.cc98-secondary{border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.cc98-btn-primary,.cc98-primary{background:var(--cc98-pri);color:#fff}
.cc98-btn-primary:hover,.cc98-primary:hover{background:var(--cc98-pri-h)}
.cc98-btn-primary:disabled,.cc98-primary:disabled,.cc98-secondary:disabled{opacity:.6;cursor:not-allowed}
.cc98-secondary{background:#f3f4f6;color:var(--cc98-txt);border:1px solid var(--cc98-bd)}
.cc98-secondary:hover{background:#e5e7eb}
.cc98-panel-actions{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.cc98-setting-field{margin-bottom:12px}
.cc98-setting-field label{display:block;font-size:12px;font-weight:600;color:var(--cc98-txt2);margin-bottom:5px}
.cc98-setting-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cc98-setting-inline label{display:flex;align-items:center;gap:8px;color:var(--cc98-txt);font-size:13px;font-weight:500;margin:0}
.cc98-setting-help{font-size:12px;line-height:1.6;color:var(--cc98-txt2);background:#f9fafb;border:1px solid var(--cc98-bd);border-radius:8px;padding:10px}

/* ============ 结果元信息（上次搜索 + 清空） ============ */
.cc98-result-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--cc98-txt2);margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--cc98-bd)}
.cc98-result-meta[hidden]{display:none}
.cc98-link-btn{background:none;border:none;color:var(--cc98-pri);font-size:11px;cursor:pointer;padding:2px 4px;flex-shrink:0}
.cc98-link-btn:hover{text-decoration:underline}

/* ============ 进度条（填充式） ============ */
.cc98-progress{margin-bottom:14px}
.cc98-progress-head{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--cc98-txt2);margin-bottom:6px}
.cc98-progress-stage{font-weight:500}
.cc98-progress-pct{font-variant-numeric:tabular-nums}
.cc98-progress-track{width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}
.cc98-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:4px;transition:width 0.3s ease}
.cc98-progress-chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
.cc98-chip{font-size:11px;padding:3px 10px;border-radius:12px;background:#f3f4f6;color:#9ca3af;transition:all 0.2s}
.cc98-chip.done{background:#d1fae5;color:#065f46}
.cc98-chip.active{background:#dbeafe;color:#1d4ed8;font-weight:600}

/* ============ 结果：关键词 + Markdown + 来源 ============ */
.cc98-keywords{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:12px}
.cc98-keywords-label{font-size:12px;color:var(--cc98-txt2);font-weight:600}
.cc98-kw{background:#e0e7ff;color:#3730a3;font-size:11px;padding:2px 9px;border-radius:10px}
.cc98-summary{font-size:14px;line-height:1.7;color:var(--cc98-txt)}
.cc98-summary h2,.cc98-summary h3{margin-top:16px;margin-bottom:8px}
.cc98-summary h3{font-size:15px}
.cc98-summary p{margin:8px 0}
.cc98-summary ul,.cc98-summary ol{padding-left:20px}
.cc98-summary li{margin-bottom:4px}
.cc98-summary a{color:var(--cc98-pri);text-decoration:none}
.cc98-summary a:hover{text-decoration:underline}
.cc98-summary blockquote{border-left:3px solid var(--cc98-bd);padding-left:12px;color:var(--cc98-txt2);margin:8px 0}
.cc98-summary code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
.cc98-summary pre{background:#f3f4f6;padding:10px;border-radius:8px;overflow-x:auto;font-size:13px}
.cc98-summary-plain{white-space:pre-wrap;font-size:14px;line-height:1.7}
.cc98-sources{margin-top:16px;padding-top:12px;border-top:1px solid var(--cc98-bd)}
.cc98-sources-title{font-size:12px;font-weight:600;color:var(--cc98-txt2);margin-bottom:8px}
.cc98-src{display:flex;align-items:flex-start;gap:8px;padding:7px 0;text-decoration:none;border-radius:6px}
.cc98-src:hover{background:#f9fafb}
.cc98-src-idx{color:var(--cc98-pri);font-size:13px;font-weight:600;flex-shrink:0}
.cc98-src-body{display:flex;flex-direction:column;min-width:0}
.cc98-src-title{font-size:13px;color:var(--cc98-txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc98-src:hover .cc98-src-title{color:var(--cc98-pri)}
.cc98-src-meta{font-size:11px;color:var(--cc98-txt2);margin-top:1px}

/* ============ 空状态 / loading ============ */
.cc98-empty{text-align:center;padding:40px 20px;color:var(--cc98-txt2);font-size:14px}
.cc98-empty-icon{font-size:40px;margin-bottom:10px}
.cc98-empty-title{font-size:14px;font-weight:600;color:var(--cc98-txt)}
.cc98-empty-sub{font-size:12px;color:var(--cc98-txt2);margin-top:6px;line-height:1.6}
.cc98-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:30px;color:var(--cc98-txt2);font-size:14px}
.cc98-spin{width:20px;height:20px;border:2px solid var(--cc98-bd);border-top-color:var(--cc98-pri);border-radius:50%;animation:cc98-spin 0.6s linear infinite}
@keyframes cc98-spin{to{transform:rotate(360deg)}}

/* ============ 错误横幅 ============ */
.cc98-error{margin:10px 0;padding:12px 14px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:13px;color:#b91c1c}
.cc98-error-head{font-weight:600;margin-bottom:4px}
.cc98-error-hint{font-size:12px;color:#7f1d1d;line-height:1.5}
.cc98-error-detail{margin-top:8px;font-size:11px}
.cc98-error-detail summary{cursor:pointer;color:#7f1d1d}
.cc98-error-detail pre{margin:6px 0 0;padding:8px;background:#fff;border:1px solid #fecaca;border-radius:6px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto;color:#7f1d1d}

/* ============ toast ============ */
.cc98-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:99999;animation:cc98-tin 0.3s ease;max-width:80vw}
@keyframes cc98-tin{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ============ 订阅列表 ============ */
.cc98-sub{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;gap:8px}
.cc98-sub:last-child{border-bottom:none}
.cc98-sub .tn{font-size:14px;font-weight:500;color:var(--cc98-txt)}
.cc98-sub .tm{font-size:11px;color:var(--cc98-txt2);margin-top:2px}
.cc98-sub .del{background:none;border:1px solid #fca5a5;color:#ef4444;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;flex-shrink:0}
.cc98-sub .del:hover{background:#fef2f2}
.cc98-sub .pause{background:none;border:1px solid #fcd34d;color:#92400e;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;flex-shrink:0}
.cc98-sub.paused .tn{color:var(--cc98-txt2);text-decoration:line-through}

/* ============ 通知列表 ============ */
.cc98-notif{padding:10px 0;border-bottom:1px solid #f3f4f6}
.cc98-notif:last-child{border-bottom:none}
.cc98-notif .nt{font-size:13px;font-weight:500;color:var(--cc98-txt)}
.cc98-notif .nt a{color:var(--cc98-pri);text-decoration:none}
.cc98-notif .nt a:hover{text-decoration:underline}
.cc98-notif .nm{font-size:11px;color:var(--cc98-txt2);margin-top:3px;line-height:1.5}

/* ============ 登录 / 配额 / 渠道 ============ */
.cc98-login-hint{font-size:12px;color:var(--cc98-txt2);line-height:1.6;margin-bottom:12px}
.cc98-quota{display:inline-block;font-size:11px;padding:2px 10px;border-radius:12px;background:#f3f4f6;color:var(--cc98-txt2);margin-bottom:12px}
.cc98-quota.warn{background:#fef3c7;color:#92400e}
.cc98-channel{border:1px solid var(--cc98-bd);border-radius:10px;padding:12px;margin-bottom:12px}
.cc98-channel .ch-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.cc98-channel .ch-title{font-size:14px;font-weight:600;color:var(--cc98-txt)}
`;

let _injected = false;

export function injectStyles() {
  if (_injected) return;
  const style = document.createElement('style');
  style.id = 'cc98-ai-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
  _injected = true;
}
