/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, type Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

import { filter } from 'rxjs';

/** Public state of the loading bar. */
export type WrLoadingState = 'idle' | 'running' | 'completing';

/**
 * Singleton state machine for a top-of-page progress indicator. Driven
 * by router events out of the box, plus a manual `start()` / `complete()`
 * API for HTTP-interceptor-style usage.
 *
 * Pair with `<wr-loading-bar>` to render the bar at the top of your shell.
 *
 * @example
 * ```ts
 * // From an HttpInterceptor:
 * const bar = inject(WrLoadingBar);
 * bar.start();
 * return next(req).pipe(finalize(() => bar.complete()));
 * ```
 *
 * @see https://ngwr.dev/services/loading-bar
 */
@Service()
export class WrLoadingBar {
  private readonly router = inject(Router, { optional: true });

  /** Live count of pending "tasks" (manual + router). */
  private readonly count = signal(0);

  /** Tween value `[0, 1]` — the bar's actual width. */
  private readonly _progress = signal(0);
  readonly progress: Signal<number> = this._progress.asReadonly();

  readonly state: Signal<WrLoadingState> = computed(() => {
    if (this.count() > 0) return 'running';
    return this._progress() > 0 ? 'completing' : 'idle';
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.router) {
      // Mirror router events: any in-flight navigation starts the bar,
      // each terminal event releases one slot.
      toSignal(
        this.router.events.pipe(
          filter(
            e =>
              e instanceof NavigationStart ||
              e instanceof NavigationEnd ||
              e instanceof NavigationCancel ||
              e instanceof NavigationError
          )
        ),
        { manualCleanup: true }
      );
      this.router.events.subscribe(event => {
        if (event instanceof NavigationStart) this.start();
        else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          this.complete();
        }
      });
    }
  }

  /** Reserve a slot. The bar starts trickling as long as `count > 0`. */
  start(): void {
    if (this.count() === 0) this.beginTrickle();
    this.count.update(v => v + 1);
  }

  /** Release a slot. When the last one closes, the bar fast-forwards to 100% then resets. */
  complete(): void {
    this.count.update(v => Math.max(0, v - 1));
    if (this.count() === 0) this.finish();
  }

  /** Cancel without animating the bar to 100%. Resets immediately. */
  reset(): void {
    this.count.set(0);
    this.stopTrickle();
    this._progress.set(0);
  }

  // Internals

  private beginTrickle(): void {
    this.stopTrickle();
    if (this._progress() === 0) this._progress.set(0.08);
    this.timer = setInterval(() => {
      const p = this._progress();
      // Approach 90% asymptotically — we want the user-visible final jump
      // to clearly indicate completion.
      const next = p + (0.9 - p) * 0.08;
      this._progress.set(next);
    }, 150);
  }

  private stopTrickle(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private finish(): void {
    this.stopTrickle();
    this._progress.set(1);
    // Give the bar a moment to render the final 100% width before resetting.
    setTimeout(() => {
      if (this.count() === 0) this._progress.set(0);
    }, 220);
  }
}
