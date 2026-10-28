/** Hook signature for `WrWindowRef.beforeClose()`. Return falsy to veto. */
type WrWindowBeforeCloseHook<R> = (result: R | undefined) => boolean | Promise<boolean>;

export type { WrWindowBounds, WrWindowInsets } from './window-bounds';
export type { WrWindowChromeSize } from './window-chrome-size';
export type { WrWindowConfig, WrWindowPersistMode, WrWindowStorageConfig } from './window-config';
export type { WrWindowDefaults } from './window-defaults';
export type { WrWindowLayoutSnapshot } from './window-layout-snapshot';
export type { WrWindowOs, WrWindowResolvedOs } from './window-os';
export type { WrWindowSize } from './window-size';
export type { WrWindowSlotContent, WrWindowSlotContext } from './window-slot';
export type { WrWindowSnap, WrWindowSnapTarget } from './window-snap';
export type { WrWindowState } from './window-state';
export type { WrWindowTaskbarShow } from './window-taskbar-show';
export type { WrWindowUpdate } from './window-update';
export type { WrWindowBeforeCloseHook };
