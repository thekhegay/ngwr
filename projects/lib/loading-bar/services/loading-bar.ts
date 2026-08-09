/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Service, PLATFORM_ID, type Signal, computed, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

import type { WrLoadingState } from '../interfaces';

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
 * @see https://ngwr.dev/reference/services/loading-bar
 */
@Service()
export class WrLoadingBar {
  private readonly router = inject(Router, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Router-driven only in the browser. During prerender the initial
    // navigation ran the whole cycle in the Node worker — including a 150 ms
    // `setInterval` — and left `progress` at 1, because the reset that clears
    // it is deferred and the HTML is serialized first. Every prerendered page
    // shipped a full-width bar across the top until hydration.
    if (!this.router || !this.isBrowser) return;

    // Mirror router events: any in-flight navigation starts the bar,
    // each terminal event releases one slot.
    const sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) this.start();
      else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.complete();
      }
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  /** Reserve a slot. The bar starts trickling as long as `count > 0`. */
  start(): void {
    if (this.count() === 0) this.beginTrickle();
    this.count.update(v => v + 1);
  }

  /** Release a slot. When the last one closes, the bar fast-forwards to 100% then resets. */
  complete(): void {
    // Only a call that actually RELEASED something may finish. `Math.max` turns
    // a stray `complete()` into a no-op on the count, but the old code still
    // read the resulting zero as "the last task just ended" and flashed the bar
    // to 100% — reachable from a `finalize` that runs twice, or any
    // `complete()` after a `reset()`.
    if (this.count() === 0) return;
    this.count.update(v => v - 1);
    if (this.count() === 0) this.finish();
  }

  /** Cancel without animating the bar to 100%. Resets immediately. */
  reset(): void {
    this.count.set(0);
    this.stopTrickle();
    this.clearHold();
    this._progress.set(0);
  }

  // Internals

  private beginTrickle(): void {
    this.stopTrickle();
    this.clearHold();

    // Nothing paints during prerender, so there is nothing to animate. The
    // count still moves — a task really is in flight — but no 150 ms interval
    // is left spinning inside the render worker, and the serialized bar stays
    // at zero width whether or not the task finishes before serialization.
    if (!this.isBrowser) return;

    // Unconditionally, not `if (progress === 0)`. A task that starts inside the
    // 220 ms hold found progress at 1, kept it, and then trickled the WRONG WAY:
    // `p + (0.9 - p) * 0.08` approaches 0.9 from above, so the bar sat at ~99%
    // and crept backwards for the whole task. A redirecting route guard hits
    // that window on every navigation.
    this._progress.set(0.08);
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

  private clearHold(): void {
    if (this.holdTimer === null) return;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  private finish(): void {
    this.stopTrickle();
    this.clearHold();

    // Nothing animates during prerender and nothing will run the reset before
    // the HTML is serialized, so there is no 100% worth holding — go straight
    // to rest and leave the markup clean.
    if (!this.isBrowser) {
      this._progress.set(0);
      return;
    }

    this._progress.set(1);
    // Give the bar a moment to render the final 100% width before resetting.
    // The handle is kept so a later cycle's hold is not cut short by this
    // one's leftover timer.
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      if (this.count() === 0) this._progress.set(0);
    }, 220);
  }
}

export type { WrLoadingState } from '../interfaces';
