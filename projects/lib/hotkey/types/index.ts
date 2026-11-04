/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A keybinding specification — `'+'` separated tokens, case-insensitive.
 * Modifiers: `ctrl`, `alt`, `shift`, `meta`, `cmd` (alias for `meta`),
 * `mod` (auto: `cmd` on macOS, `ctrl` elsewhere). Last token is the key.
 *
 * Examples: `'ctrl+k'`, `'cmd+shift+p'`, `'escape'`, `'mod+/'`, `'ArrowDown'`.
 */
export type WrHotkeySpec = string;

/** Returned by {@link WrHotkey.bind} — call `.unbind()` to remove. */
export interface WrHotkeyHandle {
  readonly unbind: () => void;
}

/** Options accepted by {@link WrHotkey.bind}. */
export interface WrHotkeyOptions {
  /**
   * Scope the listener to a specific element instead of `document`. The
   * element must be focusable (or contain the focus) for the binding to
   * fire — usually combined with `tabindex="0"` on the host.
   */
  readonly element?: HTMLElement;

  /** Call `event.preventDefault()` when the binding matches. @default true */
  readonly preventDefault?: boolean;

  /**
   * Fire even when an input / textarea / contenteditable element has
   * focus. By default these are skipped so the user can type normally.
   * @default false
   */
  readonly allowInInput?: boolean;

  /**
   * Higher priority bindings fire first. Bindings sharing a key dispatch
   * in priority order; the lower-priority ones are skipped when the
   * handler calls `event.preventDefault()`. @default 0
   */
  readonly priority?: number;

  /** What the shortcut does, for a cheat sheet built from {@link WrHotkey.bindings}. */
  readonly label?: string;
}

/** One registered binding, as {@link WrHotkey.bindings} lists it. */
export interface WrHotkeyEntry {
  /** The chord as it was registered: `'mod+k'`. Print it with `wrFormatChord`. */
  readonly chord: WrHotkeySpec;
  /** The `label` the registration gave, or `null`. */
  readonly label: string | null;
}

/** What a chord is written for: `⌘K` on `'mac'`, `Ctrl+K` on `'other'`. */
export type WrHotkeyPlatform = 'mac' | 'other';
