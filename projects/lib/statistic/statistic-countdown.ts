/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

// Helpers

function toMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function formatRemaining(ms: number, fmt: string): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  // Single-pass tokenizer so we never re-scan output for tokens. The
  // previous sequential `.replace()` chain leaked: e.g. `D days HH:mm:ss`
  // → `1 day42 11:59:42` because the `/s/g` step at the end re-matched
  // the literal `s` inside `days`. Longest-token-first ordering inside
  // the alternation handles `DD`>`D`, `HH`>`H`, `mm`>`m`, `SSS`>`ss`>`s`.
  return fmt.replace(/(?<![A-Za-z])(?:SSS|DD|HH|mm|ss|D|H|m|s)(?![A-Za-z])/g, token => {
    switch (token) {
      case 'DD':
        return pad(days, 2);
      case 'D':
        return String(days);
      case 'HH':
        return pad(hours, 2);
      case 'H':
        return String(hours);
      case 'mm':
        return pad(minutes, 2);
      case 'm':
        return String(minutes);
      case 'ss':
        return pad(seconds, 2);
      case 's':
        return String(seconds);
      case 'SSS':
        return pad(millis, 3);
      default:
        return token;
    }
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
   * Double-letter forms zero-pad to width 2. @default 'HH:mm:ss'
   */
  readonly format = input<string>('HH:mm:ss');

  /** Optional text shown once the countdown reaches zero. */
  readonly endText = input<string | null>(null);

  /**
   * Tick interval in ms. Drop to ~16 for `SSS` (millisecond display).
   * @default 1000
   */
  readonly tickMs = input(1000);

  /** Fires once when the countdown crosses zero. */
  readonly countdownEnd = output<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly targetMs = computed(() => toMs(this.target()));

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
      const ms = Math.max(0, this.targetMs() - Date.now());
      this.remaining.set(ms);
      this.finished.set(ms === 0);
    });

    if (!this.isBrowser) return;

    afterNextRender(() => {
      const handle = setInterval(() => this.tick(), this.tickMs());
      this.destroyRef.onDestroy(() => clearInterval(handle));
    });
  }

  private tick(): void {
    const ms = Math.max(0, this.targetMs() - Date.now());
    this.remaining.set(ms);
    if (ms === 0 && !this.finished()) {
      this.finished.set(true);
      this.countdownEnd.emit();
    }
  }
}
