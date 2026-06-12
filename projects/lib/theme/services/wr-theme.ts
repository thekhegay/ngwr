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
 * - `resolved` is what's actually applied — `auto` resolves through
 *   {@link WrPlatform.prefersDark}.
 * - Writes `[data-theme]` (or your configured attribute) on `<html>`.
 * - Persists the selected mode via {@link WrStorage} (defaults to
 *   `localStorage`; swap the storage engine globally to change where).
 *
 * @example
 * ```ts
 * const theme = inject(WrTheme);
 * theme.set('dark');
 * theme.toggle();
 * theme.resolved();  // 'dark'
 * ```
 *
 * @see https://ngwr.dev/docs/core/services
 */
@Service()
export class WrTheme {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatform);
  private readonly storage = inject(WrStorage);
  private readonly config = inject(WR_THEME_CONFIG);

  /** User-selected mode. */
  readonly mode = signal<WrThemeMode>(this.readPersisted() ?? this.config.defaultMode);

  /** Resolved theme actually applied to the DOM. */
  readonly resolved: Signal<WrResolvedTheme> = computed(() => {
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
