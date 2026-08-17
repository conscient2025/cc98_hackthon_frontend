// ============================================================
// 右下角悬浮按钮 + 未读通知红点徽章
//   支持拖动：位置存 chrome.storage.local，刷新 / 重新挂载后仍保留
// ============================================================

const BTN_ID = 'cc98-ai-float-btn';
const BADGE_ID = 'cc98-ai-badge';
const POS_KEY = 'floatBtnPos';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 读回上次拖到的位置（fire-and-forget；没存过就保持默认右下角）
function applySavedPosition(btn) {
  try {
    chrome.storage.local.get(POS_KEY).then((obj) => {
      const pos = obj && obj[POS_KEY];
      if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
      const w = btn.offsetWidth || 52;
      const h = btn.offsetHeight || 52;
      btn.style.left = clamp(pos.left, 0, window.innerWidth - w) + 'px';
      btn.style.top = clamp(pos.top, 0, window.innerHeight - h) + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }).catch(() => {});
  } catch (e) { /* 静默 */ }
}

// 拖动：移动 >5px 判定为「拖动」并吞掉这次 click；位置夹在视口内
function makeDraggable(btn, onClick) {
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  let moved = false;

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    delete btn.dataset.dragged;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    btn.classList.add('dragging');        // 禁用 :hover 缩放，避免拖拽时跳动
    const rect = btn.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    btn.style.left = startLeft + 'px';
    btn.style.top = startTop + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  });

  btn.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    const w = btn.offsetWidth || 52;
    const h = btn.offsetHeight || 52;
    btn.style.left = clamp(startLeft + dx, 0, window.innerWidth - w) + 'px';
    btn.style.top = clamp(startTop + dy, 0, window.innerHeight - h) + 'px';
    window.dispatchEvent(new CustomEvent('cc98-fb-moved'));
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove('dragging');
    try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
    if (moved) {
      const rect = btn.getBoundingClientRect();
      try {
        chrome.storage.local.set({ [POS_KEY]: { left: rect.left, top: rect.top } }).catch(() => {});
      } catch (_) {}
      btn.dataset.dragged = '1';           // 拖过了，等 click 时吞掉
    }
  }
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);

  btn.addEventListener('click', (e) => {
    if (btn.dataset.dragged === '1') {
      delete btn.dataset.dragged;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    onClick && onClick();
  });
}

export function createFloatingBtn({ onClick }) {
  const existing = document.getElementById(BTN_ID);
  if (existing) return existing;

  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.title = 'CC98 AI+（可拖动）';
  btn.innerHTML = `
    <span class="cc98-fb-icon">🤖</span>
    <span id="${BADGE_ID}" class="cc98-fb-badge" hidden>0</span>`;
  document.body.appendChild(btn);

  makeDraggable(btn, onClick);
  applySavedPosition(btn);
  return btn;
}

// 更新红点数字（count=0 隐藏）
export function updateBadge(count) {
  const b = document.getElementById(BADGE_ID);
  if (!b) return;
  if (!count || count <= 0) {
    b.hidden = true;
    return;
  }
  b.hidden = false;
  b.textContent = count > 99 ? '99+' : String(count);
}

export function isFloatingBtnAlive() {
  return !!document.getElementById(BTN_ID);
}
