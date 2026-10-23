/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { numAttr } from 'ngwr/utils';

// Helpers

function toMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/**
 * The format's tokens, longest first inside the alternation so `DD` beats `D`,
 * `HH` beats `H`, `mm` beats `m` and `SSS` beats `ss` beats `s`. Matched in one pass
 * so the output is never re-scanned: a sequential `.replace()` chain turned
 * `D days HH:mm:ss` into `1 day42 11:59:42`, its last `/s/g` step re-matching the
 * literal `s` inside `days`.
 */
const TOKEN = /(?<![A-Za-z])(?:SSS|DD|HH|mm|ss|D|H|m|s)(?![A-Za-z])/g;

/** Each unit's length, largest first, keyed by its token's letter. */
const UNITS = [
  ['D', 86_400_000],
  ['H', 3_600_000],
  ['m', 60_000],
  ['s', 1000],
  ['S', 1],
] as const;

/**
 * A unit the format does not show is carried into the next larger one it does:
 * `HH:mm:ss` with three days left reads `73:00:00`. Every unit was taken modulo
 * the next one whatever the format held, so the default format dropped whole days
 * and showed `00:59:59` for three days and an hour.
 */
function formatRemaining(ms: number, fmt: string): string {
  const shown = new Set((fmt.match(TOKEN) ?? []).map(token => token[0]));
  const value: Record<string, number> = {};
  let rest = ms;
  for (const [unit, size] of UNITS) {
    if (!shown.has(unit)) continue;
    value[unit] = Math.floor(rest / size);
    rest -= value[unit] * size;
  }
  return fmt.replace(TOKEN, token => {
    const n = value[token[0]];
    return token === 'SSS' ? pad(n, 3) : token.length === 2 ? pad(n, 2) : String(n);
  });
}

/**
 * Live-counting variant of `<wr-statistic>` that targets a future date
 * and ticks down to zero. The format string uses Day/Hour/Minute/Second
 * tokens (`D`, `H`, `m`, `s`, double for zero-padded, plus `SSS` for
 * milliseconds).
 *
 * @example
 * ```html
 * <wr-statistic-countdown
 *   label="Launch in"
 *   [target]="launchDate"
 *   format="D days HH:mm:ss"
 *   (countdownEnd)="onLive()"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/statistic
 */
@Component({
  selector: 'wr-statistic-countdown',
  templateUrl: './statistic-countdown.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-statistic' },
})
export class WrStatisticCountdown {
  /** Target date / timestamp the countdown is running down to. */
  readonly target = input.required<Date | string | number>();

  /** Label rendered above the value. */
  readonly label = input<string>('');

  /**
   * Format string. Tokens: `D`/`DD` (days), `H`/`HH` (hours),
   * `m`/`mm` (minutes), `s`/`ss` (seconds), `SSS` (milliseconds).
   * Double-letter forms zero-pad to width 2. A unit the format leaves out is
   * carried into the next larger one it shows, so `HH:mm:ss` reads `73:00:00`
   * with three days and an hour left. @default 'HH:mm:ss'
   */
  readonly format = input<string>('HH:mm:ss');

  /** Optional text shown once the countdown reaches zero. */
  readonly endText = input<string | null>(null);

  /**
   * Tick interval in ms. Drop to ~16 for `SSS` (millisecond display). Floored
   * at one frame — `0` (or an unparseable value) asked `setInterval` to run as
   * fast as the browser would allow, which is a busy loop, not a countdown.
   * @default 1000
   */
  readonly tickMs = input(1000, { transform: (v: unknown): number => Math.max(16, numAttr(1000)(v)) });

  /** Fires once when the countdown crosses zero. */
  readonly countdownEnd = output<void>();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly targetMs = computed(() => toMs(this.target()));

  /**
   * Milliseconds left, or `null` when `target` does not parse to a date at all.
   * `new Date('nope').getTime()` is `NaN`, and `NaN` propagated all the way to
   * the screen as `NaN:NaN:NaN` — and, worse, `tick` compared it to `0` and so
   * never fired `countdownEnd`, while a guard that only clamped the text would
   * have fired it immediately for a target that was never reached.
   */
  private remainingMs(): number | null {
    const target = this.targetMs();
    return Number.isFinite(target) ? Math.max(0, target - Date.now()) : null;
  }

  /** Remaining milliseconds (live signal). */
  protected readonly remaining = signal(0);
  protected readonly finished = signal(false);

  protected readonly display = computed(() => {
    if (this.finished() && this.endText() != null) return this.endText()!;
    return formatRemaining(this.remaining(), this.format());
  });

  constructor() {
    // Seed once synchronously so SSR / first paint shows a sane value.
    effect(() => {
      const ms = this.remainingMs();
      this.remaining.set(ms ?? 0);
      this.finished.set(ms === 0);
    });

    if (!this.isBrowser) return;

    // The interval is REBUILT when `tickMs` changes, which is what makes the
    // input bindable rather than an authoring-time constant. Read once from
    // inside `afterNextRender` it was a plain, untracked read, so
    // `[tickMs]="precise() ? 16 : 1000"` kept whatever period the first frame
    // saw and nothing looked wrong — the countdown still counted. Same shape
    // `wr-rotating-text` uses for its own rotation period; the `onCleanup` is
    // what keeps a period change from leaving the old interval running beside
    // the new one.
    effect(onCleanup => {
      const handle = setInterval(() => this.tick(), this.tickMs());
      onCleanup(() => clearInterval(handle));
    });
  }

  private tick(): void {
    const ms = this.remainingMs();
    if (ms === null) return;
    this.remaining.set(ms);
    if (ms === 0 && !this.finished()) {
      this.finished.set(true);
      this.countdownEnd.emit();
    }
  }
}
