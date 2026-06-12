/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * The spring-physics path is an adaptation of the CountUp effect by
 * David Haz / reactbits.dev (https://www.reactbits.dev/text-animations/count-up).
 * Same critically-damped formula, implemented inline with rAF — no
 * external dependency.
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
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

import { numAttr } from 'ngwr/utils';

import { easeOutCubic } from './easing';

/** Animation curve. */
type WrCountUpEasingInternal = 'ease-out' | 'spring';

/** When the counter should start animating. */
type WrCountUpTriggerInternal = 'mount' | 'visible';

/** Counting direction. `'down'` swaps `from` ↔ `to`. */
type WrCountUpDirectionInternal = 'up' | 'down';

/**
 * Animated number tick. Animates from `from` to the current `to`, formatting
 * via `Intl.NumberFormat`. Re-runs whenever `to` changes.
 *
 * @example Basic
 * ```html
 * <wr-count-up [to]="12345" />
 * <wr-count-up [to]="9.99" [decimals]="2" prefix="$" />
 * ```
 *
 * @example Reactbits-style — spring curve + viewport trigger
 * ```html
 * <wr-count-up [to]="100" easing="spring" trigger="visible" [delay]="200" />
 * ```
 *
 * @example Count down
 * ```html
 * <wr-count-up [from]="60" [to]="0" direction="down" />
 * ```
 *
 * @see https://ngwr.dev/components/count-up
 */
@Component({
  selector: 'wr-count-up',
  template: `{{ prefix() }}{{ formatted() }}{{ suffix() }}`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-count-up' },
})
export class WrCountUp {
  /** Starting value. @default 0 */
  readonly from = input(0, { transform: numAttr(0) });

  /** Target value. */
  readonly to = input.required<number>();

  /**
   * Animation duration. Units depend on `easing`:
   *
   * - `ease-out` — milliseconds (default 1200, min 100)
   * - `spring` — seconds (tunes spring stiffness; default 2)
   */
  readonly duration = input(1200, { transform: numAttr(1200) });

  /** Optional delay (ms) before the animation starts. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  /** Animation curve. @default 'ease-out' */
  readonly easing = input<WrCountUpEasingInternal>('ease-out');

  /**
   * When to start the animation.
   *
   * - `'mount'` (default) — start as soon as the component is rendered.
   * - `'visible'` — wait for the host to enter the viewport
   *   (IntersectionObserver). Useful for long pages or hero numbers
   *   below the fold.
   */
  readonly trigger = input<WrCountUpTriggerInternal>('mount');

  /** Counting direction. `'down'` swaps `from` ↔ `to`. @default 'up' */
  readonly direction = input<WrCountUpDirectionInternal>('up');

  /** Fixed number of decimals. @default 0 */
  readonly decimals = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Optional prefix (e.g. `'$'`). */
  readonly prefix = input<string>('');

  /** Optional suffix (e.g. `'%'`). */
  readonly suffix = input<string>('');

  /** Disable grouping separators (`1,234` → `1234`). @default true (grouping on) */
  readonly grouping = input<boolean>(true);

  /** Emits when the animation begins. */
  readonly started = output<void>();

  /** Emits when the animation settles. */
  readonly completed = output<void>();

  private readonly value = signal<number>(0);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  private rafId: number | null = null;
  private delayTimer: ReturnType<typeof setTimeout> | undefined;
  private observer: IntersectionObserver | null = null;
  private hasFiredForVisible = false;

  protected readonly formatted = computed(() => {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: this.decimals(),
      maximumFractionDigits: this.decimals(),
      useGrouping: this.grouping(),
    }).format(this.value());
  });

  constructor() {
    // Seed the resting value so SSR / first paint show the start, not 0.
    effect(() => {
      const initial = this.direction() === 'down' ? this.to() : this.from();
      this.value.set(initial);
    });

    if (!this.isBrowser) return;

    // Run the animation whenever the `to` target changes (or on first mount).
    // For `trigger="visible"` the first run waits for the IntersectionObserver
    // to fire; subsequent `to` changes re-run immediately.
    effect(() => {
      // Establish dependencies so the effect re-runs on `to` changes.
      this.to();
      this.from();
      this.direction();
      this.duration();
      this.easing();
      this.delay();

      if (this.trigger() === 'visible' && !this.hasFiredForVisible) return;
      this.scheduleRun();
    });

    afterNextRender(() => {
      if (this.trigger() === 'visible') this.setupViewportTrigger();
    });

    this.destroyRef.onDestroy(() => this.cancel());
  }

  // Scheduling

  private setupViewportTrigger(): void {
    this.observer = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting && !this.hasFiredForVisible) {
            obs.disconnect();
            this.hasFiredForVisible = true;
            this.scheduleRun();
            break;
          }
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );
    this.observer.observe(this.host.nativeElement);
  }

  private scheduleRun(): void {
    this.cancel();
    const d = this.delay();
    if (d > 0) {
      this.delayTimer = setTimeout(() => this.run(), d);
    } else {
      this.run();
    }
  }

  private run(): void {
    const start = this.direction() === 'down' ? this.to() : this.from();
    const end = this.direction() === 'down' ? this.from() : this.to();
    this.started.emit();
    if (this.easing() === 'spring') this.tweenSpring(start, end);
    else this.tweenEaseOut(start, end);
  }

  // Tweens

  private tweenEaseOut(start: number, target: number): void {
    const duration = Math.max(100, this.duration());
    const startTs = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - startTs) / duration);
      const v = start + (target - start) * easeOutCubic(t);
      this.value.set(v);
      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.completed.emit();
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Critically-damped spring tween. Same formula as `motion/react`'s
   * `useSpring` with mass = 1:
   *
   *   damping   = 20 + 40 / duration
   *   stiffness = 100 / duration
   *
   * We integrate `(spring force − damping force)` each frame until both
   * displacement and velocity fall below epsilon.
   */
  private tweenSpring(start: number, target: number): void {
    const duration = Math.max(0.05, this.duration());
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
        this.completed.emit();
        return;
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  // Cleanup

  private cancel(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.delayTimer !== undefined) {
      clearTimeout(this.delayTimer);
      this.delayTimer = undefined;
    }
  }
}

export type WrCountUpEasing = WrCountUpEasingInternal;
export type WrCountUpTrigger = WrCountUpTriggerInternal;
export type WrCountUpDirection = WrCountUpDirectionInternal;
