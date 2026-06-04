/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the CountUp effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/count-up
 *
 * The reactbits version uses `motion/react`'s `useSpring`. This port
 * implements the same critically-damped spring physics inline with rAF,
 * so there's no runtime dependency.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
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

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

function decimalPlaces(n: number): number {
  const str = String(n);
  if (!str.includes('.')) return 0;
  const decimals = str.split('.')[1];
  if (Number.parseInt(decimals, 10) === 0) return 0;
  return decimals.length;
}

/**
 * Animates a number from `[from]` to `[to]` (or in reverse with
 * `[direction]="down"`) using spring physics. Triggers on viewport entry
 * by default; disable via `[startWhen]="false"`. Numbers are formatted
 * via `Intl.NumberFormat`, with optional thousands `[separator]`.
 *
 * @example
 * ```html
 * <wr-count-up-text [to]="12345" separator="," />
 * <wr-count-up-text [from]="0" [to]="99.9" [duration]="2.5" />
 * <wr-count-up-text [to]="100" direction="down" />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/count-up
 */
@Component({
  selector: 'wr-count-up-text',
  template: '{{ display() }}',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-count-up-text' },
})
export class WrCountUpText {
  /** Target value. Required. */
  readonly to = input.required<number>();

  /** Starting value. @default 0 */
  readonly from = input(0, { transform: num(0) });

  /** Direction of count. `'down'` swaps the start/end pair. @default 'up' */
  readonly direction = input<WrCountUpTextDirection>('up');

  /** Delay before starting in seconds. @default 0 */
  readonly delay = input(0, { transform: num(0) });

  /** Approximate animation duration in seconds (tunes the spring). @default 2 */
  readonly duration = input(2, { transform: num(2) });

  /** Thousands separator. Empty string disables grouping. @default '' */
  readonly separator = input('');

  /** Start the animation only when `true`. @default true */
  readonly startWhen = input(true, { transform: coerceBooleanProperty });

  /** Emits when the animation begins. */
  readonly started = output<void>();

  /** Emits when the animation settles. */
  readonly completed = output<void>();

  protected readonly value = signal(0);

  protected readonly display = computed(() => this.format(this.value()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private hasStarted = false;
  private raf = 0;
  private delayTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Initialise display with the visible start value (so SSR + first paint
    // show the resting state, not 0).
    effect(() => {
      const initial = this.direction() === 'down' ? this.to() : this.from();
      this.value.set(initial);
    });

    if (!this.isBrowser) return;

    afterNextRender(() => this.setupTrigger());

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.delayTimer);
    });
  }

  private setupTrigger(): void {
    if (!this.startWhen()) return;
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting && !this.hasStarted) {
            obs.disconnect();
            this.hasStarted = true;
            this.run();
            break;
          }
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );
    io.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  private run(): void {
    const start = this.direction() === 'down' ? this.to() : this.from();
    const target = this.direction() === 'down' ? this.from() : this.to();
    const duration = this.duration();

    this.delayTimer = setTimeout(() => {
      this.started.emit();
      this.tween(start, target, duration);
      // Reactbits emits onEnd after delay + duration regardless of settle —
      // mirror that here so the contract matches.
      setTimeout(() => this.completed.emit(), duration * 1000);
    }, this.delay() * 1000);
  }

  /**
   * Critically-damped spring tween. Same formula as `useSpring`:
   *   damping   = 20 + 40 / duration
   *   stiffness = 100 / duration
   * Mass is 1. We integrate `(spring force − damping force)` each frame
   * until both displacement and velocity fall below epsilon.
   */
  private tween(start: number, target: number, duration: number): void {
    const damping = 20 + 40 / duration;
    const stiffness = 100 / duration;
    let current = start;
    let velocity = 0;
    let lastTs = 0;
    const epsilon = 0.001 * Math.max(1, Math.abs(target - start));

    const step = (ts: number): void => {
      const dt = lastTs === 0 ? 1 / 60 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const displacement = current - target;
      const accel = -stiffness * displacement - damping * velocity;
      velocity += accel * dt;
      current += velocity * dt;
      this.value.set(current);

      if (Math.abs(current - target) < epsilon && Math.abs(velocity) < epsilon * 10) {
        this.value.set(target);
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private format(latest: number): string {
    const decimals = Math.max(decimalPlaces(this.from()), decimalPlaces(this.to()));
    const sep = this.separator();
    const formatted = new Intl.NumberFormat('en-US', {
      useGrouping: !!sep,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(latest);
    return sep ? formatted.replace(/,/g, sep) : formatted;
  }
}

export type WrCountUpTextDirection = 'up' | 'down';
