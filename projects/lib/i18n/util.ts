/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, computed, inject, signal } from '@angular/core';

import { WrI18n } from './i18n';

/**
 * Helper for component default text. Returns a reactive string that:
 *
 * 1. Prefers the consumer's override (an `input<string | null>()` value).
 * 2. Falls back to the i18n catalog under `key` — re-renders on locale
 *    change so a switcher updates the DOM live.
 * 3. Falls back to `fallback` when no `WrI18n` is provided OR the catalog
 *    is missing the key.
 *
 * Components don't need a hard dependency on `provideWrI18n` — without it,
 * the fallback is returned and everything still works.
 *
 * @example
 * ```ts
 * readonly emptyText = input<string | null>(null);
 * protected readonly empty = useI18nText(this.emptyText, 'table.empty', 'No data');
 *
 * // In template:  <div>{{ empty() }}</div>
 * ```
 */
export function useI18nText(binding: Signal<string | null | undefined>, key: string, fallback: string): Signal<string> {
  const i18n = inject(WrI18n, { optional: true });
  if (!i18n) {
    return computed(() => {
      const v = binding();
      return v ?? fallback;
    });
  }

  return computed(() => {
    const v = binding();
    if (v !== null && v !== undefined && v !== '') return v;
    const translated = i18n.t(key);
    // Default missing handler returns the key itself — treat that as "missing"
    // and use our explicit fallback.
    return translated === key ? fallback : translated;
  });
}

/**
 * Like {@link useI18nText} but takes a literal value (not a Signal) — for
 * computed `aria-label`s that already mix a static piece with a dynamic
 * value. Returns the resolved string once, at injection time.
 */
export function readI18nText(key: string, fallback: string): string {
  const i18n = inject(WrI18n, { optional: true });
  if (!i18n) return fallback;
  const v = i18n.t(key);
  return v === key ? fallback : v;
}

/** Tiny shim — useful when the caller doesn't have an `input` to forward. */
export function nullSignal(): Signal<null> {
  return signal(null).asReadonly();
}
