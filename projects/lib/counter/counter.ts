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

import { easeOutCubic } from './easing';
import type { WrCounterMode } from './types';

/** Visual cell in odometer mode — either a 0-9 column or a static glyph. */
type Cell = { readonly kind: 'digit'; readonly fraction: number } | { readonly kind: 'static'; readonly char: string };

/**
 * Animated number display with two modes:
 *
 * - **`odometer`** (default) — each digit is a vertical strip of 0-9 that
 *   rolls into place, continuously interpolated for smooth motion when the
 *   value changes.
 * - **`tween`** — a single eased count-up between the previous and new value,
 *   rendered through `Intl.NumberFormat`.
 *
 * Reacts to `[value]` changes — animate from any number to any number.
 *
 * @example
 * ```html
 * <wr-counter [value]="123456" mode="odometer" />
 * <wr-counter [value]="9.99" mode="tween" [decimals]="2" prefix="$" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/counter
 */
@Component({
  selector: 'wr-counter',
  templateUrl: './counter.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-counter' },
})
export class WrCounter {
  /** Target value. */
  readonly value = input.required<number>();

  /** Animation mode. @default 'odometer' */
  readonly mode = input<WrCounterMode>('odometer');

  /** Duration (ms). @default 900 */
  readonly duration = input(900, {
    transform: (v: unknown): number => Math.max(100, coerceNumberProperty(v, 900)),
  });

  /** Fixed number of decimals. @default 0 */
  readonly decimals = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Optional prefix (e.g. `'$'`). */
  readonly prefix = input<string>('');

  /** Optional suffix (e.g. `'%'`). */
  readonly suffix = input<string>('');

  /** Group thousands. @default true */
  readonly grouping = input<boolean>(true);

  /** Pad integer part to at least this many digits. @default 0 (no padding) */
  readonly minIntegerDigits = input(0, {
    transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)),
  });

  private readonly current = signal<number>(0);
  private readonly locale = inject(LOCALE_ID);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private rafId: number | null = null;

  /** Tween-mode formatted output. */
  protected readonly tweenText = computed(() => this.format(this.current()));

  /** Odometer cells — one per character in the formatted target string. */
  protected readonly cells = computed<readonly Cell[]>(() => {
    // Build the string with target sign + max length so we can interpolate
    // each digit position smoothly.
    const target = this.value();
    const live = this.current();
    const formattedTarget = this.format(target);
    const formattedLive = this.format(live);

    // Right-align so trailing digits line up.
    const maxLen = Math.max(formattedTarget.length, formattedLive.length);
    const padTarget = formattedTarget.padStart(maxLen, ' ');
    const padLive = formattedLive.padStart(maxLen, ' ');

    const cells: Cell[] = [];
    for (let i = 0; i < maxLen; i++) {
      const t = padTarget[i];
      const l = padLive[i];
      if (/[0-9]/.test(t) && /[0-9]/.test(l)) {
        // Interpolate the fractional digit so the strip rolls smoothly —
        // multi-digit rollover (9 → 0 carries 1) looks continuous.
        const fraction = this.digitFractionAt(live, target, i, maxLen);
        cells.push({ kind: 'digit', fraction });
      } else {
        cells.push({ kind: 'static', char: t === ' ' ? '' : t });
      }
    }
    return cells;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());

    effect(() => {
      const target = this.value();
      const start = this.current();
      if (!this.isBrowser) {
        this.current.set(target);
        return;
      }
      this.cancel();
      const startTs = performance.now();
      const dur = this.duration();
      const tick = (now: number): void => {
        const t = Math.min(1, (now - startTs) / dur);
        // Snap exactly to target on the final frame. Without this,
        // `start + (target - start) * 1` carries FP rounding (e.g.
        // 0.1 + (0.3 - 0.1) * 1 = 0.30000000000000004), so
        // `digitFractionAt`'s `live === target` rest-state check
        // fails — wheels visibly stop on a fractional position and
        // never settle to the clean integer glyph.
        const v = t >= 1 ? target : start + (target - start) * easeOutCubic(t);
        this.current.set(v);
        if (t < 1) this.rafId = requestAnimationFrame(tick);
        else this.rafId = null;
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  private cancel(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private format(n: number): string {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: this.decimals(),
      maximumFractionDigits: this.decimals(),
      minimumIntegerDigits: this.minIntegerDigits() || 1,
      useGrouping: this.grouping(),
    }).format(n);
  }

  /**
   * Compute the smoothly-interpolated digit (0..10) at column `i` of the
   * formatted live string. Returns the integer digit + a fraction so the
   * strip CSS translate looks like a real rolling odometer.
   */
  private digitFractionAt(live: number, target: number, columnIndex: number, totalLen: number): number {
    // Determine the place value at this column. Account for grouping separators
    // and the decimal point by counting digits to the right of this column in
    // the formatted target.
    const formattedTarget = this.format(target);
    const padded = formattedTarget.padStart(totalLen, ' ');
    const tail = padded.slice(columnIndex + 1);
    const digitsRight = (tail.match(/[0-9]/g) ?? []).length;
    const placePower = digitsRight - this.decimals();
    const place = Math.pow(10, placePower);
    const absLive = Math.abs(live);
    const raw = absLive / place;
    // Modulo 10 gives the digit at this column with fractional rollover —
    // mid-animation this looks like a real wheel rolling between digits.
    const mod = raw - Math.floor(raw / 10) * 10;
    // At rest (live === target) every wheel must rest on an exact integer
    // — otherwise upper digits show as partial (e.g. tens reads "5.6"
    // for value 123456, visibly clipping between 5 and 6 in the
    // overflow:hidden window). The continuous-mechanical look is only
    // wanted DURING the tween, not after it settles.
    if (live === target) return Math.floor(mod + 1e-9);
    return mod;
  }
}
