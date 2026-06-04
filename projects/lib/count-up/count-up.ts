/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animated number tick. Animates from `from` to the current `to` over
 * `duration`, formatting via `Intl.NumberFormat`. Re-runs whenever `to`
 * changes.
 *
 * @example
 * ```html
 * <wr-count-up [to]="12345" />
 * <wr-count-up [to]="9.99" [decimals]="2" prefix="$" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/count-up
 */
@Component({
  selector: 'wr-count-up',
  template: `{{ prefix() }}{{ formatted() }}{{ suffix() }}`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-count-up' },
})
export class WrCountUp {
  /** Starting value. @default 0 */
  readonly from = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  /** Target value. */
  readonly to = input.required<number>();

  /** Duration (ms). @default 1200 */
  readonly duration = input(1200, {
    transform: (v: unknown): number => Math.max(100, coerceNumberProperty(v, 1200)),
  });

  /** Fixed number of decimals. @default 0 */
  readonly decimals = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Optional prefix (e.g. `'$'`). */
  readonly prefix = input<string>('');

  /** Optional suffix (e.g. `'%'`). */
  readonly suffix = input<string>('');

  /** Disable grouping separators (`1,234` → `1234`). @default true (grouping on) */
  readonly grouping = input<boolean>(true);

  private readonly value = signal<number>(0);
  private readonly locale = inject(LOCALE_ID);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private rafId: number | null = null;

  protected readonly formatted = computed(() => {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: this.decimals(),
      maximumFractionDigits: this.decimals(),
      useGrouping: this.grouping(),
    }).format(this.value());
  });

  constructor() {
    effect(() => {
      const target = this.to();
      const start = this.from();
      if (!this.isBrowser) {
        this.value.set(target);
        return;
      }
      this.cancel();
      const startTs = performance.now();
      const duration = this.duration();
      const tick = (now: number): void => {
        const t = Math.min(1, (now - startTs) / duration);
        const v = start + (target - start) * easeOutCubic(t);
        this.value.set(v);
        if (t < 1) this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });

    this.destroyRef.onDestroy(() => this.cancel());
  }

  private cancel(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
