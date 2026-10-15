// Visibility changes must never change compact mode, position, or task state.
function applyVisibility(win, mode) {
  if (win.isDestroyed()) return;
  if (mode === 'other') {
    if (win.isVisible()) win.hide();
    return;
  }
  if (mode === 'desktop' || mode === 'self') {
    // showInactive alone does not reliably undo Windows Show Desktop minimization.
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.showInactive();
  }
}
module.exports = {applyVisibility};
