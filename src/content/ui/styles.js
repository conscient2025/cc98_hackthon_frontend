// ============================================================
// 全部 CSS（统一到实际使用的类名，避免漏样式）
//   配色取样 CC98 原站的青蓝色调，让插件看起来像论坛自带功能。
//   支持深色模式：prefers-color-scheme 自动切换，只换变量不换结构。
// ============================================================

const CSS = `
:root {
  /* 主色：CC98 青蓝。
     刻意拆成「文字色」和「填充色」两组：深色模式下文字需要浅青（浅字压深底），
     但按钮底色若也跟着变浅，按钮上的字就只能压成黑的——整片深色界面里格外扎眼。
     拆开后按钮在深色模式用中间调深青 + 浅字，全局不再出现黑字。 */
  --cc98-pri: #245d70;        /* 文字 / 链接 / 边框 / 激活态 */
  --cc98-pri-h: #1b4a5a;
  --cc98-pri-fill: #245d70;   /* 按钮 / 悬浮球 / 激活 chip 的底色 */
  --cc98-pri-fill-h: #1b4a5a;
  --cc98-pri-soft: #eef8fb;   /* 主色浅底（chip / hover） */
  --cc98-pri-bd: #b8d5de;     /* 主色浅边框 */
  --cc98-on-pri: #ffffff;     /* 填充色上的文字 */
  --cc98-toast-bg: #1f3038;
  --cc98-toast-tx: #f5fafc;

  /* 中性色 */
  --cc98-bg: #ffffff;
  --cc98-bg-sub: #f6fbfd;     /* 头部 / 分区底色 */
  /* 三级灰按对比度排档：14.0 / 6.5 / 4.6（都以分区底 bg-sub 为基准）。
     txt3 用在 11px 小字上，浅色下必须够暗，否则读不出来。 */
  --cc98-txt: #1a2b33;
  --cc98-txt2: #485e6a;
  --cc98-txt3: #5d7681;
  --cc98-bd: #dfeaef;
  --cc98-bd-soft: #edf4f7;

  /* 语义色 */
  --cc98-ok: #287046;
  --cc98-ok-bg: #eaf6ee;
  --cc98-warn: #7b3f00;
  --cc98-warn-bg: #fff4db;
  --cc98-err: #b42318;
  --cc98-err-bg: #fef4f3;
  --cc98-err-bd: #f3ccc7;

  /* 形状 */
  --cc98-sh: 0 10px 36px rgba(20, 50, 62, 0.14), 0 2px 8px rgba(20, 50, 62, 0.06);
  --cc98-sh-btn: 0 4px 14px rgba(36, 93, 112, 0.32);
  --cc98-rad: 14px;
  --cc98-rad-sm: 9px;
  --cc98-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --cc98-pri: #6fbdd6;        /* 文字保持浅青：浅字压深底 */
    --cc98-pri-h: #8ed0e5;
    --cc98-pri-fill: #2f7188;   /* 按钮改中间调深青，配浅字（5.12:1） */
    --cc98-pri-fill-h: #3a8299;
    --cc98-pri-soft: #162b34;
    --cc98-pri-bd: #2d4c58;
    --cc98-on-pri: #f0f9fc;     /* 不再是近黑色 */
    --cc98-toast-bg: #2a3f49;
    --cc98-toast-tx: #f5fafc;

    --cc98-bg: #101a1f;
    --cc98-bg-sub: #16242b;
    --cc98-txt: #e6eef2;
    --cc98-txt2: #9fb3bd;
    --cc98-txt3: #7d939e;
    --cc98-bd: #25383f;
    --cc98-bd-soft: #1c2c33;

    --cc98-ok: #6cc48c;
    --cc98-ok-bg: #142a1e;
    --cc98-warn: #e8bf7a;
    --cc98-warn-bg: #2c2113;
    --cc98-err: #f2938a;
    --cc98-err-bg: #2a1614;
    --cc98-err-bd: #4a2521;

    --cc98-sh: 0 10px 40px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
    --cc98-sh-btn: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
}

/* ============ 悬浮按钮 ============ */
#cc98-ai-float-btn{position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:50%;background:var(--cc98-pri-fill);color:var(--cc98-on-pri);border:none;cursor:pointer;z-index:99990;box-shadow:var(--cc98-sh-btn);display:flex;align-items:center;justify-content:center;transition:transform .18s ease,box-shadow .18s ease,background .18s ease;padding:0}
#cc98-ai-float-btn:hover{background:var(--cc98-pri-fill-h);transform:translateY(-2px);box-shadow:0 8px 22px rgba(36,93,112,.42)}
#cc98-ai-float-btn:active{transform:translateY(0)}
#cc98-ai-float-btn .cc98-fb-icon{display:flex;align-items:center;justify-content:center;width:22px;height:22px;line-height:1}
#cc98-ai-float-btn .cc98-fb-icon svg{width:22px;height:22px;display:block}
#cc98-ai-float-btn .cc98-fb-badge{position:absolute;top:-2px;right:-2px;background:#e5484d;color:#fff;font-size:11px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px;font-weight:700;border:2px solid var(--cc98-bg);box-sizing:border-box;font-family:var(--cc98-font)}
#cc98-ai-float-btn .cc98-fb-badge[hidden]{display:none}
#cc98-ai-float-btn{touch-action:none;user-select:none;-webkit-user-select:none}
#cc98-ai-float-btn.dragging{transform:none!important;transition:none!important;cursor:grabbing}

/* ============ 侧边面板 ============ */
/* color-scheme 挂在面板上（不是 :root），只让面板内的原生控件——下拉列表、
   复选框、滚动条——跟着我们的配色走，同时不影响 CC98 网页本身。
   漏了它会出现「深色面板 + 白底下拉框 + 浅色文字」的白底白字。 */
#cc98-ai-panel{color-scheme:light;position:fixed;bottom:84px;right:24px;width:480px;max-width:94vw;max-height:640px;background:var(--cc98-bg);border-radius:var(--cc98-rad);box-shadow:var(--cc98-sh);z-index:99989;display:none;flex-direction:column;overflow:hidden;border:1px solid var(--cc98-bd);font-family:var(--cc98-font);color:var(--cc98-txt);line-height:1.5}
#cc98-ai-panel.open{display:flex}
#cc98-ai-panel *{box-sizing:border-box}
.cc98-panel-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:var(--cc98-bg-sub);border-bottom:1px solid var(--cc98-bd)}
.cc98-panel-title{font-size:14px;font-weight:650;color:var(--cc98-txt);letter-spacing:.2px}
.cc98-panel-close{background:none;border:none;color:var(--cc98-txt2);font-size:14px;line-height:1;cursor:pointer;padding:5px 7px;border-radius:7px;transition:background .15s,color .15s}
.cc98-panel-close:hover{background:var(--cc98-pri-soft);color:var(--cc98-txt)}
.cc98-panel-tabs{display:flex;gap:2px;padding:0 10px;background:var(--cc98-bg);border-bottom:1px solid var(--cc98-bd)}
.cc98-tab{flex:1;padding:11px 0 9px;text-align:center;font-size:13px;font-weight:500;font-family:inherit;color:var(--cc98-txt2);cursor:pointer;border:none;background:none;position:relative;transition:color .15s}
.cc98-tab::after{content:'';position:absolute;left:12%;right:12%;bottom:-1px;height:2px;border-radius:2px 2px 0 0;background:transparent;transition:background .18s}
.cc98-tab:hover{color:var(--cc98-txt)}
.cc98-tab.active{color:var(--cc98-pri);font-weight:600}
.cc98-tab.active::after{background:var(--cc98-pri)}
.cc98-panel-body{flex:1;min-height:0;overflow-y:auto;padding:16px}
.cc98-panel-body::-webkit-scrollbar{width:8px}
.cc98-panel-body::-webkit-scrollbar-track{background:transparent}
.cc98-panel-body::-webkit-scrollbar-thumb{background:var(--cc98-bd);border-radius:4px;border:2px solid var(--cc98-bg)}
.cc98-panel-body::-webkit-scrollbar-thumb:hover{background:var(--cc98-txt3)}

/* ============ 面板右下角拖拽手柄 ============ */
.cc98-panel-resize{position:absolute;bottom:0;right:0;width:20px;height:20px;cursor:nwse-resize;z-index:20;touch-action:none;user-select:none}
.cc98-panel-resize::after{content:'';position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-right:2px solid var(--cc98-txt3);border-bottom:2px solid var(--cc98-txt3);border-radius:0 0 2px 0;opacity:.7;transition:opacity .15s}
.cc98-panel-resize:hover::after{opacity:1;border-color:var(--cc98-pri)}
#cc98-ai-panel.resizing{user-select:none}

/* ============ 表单 ============ */
.cc98-form-row{display:flex;gap:8px;margin-bottom:14px}
.cc98-input{flex:1;box-sizing:border-box;padding:10px 13px;border:1px solid var(--cc98-bd);border-radius:var(--cc98-rad-sm);font-size:13px;font-family:inherit;color:var(--cc98-txt);outline:none;background:var(--cc98-bg);min-width:0;transition:border-color .15s,box-shadow .15s}
.cc98-input::placeholder{color:var(--cc98-txt3)}
.cc98-input:hover{border-color:var(--cc98-pri-bd)}
.cc98-input:focus{border-color:var(--cc98-pri);box-shadow:0 0 0 3px color-mix(in srgb, var(--cc98-pri) 16%, transparent)}
.cc98-select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--cc98-bd);border-radius:var(--cc98-rad-sm);font-size:13px;font-family:inherit;color:var(--cc98-txt);outline:none;background:var(--cc98-bg);cursor:pointer;transition:border-color .15s}
.cc98-select:hover{border-color:var(--cc98-pri-bd)}
.cc98-select:focus{border-color:var(--cc98-pri);box-shadow:0 0 0 3px color-mix(in srgb, var(--cc98-pri) 16%, transparent)}
/* 下拉展开后的选项：显式给底色+字色，双保险，避免继承出白底白字 */
.cc98-select option{background:var(--cc98-bg);color:var(--cc98-txt)}
.cc98-range{flex:1;min-width:0;accent-color:var(--cc98-pri)}
.cc98-textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--cc98-bd);border-radius:var(--cc98-rad-sm);font-size:13px;font-family:inherit;color:var(--cc98-txt);outline:none;background:var(--cc98-bg);resize:vertical;min-height:56px;transition:border-color .15s}
.cc98-textarea:focus{border-color:var(--cc98-pri);box-shadow:0 0 0 3px color-mix(in srgb, var(--cc98-pri) 16%, transparent)}
.cc98-btn-primary,.cc98-primary,.cc98-secondary{border:none;border-radius:var(--cc98-rad-sm);padding:10px 15px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,transform .1s}
.cc98-btn-primary:active:not(:disabled),.cc98-primary:active:not(:disabled),.cc98-secondary:active:not(:disabled){transform:translateY(1px)}
.cc98-btn-primary,.cc98-primary{background:var(--cc98-pri-fill);color:var(--cc98-on-pri)}
.cc98-btn-primary:hover:not(:disabled),.cc98-primary:hover:not(:disabled){background:var(--cc98-pri-fill-h)}
.cc98-btn-primary:disabled,.cc98-primary:disabled,.cc98-secondary:disabled{opacity:.5;cursor:not-allowed}
.cc98-secondary{background:var(--cc98-bg);color:var(--cc98-txt);border:1px solid var(--cc98-bd)}
.cc98-secondary:hover:not(:disabled){background:var(--cc98-pri-soft);border-color:var(--cc98-pri-bd);color:var(--cc98-pri)}
.cc98-panel-actions{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.cc98-setting-field{margin-bottom:16px}
.cc98-setting-field label{display:block;font-size:11px;font-weight:650;color:var(--cc98-txt2);margin-bottom:6px;letter-spacing:.3px;text-transform:none}
.cc98-setting-inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cc98-setting-inline label{display:flex;align-items:center;gap:7px;color:var(--cc98-txt);font-size:13px;font-weight:500;margin:0;letter-spacing:0}
.cc98-setting-inline input[type=checkbox]{accent-color:var(--cc98-pri);width:15px;height:15px;cursor:pointer}
.cc98-setting-help{font-size:12px;line-height:1.65;color:var(--cc98-txt2);background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd-soft);border-radius:var(--cc98-rad-sm);padding:10px 12px}

/* ============ 结果元信息（上次搜索 + 清空） ============ */
.cc98-result-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--cc98-txt3);margin-bottom:12px;padding-bottom:9px;border-bottom:1px solid var(--cc98-bd-soft)}
.cc98-result-meta[hidden]{display:none}
.cc98-link-btn{background:none;border:none;color:var(--cc98-pri);font-size:11px;font-family:inherit;cursor:pointer;padding:3px 6px;border-radius:5px;flex-shrink:0;transition:background .15s}
.cc98-link-btn:hover{background:var(--cc98-pri-soft)}

/* ============ 进度条（填充式） ============ */
.cc98-progress{margin-bottom:16px;padding:14px;background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd-soft);border-radius:var(--cc98-rad-sm)}
.cc98-progress-head{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--cc98-txt2);margin-bottom:8px}
.cc98-progress-stage{font-weight:600;color:var(--cc98-txt)}
.cc98-progress-pct{font-variant-numeric:tabular-nums;color:var(--cc98-pri);font-weight:650}
.cc98-progress-track{width:100%;height:6px;background:var(--cc98-bd);border-radius:3px;overflow:hidden}
.cc98-progress-fill{height:100%;width:0%;background:var(--cc98-pri);border-radius:3px;transition:width .35s ease}
.cc98-progress-chips{margin-top:10px;display:flex;flex-wrap:wrap;gap:5px}
.cc98-chip{font-size:11px;padding:3px 9px;border-radius:11px;background:var(--cc98-bg);color:var(--cc98-txt3);border:1px solid var(--cc98-bd);transition:all .2s}
.cc98-chip.done{background:var(--cc98-ok-bg);color:var(--cc98-ok);border-color:transparent}
.cc98-chip.active{background:var(--cc98-pri-fill);color:var(--cc98-on-pri);border-color:transparent;font-weight:600}

/* ============ 结果：关键词 + Markdown + 来源 ============ */
.cc98-keywords{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:14px}
.cc98-keywords-label{font-size:11px;color:var(--cc98-txt3);font-weight:650;letter-spacing:.3px;margin-right:2px}
.cc98-kw{background:var(--cc98-pri-soft);color:var(--cc98-pri);font-size:11px;padding:3px 9px;border-radius:11px;border:1px solid var(--cc98-pri-bd);font-weight:500}
/* ---- Markdown 正文 ----
   注意两件事，缺一个都会在深色模式下出现「黑字压深底」：

   1) 每个承载文字的标签都必须【显式】写 color，不能指望从 .cc98-summary 继承。
      继承只在「元素自身没有任何规则命中」时才生效；而这个面板是注入进 CC98
      页面的，CC98 自己的样式表里有 h2{color:…}、p{color:…} 这类标签选择器，
      会直接命中我们的元素——直接命中永远赢过继承。

   2) 选择器必须带 #cc98-ai-panel 前缀。只写 .cc98-summary h2 的优先级是
      (0,1,1)，CC98 若有 .article h2 (0,2,1) 或 #app h2 (1,0,1) 就会反超。
      加上 ID 前缀变成 (1,1,1)，站方除非也用 ID 规则否则赢不过。 */
#cc98-ai-panel .cc98-summary,
#cc98-ai-panel .cc98-summary h1,
#cc98-ai-panel .cc98-summary h2,
#cc98-ai-panel .cc98-summary h4,
#cc98-ai-panel .cc98-summary h5,
#cc98-ai-panel .cc98-summary h6,
#cc98-ai-panel .cc98-summary p,
#cc98-ai-panel .cc98-summary ul,
#cc98-ai-panel .cc98-summary ol,
#cc98-ai-panel .cc98-summary li,
#cc98-ai-panel .cc98-summary strong,
#cc98-ai-panel .cc98-summary b,
#cc98-ai-panel .cc98-summary em,
#cc98-ai-panel .cc98-summary i,
#cc98-ai-panel .cc98-summary del,
#cc98-ai-panel .cc98-summary code,
#cc98-ai-panel .cc98-summary pre,
#cc98-ai-panel .cc98-summary table,
#cc98-ai-panel .cc98-summary th,
#cc98-ai-panel .cc98-summary td,
#cc98-ai-panel .cc98-summary-plain{color:var(--cc98-txt)}

#cc98-ai-panel .cc98-summary{font-size:14px;line-height:1.75}
#cc98-ai-panel .cc98-summary h1,
#cc98-ai-panel .cc98-summary h2,
#cc98-ai-panel .cc98-summary h3,
#cc98-ai-panel .cc98-summary h4,
#cc98-ai-panel .cc98-summary h5,
#cc98-ai-panel .cc98-summary h6{margin:18px 0 8px;font-weight:650;line-height:1.4}
#cc98-ai-panel .cc98-summary h1{font-size:16px}
#cc98-ai-panel .cc98-summary h2{font-size:15px}
#cc98-ai-panel .cc98-summary h3{font-size:14px;color:var(--cc98-pri)}
#cc98-ai-panel .cc98-summary h4,
#cc98-ai-panel .cc98-summary h5,
#cc98-ai-panel .cc98-summary h6{font-size:13px}
#cc98-ai-panel .cc98-summary>:first-child{margin-top:0}
#cc98-ai-panel .cc98-summary p{margin:9px 0}
#cc98-ai-panel .cc98-summary ul,
#cc98-ai-panel .cc98-summary ol{padding-left:20px;margin:9px 0}
#cc98-ai-panel .cc98-summary li{margin-bottom:5px}
#cc98-ai-panel .cc98-summary strong,
#cc98-ai-panel .cc98-summary b{font-weight:650}
#cc98-ai-panel .cc98-summary del{color:var(--cc98-txt3);text-decoration:line-through}
#cc98-ai-panel .cc98-summary a{color:var(--cc98-pri);text-decoration:none;border-bottom:1px solid var(--cc98-pri-bd)}
#cc98-ai-panel .cc98-summary a:hover{border-bottom-color:var(--cc98-pri)}
#cc98-ai-panel .cc98-summary blockquote{border-left:3px solid var(--cc98-pri-bd);padding:2px 0 2px 12px;color:var(--cc98-txt2);margin:10px 0}
#cc98-ai-panel .cc98-summary code{background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd-soft);padding:1px 5px;border-radius:5px;font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#cc98-ai-panel .cc98-summary pre{background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd-soft);padding:11px 13px;border-radius:var(--cc98-rad-sm);overflow-x:auto;font-size:12.5px;line-height:1.6}
#cc98-ai-panel .cc98-summary pre code{background:none;border:none;padding:0}
#cc98-ai-panel .cc98-summary hr{border:none;border-top:1px solid var(--cc98-bd);margin:16px 0}
#cc98-ai-panel .cc98-summary img{max-width:100%;height:auto;border-radius:7px}
/* 表格：LLM 总结里很常见，之前完全没写样式，会整块继承 CC98 的表格外观 */
#cc98-ai-panel .cc98-summary table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;background:none}
#cc98-ai-panel .cc98-summary th,
#cc98-ai-panel .cc98-summary td{border:1px solid var(--cc98-bd);padding:7px 10px;text-align:left;background:none}
#cc98-ai-panel .cc98-summary th{background:var(--cc98-bg-sub);font-weight:650}
#cc98-ai-panel .cc98-summary-plain{white-space:pre-wrap;font-size:14px;line-height:1.75}
.cc98-sources{margin-top:18px;padding-top:14px;border-top:1px solid var(--cc98-bd)}
.cc98-sources-title{font-size:11px;font-weight:650;color:var(--cc98-txt3);margin-bottom:8px;letter-spacing:.3px}
.cc98-src{display:flex;align-items:flex-start;gap:9px;padding:8px 9px;margin:0 -9px;text-decoration:none;border-radius:var(--cc98-rad-sm);transition:background .15s}
.cc98-src:hover{background:var(--cc98-pri-soft)}
.cc98-src-idx{color:var(--cc98-pri);font-size:12px;font-weight:650;flex-shrink:0;font-variant-numeric:tabular-nums;padding-top:1px}
.cc98-src-body{display:flex;flex-direction:column;min-width:0}
.cc98-src-title{font-size:13px;color:var(--cc98-txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.cc98-src:hover .cc98-src-title{color:var(--cc98-pri)}
.cc98-src-meta{font-size:11px;color:var(--cc98-txt3);margin-top:2px}

/* ============ 空状态 / loading ============ */
.cc98-empty{text-align:center;padding:44px 20px;color:var(--cc98-txt2)}
.cc98-empty-icon{width:46px;height:46px;margin:0 auto 12px;border-radius:50%;background:var(--cc98-pri-soft);display:flex;align-items:center;justify-content:center;font-size:21px;line-height:1}
.cc98-empty-title{font-size:14px;font-weight:600;color:var(--cc98-txt)}
.cc98-empty-sub{font-size:12px;color:var(--cc98-txt2);margin-top:7px;line-height:1.65}
.cc98-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:34px;color:var(--cc98-txt2);font-size:13px}
.cc98-spin{width:18px;height:18px;border:2px solid var(--cc98-bd);border-top-color:var(--cc98-pri);border-radius:50%;animation:cc98-spin .6s linear infinite}
@keyframes cc98-spin{to{transform:rotate(360deg)}}

/* ============ 错误横幅 ============ */
.cc98-error{margin:10px 0;padding:12px 14px;border-radius:var(--cc98-rad-sm);background:var(--cc98-err-bg);border:1px solid var(--cc98-err-bd);font-size:13px;color:var(--cc98-err)}
.cc98-error-head{font-weight:650;margin-bottom:5px}
.cc98-error-hint{font-size:12px;opacity:.88;line-height:1.6}
.cc98-error-detail{margin-top:9px;font-size:11px}
.cc98-error-detail summary{cursor:pointer;opacity:.8}
.cc98-error-detail summary:hover{opacity:1}
.cc98-error-detail pre{margin:7px 0 0;padding:9px;background:var(--cc98-bg);border:1px solid var(--cc98-err-bd);border-radius:7px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto;line-height:1.5}

/* ============ toast ============ */
/* toast 不做「反色」：深色模式下反色会变成浅底黑字，和整体割裂。
   两种模式都用深底浅字，只是深色模式下底色抬亮一档以便和面板区分。 */
.cc98-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--cc98-toast-bg);color:var(--cc98-toast-tx);padding:11px 22px;border-radius:10px;font-size:13px;font-weight:500;font-family:var(--cc98-font);z-index:99999;animation:cc98-tin .28s cubic-bezier(.2,.9,.3,1);max-width:80vw;box-shadow:0 8px 28px rgba(0,0,0,.22)}
@keyframes cc98-tin{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ============ 订阅列表 ============ */
.cc98-sub{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--cc98-bd-soft);gap:9px}
.cc98-sub:last-child{border-bottom:none}
.cc98-sub .tn{font-size:14px;font-weight:550;color:var(--cc98-txt)}
.cc98-sub .tm{font-size:11px;color:var(--cc98-txt3);margin-top:3px;line-height:1.5}
.cc98-sub .del,.cc98-sub .pause{background:var(--cc98-bg);padding:5px 11px;border-radius:7px;cursor:pointer;font-size:12px;font-family:inherit;flex-shrink:0;transition:background .15s}
.cc98-sub .del{border:1px solid var(--cc98-err-bd);color:var(--cc98-err)}
.cc98-sub .del:hover{background:var(--cc98-err-bg)}
.cc98-sub .pause{border:1px solid var(--cc98-bd);color:var(--cc98-txt2)}
.cc98-sub .pause:hover{background:var(--cc98-pri-soft);border-color:var(--cc98-pri-bd);color:var(--cc98-pri)}
.cc98-sub.paused .tn{color:var(--cc98-txt3);text-decoration:line-through}

/* ============ 通知列表 ============ */
.cc98-notif{padding:11px 0;border-bottom:1px solid var(--cc98-bd-soft)}
.cc98-notif:last-child{border-bottom:none}
.cc98-notif .nt{font-size:13px;font-weight:550;color:var(--cc98-txt);line-height:1.55}
.cc98-notif .nt a{color:var(--cc98-pri);text-decoration:none}
.cc98-notif .nt a:hover{text-decoration:underline}
.cc98-notif .nm{font-size:11px;color:var(--cc98-txt3);margin-top:4px;line-height:1.55}
.cc98-notif.unread{background:var(--cc98-pri-soft);margin:0 -16px;padding:11px 16px 11px 13px;border-left:3px solid var(--cc98-pri)}

/* ============ 登录 / 配额 / 渠道 ============ */
.cc98-login-hint{font-size:12px;color:var(--cc98-txt2);line-height:1.7;margin-bottom:14px;padding:11px 12px;background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd-soft);border-radius:var(--cc98-rad-sm)}
.cc98-quota{display:inline-block;font-size:11px;padding:3px 10px;border-radius:11px;background:var(--cc98-bg-sub);border:1px solid var(--cc98-bd);color:var(--cc98-txt2);margin-bottom:14px;font-weight:500}
.cc98-quota.warn{background:var(--cc98-warn-bg);color:var(--cc98-warn);border-color:transparent}
.cc98-channel{border:1px solid var(--cc98-bd);border-radius:var(--cc98-rad-sm);padding:13px;margin-bottom:12px;background:var(--cc98-bg)}
.cc98-channel .ch-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
.cc98-channel .ch-title{font-size:13px;font-weight:650;color:var(--cc98-txt)}

/* ============ 防站方样式污染：文字色兜底 ============
   面板注入在 CC98 页面里，共享同一份层叠上下文。上面那些 .cc98-xxx 规则
   优先级只有 (0,1,0)，CC98 若有 .article input{color:…} 这类 (0,1,1) 规则就会
   反超，于是深色面板上冒出黑字——这正是 Markdown 标题出问题的同一个原因。

   这里把每个承载文字的元素用 #cc98-ai-panel 前缀（ID 级，(1,1,0) 起）重新钉一遍。
   放在样式表末尾，既压得住站方的 class 规则，也覆盖前面同名的低优先级声明。

   彻底的解法是把面板放进 Shadow DOM 做样式隔离，但那要改所有 querySelector，
   属于重构；当前这套兜底已经能挡住 ID 级以下的所有站方规则。 */
#cc98-ai-panel .cc98-panel-title,
#cc98-ai-panel .cc98-tab:hover,
#cc98-ai-panel .cc98-input,
#cc98-ai-panel .cc98-select,
#cc98-ai-panel .cc98-textarea,
#cc98-ai-panel .cc98-secondary,
#cc98-ai-panel .cc98-setting-inline label,
#cc98-ai-panel .cc98-progress-stage,
#cc98-ai-panel .cc98-src,
#cc98-ai-panel .cc98-src-title,
#cc98-ai-panel .cc98-empty-title,
#cc98-ai-panel .cc98-sub .tn,
#cc98-ai-panel .cc98-notif .nt,
#cc98-ai-panel .cc98-channel .ch-title{color:var(--cc98-txt)}

#cc98-ai-panel .cc98-panel-close,
#cc98-ai-panel .cc98-tab,
#cc98-ai-panel .cc98-setting-field label,
#cc98-ai-panel .cc98-setting-help,
#cc98-ai-panel .cc98-empty,
#cc98-ai-panel .cc98-empty-sub,
#cc98-ai-panel .cc98-loading,
#cc98-ai-panel .cc98-login-hint,
#cc98-ai-panel .cc98-quota,
#cc98-ai-panel .cc98-sub .pause{color:var(--cc98-txt2)}

#cc98-ai-panel .cc98-chip,
#cc98-ai-panel .cc98-keywords-label,
#cc98-ai-panel .cc98-src-meta,
#cc98-ai-panel .cc98-sources-title,
#cc98-ai-panel .cc98-result-meta,
#cc98-ai-panel .cc98-sub .tm,
#cc98-ai-panel .cc98-sub.paused .tn,
#cc98-ai-panel .cc98-notif .nm{color:var(--cc98-txt3)}

#cc98-ai-panel .cc98-tab.active,
#cc98-ai-panel .cc98-link-btn,
#cc98-ai-panel .cc98-progress-pct,
#cc98-ai-panel .cc98-kw,
#cc98-ai-panel .cc98-src-idx,
#cc98-ai-panel .cc98-src:hover .cc98-src-title,
#cc98-ai-panel .cc98-notif .nt a,
#cc98-ai-panel .cc98-secondary:hover:not(:disabled){color:var(--cc98-pri)}

#cc98-ai-panel .cc98-btn-primary,
#cc98-ai-panel .cc98-primary,
#cc98-ai-panel .cc98-chip.active{color:var(--cc98-on-pri)}

#cc98-ai-panel .cc98-chip.done{color:var(--cc98-ok)}
#cc98-ai-panel .cc98-quota.warn{color:var(--cc98-warn)}
#cc98-ai-panel .cc98-error,
#cc98-ai-panel .cc98-error-detail summary,
#cc98-ai-panel .cc98-error-detail pre,
#cc98-ai-panel .cc98-sub .del{color:var(--cc98-err)}

/* 输入框背景也要钉：站方给 input 设了浅底会和我们的浅字撞成白底白字 */
#cc98-ai-panel .cc98-input,
#cc98-ai-panel .cc98-select,
#cc98-ai-panel .cc98-textarea{background:var(--cc98-bg)}
#cc98-ai-panel .cc98-input::placeholder{color:var(--cc98-txt3)}

/* ============ 深色模式下的原生控件 ============
   必须放在整个样式表最末尾：这条和上面 #cc98-ai-panel 的 color-scheme:light
   选择器优先级相同（同为 ID），媒体查询不加权重，所以只能靠「后者覆盖前者」生效。
   写在前面会被后面的 light 覆盖掉，下拉列表就还是白底白字。 */
@media (prefers-color-scheme: dark) {
  #cc98-ai-panel { color-scheme: dark }
}
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
