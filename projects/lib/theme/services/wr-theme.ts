/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, type Signal, afterNextRender, computed, effect, inject, isDevMode, signal } from '@angular/core';

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
 * A configured `attribute` has to be given to the STYLESHEET too — a CSS
 * selector cannot read a provider value — so pair it with
 * `@use 'ngwr' with ($theme-attribute: '...')`. In dev mode the service compares
 * the two and warns when they disagree.
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

    if (isDevMode() && this.platform.isBrowser) {
      // After render, so nothing here is constructor-time DOM access — and so
      // the stylesheet has had its chance to apply.
      afterNextRender(() => this.warnOnAttributeMismatch());
    }
  }

  /** Switch to a specific mode. */
  set(mode: WrThemeMode): void {
    this.mode.set(mode);
  }

  /** Cycle: light → dark → light (skips auto). */
  toggle(): void {
    this.mode.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Dev-mode check that the STYLESHEET keys on the same attribute this service
   * writes.
   *
   * `attribute` is a runtime value and a CSS selector cannot read one, so the
   * dark block is keyed on a Sass variable (`$theme-attribute`) the consumer
   * configures separately. That makes disagreement possible, and disagreement is
   * silent in the worst way: the service resolves `dark`, writes the attribute,
   * reports success — and the page stays light forever, because nothing matches.
   *
   * The compiled theme publishes the name it keys on as `--wr-theme-attribute`,
   * which is what this reads. An empty value means no ngwr stylesheet is loaded
   * (a unit test, a consumer bundling their own CSS) or that it predates v13, so
   * the check stays quiet — it can only fire on a real mismatch, never on an
   * absence it cannot interpret.
   *
   * Production builds drop the call entirely via `isDevMode()` tree-shaking.
   */
  private warnOnAttributeMismatch(): void {
    const view = this.doc.defaultView;
    if (!view) return;

    const declared = view.getComputedStyle(this.doc.documentElement).getPropertyValue('--wr-theme-attribute').trim();
    if (!declared || declared === this.config.attribute) return;

    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] Theme attribute mismatch: provideWrTheme({ attribute: '${this.config.attribute}' }) ` +
        `but the stylesheet keys its dark block on '${declared}'. Dark mode will never apply. ` +
        `Configure both: @use 'ngwr' with ($theme-attribute: '${this.config.attribute}');`
    );
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
