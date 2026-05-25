/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Injectable, type Signal, computed, effect, inject, signal } from '@angular/core';

import { WrPlatformService } from 'ngwr/platform';

import { WR_THEME_CONFIG, type WrTheme, type WrThemeMode } from './wr-theme-config';

/**
 * Light / dark theme manager.
 *
 * - `mode` is what the user picked (`light` | `dark` | `auto`).
 * - `resolved` is what's actually applied — `auto` resolves through
 *   {@link WrPlatformService.prefersDark}.
 * - Writes `[data-theme]` (or your configured attribute) on `<html>`.
 * - Persists the selected mode to `localStorage` (configurable).
 *
 * @example
 * ```ts
 * const theme = inject(WrThemeService);
 * theme.set('dark');
 * theme.toggle();
 * theme.resolved();  // 'dark'
 * ```
 *
 * @see https://ngwr.dev/docs/core/services
 */
@Injectable({ providedIn: 'root' })
export class WrThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatformService);
  private readonly config = inject(WR_THEME_CONFIG);

  /** User-selected mode. */
  readonly mode = signal<WrThemeMode>(this.readPersisted() ?? this.config.defaultMode);

  /** Resolved theme actually applied to the DOM. */
  readonly resolved: Signal<WrTheme> = computed(() => {
    const m = this.mode();
    if (m === 'auto') return this.platform.prefersDark() ? 'dark' : 'light';
    return m;
  });

  constructor() {
    // Whenever the resolved theme changes, mirror it to the DOM + persist mode.
    effect(() => {
      const value = this.resolved();
      const html = this.doc.documentElement;
      if (html) html.setAttribute(this.config.attribute, value);
      this.persist(this.mode());
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

  // ──────── Persistence ────────

  private readPersisted(): WrThemeMode | null {
    if (!this.platform.isBrowser || !this.config.storageKey) return null;
    try {
      const raw = this.doc.defaultView?.localStorage.getItem(this.config.storageKey);
      if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
    } catch {
      // Quota exceeded, security error, private mode — silently ignore.
    }
    return null;
  }

  private persist(mode: WrThemeMode): void {
    if (!this.platform.isBrowser || !this.config.storageKey) return;
    try {
      this.doc.defaultView?.localStorage.setItem(this.config.storageKey, mode);
    } catch {
      // Ignore.
    }
  }
}
