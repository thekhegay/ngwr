/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, type Signal, computed, effect, inject, signal } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { WrStorage } from 'ngwr/storage';

import { WR_THEME_CONFIG, type WrResolvedTheme, type WrThemeMode } from '../wr-theme-config';

const VALID_MODES: readonly WrThemeMode[] = ['light', 'dark', 'auto'];

function isThemeMode(v: unknown): v is WrThemeMode {
  return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v);
}

/**
 * Light / dark theme manager.
 *
 * - `mode` is what the user picked (`light` | `dark` | `auto`).
 * - `resolved` is what is on screen — `auto` resolves through
 *   {@link WrPlatform.prefersDark}.
 * - Writes `color-scheme` inline on `<html>` for an explicit `light` or `dark`,
 *   and clears its own write for `auto`. A `color-scheme` the page wrote on
 *   `<html>` itself is left alone until the user picks a scheme.
 * - Persists the selected mode via {@link WrStorage} (defaults to
 *   `localStorage`; swap the storage engine globally to change where).
 *
 * The stylesheet does the theming, not this service. `ngwr/theme` declares
 * `color-scheme: light dark` on `:root` and every token that differs between
 * the schemes as a `light-dark()`, so a page follows the OS with no script at
 * all — which is why `auto` writes nothing and nothing has to provide this. An
 * inline `color-scheme` on `<html>` outranks the stylesheet's, so an explicit
 * choice is one property, and clearing it hands the page back to the OS.
 *
 * Root-provided, with no provider to call. Change the default mode or storage
 * key by providing {@link WR_THEME_CONFIG}.
 *
 * **Nothing creates it until something injects it**, and that is when a stored
 * choice or a non-`auto` `defaultMode` is applied. An app whose theme toggle
 * sits behind a lazy route would follow the OS until that route loads. So
 * inject it once at boot — in the root component, or with
 * `provideEnvironmentInitializer(() => inject(WrTheme))` — or ship
 * {@link wrThemePrePaintScript} with the same options, which applies the same
 * choice before first paint and so prevents the flash as well.
 *
 * **Under SSR or prerendering the server writes nothing**, so the prerendered
 * HTML carries no inline style and an `auto` visitor is right before any script
 * runs. A visitor who CHOSE a scheme is not: the server has no `localStorage`,
 * and by the time the client bundle boots and the effect below applies the
 * choice, the browser has painted the OS scheme. Closing that window takes a
 * script that runs before first paint — {@link wrThemePrePaintScript} emits one
 * that reads the persisted mode exactly the way this service does.
 *
 * @example
 * ```ts
 * const theme = inject(WrTheme);
 * theme.set('dark');
 * theme.toggle();
 * theme.resolved();  // 'dark'
 * ```
 *
 * @see https://ngwr.dev/reference/services/theme
 */
@Service()
export class WrTheme {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatform);
  private readonly storage = inject(WrStorage);
  private readonly config = inject(WR_THEME_CONFIG);

  /**
   * Whether the inline `color-scheme` on `<html>` is this service's own write.
   * `auto` clears only that, so a scheme the page set itself survives a service
   * that boots in `auto` — and once the user picks one, the user's choice is
   * what going back to `auto` hands to the OS. The pre-paint script needs no
   * flag of its own: it writes only for a stored `light` / `dark` or a
   * non-`auto` default, where this service boots in that same mode and writes
   * over it, so the value becomes this service's to clear.
   */
  private wroteScheme = false;

  /** User-selected mode. */
  readonly mode = signal<WrThemeMode>(this.readPersisted() ?? this.config.defaultMode);

  /** Resolved scheme actually on screen. */
  readonly resolved: Signal<WrResolvedTheme> = computed(() => {
    const m = this.mode();
    if (m === 'auto') return this.platform.prefersDark() ? 'dark' : 'light';
    return m;
  });

  constructor() {
    // Browser only. A server write would serialise into the prerendered
    // `<html style>` and pin every visitor to the server's guess — `auto` there
    // is only ever `light`, since a server has no `prefers-color-scheme`.
    if (!this.platform.isBrowser) return;

    // Whenever the mode changes, mirror it to the DOM + persist it. Keyed on the
    // MODE rather than on `resolved`: `auto` is the absence of an inline scheme,
    // so the stylesheet's `light dark` follows the OS on its own, including a
    // change made while the page is open.
    effect(() => {
      const mode = this.mode();
      const style = this.doc.documentElement.style;
      if (mode !== 'auto') {
        style.colorScheme = mode;
        this.wroteScheme = true;
      } else if (this.wroteScheme) {
        style.colorScheme = '';
        this.wroteScheme = false;
      }
      this.persist(mode);
    });
  }

  /** Switch to a specific mode. */
  set(mode: WrThemeMode): void {
    this.mode.set(mode);
  }

  /** Cycle: light → dark → light (skips auto). */
  toggle(): void {
    this.mode.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  // Persistence

  private readPersisted(): WrThemeMode | null {
    if (!this.config.storageKey) return null;
    const raw = this.storage.get<WrThemeMode>(this.config.storageKey);
    return isThemeMode(raw) ? raw : null;
  }

  private persist(mode: WrThemeMode): void {
    if (!this.config.storageKey) return;
    this.storage.set(this.config.storageKey, mode);
  }
}
