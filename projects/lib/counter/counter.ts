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
  untracked,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import { easeOutCubic } from './easing';
import type { WrCounterMode } from './types';

/**
 * Visual cell in odometer mode — either a 0-9 column or a static glyph. `key` is the
 * column's place counted from the RIGHT, so a wheel keeps its element when columns
 * come or go on the left.
 */
type Cell = { readonly key: number } & (
  { readonly kind: 'digit'; readonly fraction: number } | { readonly kind: 'static'; readonly char: string }
);

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
 * @see https://ngwr.dev/reference/components/counter
 */
@Component({
  selector: 'wr-counter',
  templateUrl: './counter.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-counter' },
})
export class WrCounter {
  /** Target value. */
  /**
   * The number to show. Coerced like every other numeric input here — it was the only one
   * without it, and `Intl.NumberFormat().format(NaN)` renders the literal text `NaN`.
   */
  readonly value = input.required<number, unknown>({
    transform: (v: unknown): number => coerceNumberProperty(v, 0),
  });

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
  /** Where the running roll started; read only while `current` is short of the value. */
  private readonly from = signal<number>(0);
  private readonly locale = inject(LOCALE_ID);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);
  private rafId: number | null = null;

  /** Tween-mode formatted output. */
  protected readonly tweenText = computed(() => this.format(this.current()));

  /**
   * Odometer-mode text for assistive tech and prerendered output. The strip
   * renders every digit 0-9 per column and picks one with a transform, so its
   * markup carries no usable text — screen readers would announce all ten, and
   * static HTML would ship the same noise. This node holds the real value.
   */
  protected readonly odoText = computed(() => `${this.prefix()}${this.format(this.value())}${this.suffix()}`);

  /** Odometer cells — one per character of the widest string the roll passes through. */
  protected readonly cells = computed<readonly Cell[]>(() => {
    const target = this.value();
    const live = this.current();
    // The layout of the whole roll is the longer of where it started and where it ends,
    // right-aligned so trailing digits line up. Laid out from the target and the live
    // value alone, a large decrease kept a wheel only where BOTH had a digit: 123456 to
    // 7 rolled the ones column and blanked the other five at once. Every column either
    // end has is a wheel now, so each rolls to its own digit — down to 0 for a place the
    // target does not have — and the width holds still until the roll lands.
    const values = live === target ? [target, live] : [target, live, this.from()];
    // Places only: a sign laid out with them landed mid-number whenever the start was
    // wider than the live value (-1,234 to 5 drew `0-935`), so it goes in front below.
    const strings = values.map(n => this.format(Math.abs(n)));
    const maxLen = Math.max(...strings.map(s => s.length));
    const padded = strings.map(s => s.padStart(maxLen, ' '));

    const cells: Cell[] = [];
    let digitsRight = 0;
    for (let i = maxLen - 1; i >= 0; i--) {
      const chars = padded.map(s => s[i]);
      const key = maxLen - i;
      if (chars.some(c => /[0-9]/.test(c))) {
        // Interpolate the fractional digit so the strip rolls smoothly —
        // multi-digit rollover (9 → 0 carries 1) looks continuous.
        const fraction = this.digitFraction(live, target, digitsRight - this.decimals());
        cells.unshift({ key, kind: 'digit', fraction });
        digitsRight++;
      } else {
        // A separator, the target's first; a pad is nothing.
        cells.unshift({ key, kind: 'static', char: chars.find(c => c !== ' ') ?? '' });
      }
    }

    // The live value's sign, whatever the locale writes ahead of its digits.
    const signed = this.format(live);
    const sign = signed.endsWith(strings[1]) ? signed.slice(0, signed.length - strings[1].length) : '';
    if (sign) cells.unshift({ key: maxLen + 1, kind: 'static', char: sign });
    return cells;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());

    effect(() => {
      const target = this.value();
      // Snapshot the current value WITHOUT tracking it — the RAF tick below
      // writes `current` every frame, and tracking it here would re-trigger
      // this effect each frame, cancelling + restarting the tween endlessly
      // (the wheels hang mid-roll and only snap once the restarts converge).
      const start = untracked(() => this.current());
      // Straight to the answer when there is nothing to animate for: no browser, or a
      // reader who asked for less motion. `wr-scroll` already falls back the same way, and a
      // component whose entire purpose is a count-up should be the first to honour it.
      if (!this.isBrowser || this.platform.prefersReducedMotion()) {
        this.current.set(target);
        return;
      }
      this.cancel();
      this.from.set(start);
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
   * The smoothly-interpolated digit (0..10) of `live` at the column whose place value is
   * `10 ** placePower`. Returns the integer digit + a fraction so the strip CSS translate
   * looks like a real rolling odometer.
   */
  private digitFraction(live: number, target: number, placePower: number): number {
    const place = Math.pow(10, placePower);
    const raw = Math.abs(live) / place;
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
