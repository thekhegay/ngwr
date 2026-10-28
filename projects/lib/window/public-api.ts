// `WrWindow` itself is NOT exported. Windows are opened through
// `WrWindowManager.open(Component, config)` — one canonical path keeps
// the API surface small and predictable.
export { WR_WINDOW_DATA, WR_WINDOW_REF } from './tokens';
export { WrWindowManager } from './services/window-manager';
export { type WrWindowBeforeCloseHook, WrWindowRef } from './window-ref';
export { WrWindowTaskbar } from './window-taskbar';
export { withWindows } from './with-windows';
export type {
  WrWindowBounds,
  WrWindowChromeSize,
  WrWindowConfig,
  WrWindowDefaults,
  WrWindowInsets,
  WrWindowLayoutSnapshot,
  WrWindowOs,
  WrWindowPersistMode,
  WrWindowSize,
  WrWindowSlotContent,
  WrWindowSlotContext,
  WrWindowSnap,
  WrWindowSnapTarget,
  WrWindowState,
  WrWindowStorageConfig,
  WrWindowTaskbarShow,
  WrWindowUpdate,
} from './types';
