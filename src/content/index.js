// ============================================================
// 内容脚本入口（MV3 内容脚本不支持静态 import，用动态 import 加载）
// 真正的逻辑在 src/content/main.js（ES module）
// ============================================================
console.log('[CC98 AI+] 内容脚本已注入：', location.href);

(async function () {
  try {
    await import(chrome.runtime.getURL('src/content/main.js'));
  } catch (err) {
    console.error('[CC98 AI+] 内容脚本加载失败：', err);
  }
})();
