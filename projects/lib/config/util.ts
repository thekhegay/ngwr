/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, computed, inject } from '@angular/core';

import type { WrConfig } from './interfaces';
import { WR_CONFIG } from './tokens';

/**
 * Resolve an input against the app's {@link WrConfig}, then a built-in fallback.
 *
 * The same shape as `useI18nText` from `ngwr/i18n`, and for the same reason: a
 * component's default has three possible sources and exactly one precedence
 * order, so it is worth writing once.
 *
 * 1. What the template bound, if it bound anything.
 * 2. What `provideWrConfig()` set for this component.
 * 3. The component's own fallback.
 *
 * A bound value always wins. That is what keeps a global config from becoming
 * something templates have to escape — the mistake NG-ZORRO's `NzConfigService`
 * is remembered for.
 *
 * Call it from a field initializer (it injects), and give the input `null` as its
 * own default so "not set" is expressible:
 *
 * ```ts
 * readonly size = input<WrButtonSize | null>(null);
 * protected readonly resolvedSize = useConfigValue(this.size, c => c.button?.size, 'md');
 * ```
 *
 * The generic is the COMPONENT's type, not the config's, so a component whose
 * size scale is narrower than {@link WrControlSize} stops compiling here rather
 * than accepting a value it cannot render — the type checker doing the work a
 * parity script would otherwise have to.
 *
 * `NoInfer` is what makes that true. Drop it and the guard is a comment again on
 * every call site that does not pin the generic by hand, which was all but two —
 * `wr-btn` the only size one among them. Without it `T` has three inference sites;
 * TypeScript collects all three candidates and keeps the SUPERTYPE, so `pick`'s
 * `WrControlSize` won and `T` widened to the config's type. `Signal<T>` is
 * covariant, so the narrower binding stayed assignable and the call compiled clean.
 * Widening `WrControlSize` by one member used to raise exactly one error, in
 * `wr-btn`; it now raises nine.
 */
export function useConfigValue<T>(
  binding: Signal<T | null | undefined>,
  pick: (config: WrConfig) => NoInfer<T> | undefined,
  fallback: NoInfer<T>
): Signal<T> {
  const config = inject(WR_CONFIG);

  return computed(() => {
    const bound = binding();
    // `null` and `undefined` both mean "the template did not say". `false` and
    // `0` do not, which is why this is not `??` on a falsy check — a
    // `[rounded]="false"` has to be able to turn a configured `true` back off.
    if (bound !== null && bound !== undefined) return bound;

    return pick(config) ?? fallback;
  });
}
