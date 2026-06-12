// `WrWindow` itself is NOT exported. Windows are opened through
// `WrWindowManager.open(Component, config)` — one canonical path keeps
// the API surface small and predictable.
export { WR_WINDOW_DATA, WR_WINDOW_REF } from './tokens';
export { WrWindowManager } from './services/window-manager';
export { type WrWindowBeforeCloseHook, WrWindowRef } from './window-ref';
export { WrWindowTaskbar } from './window-taskbar';
export type {
  WrWindowChromeSize,
  WrWindowConfig,
  WrWindowOs,
  WrWindowPersistMode,
  WrWindowSize,
  WrWindowSnap,
  WrWindowState,
  WrWindowStorageConfig,
} from './interfaces';
