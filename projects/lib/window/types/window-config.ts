/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

import type { WrWindowBounds } from './window-bounds';
import type { WrWindowChromeSize } from './window-chrome-size';
import type { WrWindowOs } from './window-os';
import type { WrWindowSize } from './window-size';
import type { WrWindowSlotContent } from './window-slot';
import type { WrWindowSnap } from './window-snap';

/** What slice of geometry the storage layer should keep in sync. */
export type WrWindowPersistMode = 'position' | 'size' | 'all';

/**
 * Persistence configuration — drop into `WrWindowConfig.storage`.
 *
 * Reads and writes happen through the consumer's `WrStorage` instance.
 * Swap the underlying engine at bootstrap with
 * `provideWr(withStorage({ engine: window.sessionStorage }))` when you want
 * session-scoped persistence instead of the default `localStorage`.
 */
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
}

/**
 * Options accepted by `WrWindowManager.open(component, config)`.
 *
 * Every property has a sensible default — pass `{}` to open a window
 * with the standard chrome at the cascaded position.
 */
export interface WrWindowConfig<D = unknown> {
  /**
   * Stable identifier — used by the taskbar, workspace save, and DI. A second
   * `open()` with an id that is already open brings that window back instead of
   * opening another. Generated when omitted.
   */
  readonly id?: string;

  // Chrome
  /**
   * Title-bar text, and the window's accessible name. A window without one is
   * named by the catalog's "Untitled", in the title bar and in the taskbar.
   * @default ''
   */
  readonly title?: string;
  /** Chrome style: `'auto'` follows the visitor's platform. @default 'auto' */
  readonly os?: WrWindowOs;
  /** Initial size preset. Ignored when `width` / `height` are passed. @default 'md' */
  readonly size?: WrWindowSize;
  /** Title-bar density. @default 'md' */
  readonly chromeSize?: WrWindowChromeSize;

  // Initial geometry (pixels)
  /** Opening left edge, in viewport pixels. Omit to cascade from the work area's start edge. */
  readonly x?: number;
  /** Opening top edge, in viewport pixels. Omit to cascade. */
  readonly y?: number;
  /** Opening width in pixels, over the `size` preset. Capped at the work area while `keepInViewport`. */
  readonly width?: number;
  /** Opening height in pixels, over the `size` preset. Capped at the work area while `keepInViewport`. */
  readonly height?: number;
  /** Narrowest the window may be dragged, snapped or opened. @default 220 */
  readonly minWidth?: number;
  /** Shortest the window may be dragged, snapped or opened. @default 140 */
  readonly minHeight?: number;
  /** Widest the window may be dragged, snapped, maximized or opened. @default Infinity */
  readonly maxWidth?: number;
  /** Tallest the window may be dragged, snapped, maximized or opened. @default Infinity */
  readonly maxHeight?: number;

  // Behaviour
  /** Allow moving the window, by the title bar or from the keyboard. @default true */
  readonly movable?: boolean;
  /** Allow resizing the window, by its edges or from the keyboard. @default true */
  readonly resizable?: boolean;
  /**
   * Keep enough of the window inside the work area to grab it again, and open
   * it wholly inside when it fits. `false` lets it go anywhere. @default true
   */
  readonly keepInViewport?: boolean;
  /**
   * The rectangle maximize, snapping, `keepInViewport` and the cascade keep the
   * window inside. Falls back to `withWindows({ bounds })`, then the viewport.
   * @default 'viewport'
   */
  readonly bounds?: WrWindowBounds;
  /**
   * Close on Escape — when focus is inside the window, or when focus is on
   * nothing and this is the active window. @default true
   */
  readonly closeOnEscape?: boolean;
  /**
   * Move focus into the window when it opens (since v15): to the element
   * marked `cdkFocusInitial`, else the first control in its body, else the
   * window itself. Closing it sends focus back to where it was when `open()`
   * was called, if that element is still on the page.
   *
   * `false` leaves focus where it is — for a window opened in the background,
   * or one that opens without a user asking for it. Windows that
   * `restoreLayout()` re-opens default to `false`, so putting a workspace back
   * does not walk focus through every window in it; pass `true` from the
   * opener callback to override.
   * @default true
   */
  readonly autoFocus?: boolean;
  /** Snap-on-drag mode. @default 'none' */
  readonly snap?: WrWindowSnap;
  /**
   * Dragging the title bar of a maximized or snapped window restores its own
   * size under the pointer, as desktop window managers do. `false` keeps a
   * maximized window still and moves a snapped one at its snapped size.
   * @default true
   */
  readonly restoreOnDrag?: boolean;
  /**
   * Keyboard move and resize: Alt+F7 moves the window and Alt+F8 resizes it
   * with the arrow keys, Enter keeps the result and Escape puts it back. The
   * same modes start from `WrWindowRef.startMove()` / `startResize()`.
   * @default true
   */
  readonly keyboard?: boolean;
  /** Pixels per arrow key in keyboard move and resize; Shift steps 1px. @default 10 */
  readonly keyboardStep?: number;

  // Chrome actions
  /**
   * Show the minimize control. Omit to follow the chrome: every OS but Linux
   * shows it, and the Linux chrome is close-only by convention. Pass `true` to
   * show it there, which is what puts a Linux window within reach of
   * `<wr-window-taskbar>`. A minimized window is hidden until something brings
   * it back, so a page that offers minimize also needs the taskbar or a dock of
   * its own over `WrWindowManager.minimized()`.
   */
  readonly showMinimize?: boolean;
  /** Show the maximize control. Omit to follow the chrome: every OS but Linux shows it. */
  readonly showMaximize?: boolean;
  /** Show the close control. Every chrome closes, so this is not per-OS. @default true */
  readonly showClose?: boolean;

  // Slots
  /**
   * Content for the title bar, between the title and the buttons — a badge, a
   * menu button. A template receives the ref as `$implicit`.
   */
  readonly titleExtra?: WrWindowSlotContent;
  /** Content for a status bar under the body. A template receives the ref as `$implicit`. */
  readonly statusBar?: WrWindowSlotContent;

  // Taskbar
  /** List the window in `<wr-window-taskbar>`. @default true */
  readonly taskbar?: boolean;

  // Animations
  /**
   * The window's own open animation and transitions. Off under
   * `prefers-reduced-motion`; the body's own animations are never touched.
   * @default true
   */
  readonly animations?: boolean;

  // Drag scope
  /**
   * CSS selector for the parts of the window that start a move. Matched in the
   * body as well as the title bar, and replaces the title bar as the grab area —
   * include `.wr-window__chrome` to keep it. A double-click on a match maximizes,
   * as one on the title bar always does. Buttons, fields and links inside a match
   * never start a drag. Give a body handle `touch-action: none` so a touch drag
   * moves the window instead of scrolling the page.
   */
  readonly dragHandle?: string;

  // Persistence
  /** Save the geometry to `WrStorage` as it changes and open there next time. */
  readonly storage?: WrWindowStorageConfig;

  /**
   * Extra CSS classes for the window's overlay pane. The pane is only a mount
   * point — `<wr-window>` inside it positions itself `fixed` — so a rule for the
   * chrome reads `.my-class .wr-window`.
   */
  readonly panelClass?: WrClassInput;

  /** Payload for the body component, read with `inject(WR_WINDOW_DATA)`. */
  readonly data?: D;
}
