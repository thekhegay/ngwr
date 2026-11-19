/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { DestroyRef, Directive, ElementRef, Service, afterNextRender, inject, input, output } from '@angular/core';

type ViewCallback = (inView: boolean) => void;

interface Pool {
  readonly observer: IntersectionObserver;
  readonly targets: Map<Element, Set<ViewCallback>>;
}

/**
 * One `IntersectionObserver` per distinct `threshold`, shared by every element
 * watched with it. The observer is created with the first element and
 * disconnected with the last. Browser only: call it from `afterNextRender`.
 */
@Service()
export class WrInViewObserver {
  private readonly pools = new Map<number, Pool>();

  /** Watch `el` and call `callback` with `isIntersecting` on every change. Returns the stop function. */
  observe(el: Element, threshold: number, callback: ViewCallback): () => void {
    let pool = this.pools.get(threshold);
    if (!pool) {
      const targets = new Map<Element, Set<ViewCallback>>();
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            // A copy: a callback may stop itself while the set is walked.
            for (const cb of [...(targets.get(entry.target) ?? [])]) cb(entry.isIntersecting);
          }
        },
        { threshold }
      );
      pool = { observer, targets };
      this.pools.set(threshold, pool);
    }

    const { observer, targets } = pool;
    let callbacks = targets.get(el);
    if (!callbacks) {
      callbacks = new Set();
      targets.set(el, callbacks);
      observer.observe(el);
    }
    callbacks.add(callback);

    return () => {
      const set = targets.get(el);
      if (!set?.delete(callback) || set.size) return;
      targets.delete(el);
      observer.unobserve(el);
      if (!targets.size) {
        observer.disconnect();
        if (this.pools.get(threshold) === pool) this.pools.delete(threshold);
      }
    };
  }
}

/**
 * Emits when the host enters or leaves the viewport.
 *
 * `(wrInView)` carries `true` on entering and `false` on leaving, and only on a
 * change: an element that starts out of view emits nothing until it shows up.
 * `wrInViewOnce` stops after the first entry. Every instance with the same
 * `wrInViewThreshold` shares one `IntersectionObserver`. Nothing is observed on
 * the server.
 *
 * @example
 * ```html
 * <section (wrInView)="seen.set($event)" [wrInViewThreshold]="0.5"> … </section>
 * <img wrInViewOnce (wrInView)="load()" />
 * ```
 */
@Directive({ selector: '[wrInView]' })
export class WrInView {
  /** Fires with `true` when the host enters the viewport and `false` when it leaves. */
  readonly wrInView = output<boolean>();

  /** The share of the host, from 0 to 1, that must be visible to count as in view. Read once, when the host first renders. */
  readonly wrInViewThreshold = input(0, {
    transform: (value: unknown) => Math.min(1, Math.max(0, coerceNumberProperty(value, 0))),
  });

  /** Stop watching after the first entry. Bare `wrInViewOnce` is on. */
  readonly wrInViewOnce = input(false, { transform: coerceBooleanProperty });

  private readonly el = inject<ElementRef<Element>>(ElementRef);
  private readonly pool = inject(WrInViewObserver);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;

      let stop: (() => void) | null = null;
      const unwatch = (): void => {
        stop?.();
        stop = null;
      };
      let last = false;
      stop = this.pool.observe(this.el.nativeElement, this.wrInViewThreshold(), inView => {
        if (inView === last) return;
        last = inView;
        this.wrInView.emit(inView);
        if (inView && this.wrInViewOnce()) unwatch();
      });
      destroyRef.onDestroy(unwatch);
    });
  }
}
