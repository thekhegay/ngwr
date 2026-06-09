/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrWindowChromeSize } from './window-chrome-size';
import type { WrWindowOs } from './window-os';
import type { WrWindowSize } from './window-size';
import type { WrWindowSnap } from './window-snap';

/** Which engine `WrStorage` should target for window persistence. */
export type WrWindowStorageEngine = 'session' | 'local';

/** What slice of geometry the storage layer should keep in sync. */
export type WrWindowPersistMode = 'position' | 'size' | 'all';

/** Persistence configuration — drop into `WrWindowConfig.storage`. */
export interface WrWindowStorageConfig {
  /**
   * Storage key for this window. Combined with `prefix` (if any) and a
   * `wr:window:` namespace, e.g. `wr:window:my-app:editor`.
   */
  readonly key: string;
  /** Namespace prefix (typically your app id). @default '' */
  readonly prefix?: string;
  /** What to persist. @default 'all' */
  readonly persist?: WrWindowPersistMode;
  /** Which storage engine. @default 'local' */
  readonly engine?: WrWindowStorageEngine;
}

/**
 * Options accepted by `WrWindowManager.open(component, config)`.
 *
 * Every property has a sensible default — pass `{}` to open a window
 * with the standard chrome at the cascaded position.
 */
export interface WrWindowConfig<D = unknown> {
  /** Stable identifier — used by the taskbar, workspace save, and DI. */
  readonly id?: string;

  // ── Chrome ──
  readonly title?: string;
  readonly os?: WrWindowOs;
  /** Initial size preset. Ignored when `width` / `height` are passed. */
  readonly size?: WrWindowSize;
  /** Title-bar density. @default 'normal' */
  readonly chromeSize?: WrWindowChromeSize;

  // ── Initial geometry (pixels) ──
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  // ── Behaviour ──
  readonly movable?: boolean;
  readonly resizable?: boolean;
  readonly keepInViewport?: boolean;
  readonly closeOnEscape?: boolean;
  /** Snap-on-drag mode. @default 'none' */
  readonly snap?: WrWindowSnap;

  // ── Chrome actions ──
  readonly showMinimize?: boolean;
  readonly showMaximize?: boolean;
  readonly showClose?: boolean;

  // ── Modal ──
  /** Render with a backdrop, trap focus, restore focus on close. @default false */
  readonly modal?: boolean;
  readonly closeOnBackdrop?: boolean;

  // ── Taskbar ──
  /** Show in `<wr-window-taskbar>` when minimized. @default true */
  readonly taskbar?: boolean;

  // ── Animations ──
  readonly animations?: boolean;

  // ── Drag scope ──
  /** CSS selector inside the projected content that restricts the move-grab area. */
  readonly dragHandle?: string;

  // ── Persistence ──
  readonly storage?: WrWindowStorageConfig;

  // ── Payload for the projected component (`WR_WINDOW_DATA` token) ──
  readonly data?: D;
}
