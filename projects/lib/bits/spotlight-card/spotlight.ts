/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, Directive, ElementRef, NgZone, effect, inject, input } from '@angular/core';

/**
 * Cursor-follow radial spotlight. Sets the `--wr-spotlight-x` and
 * `--wr-spotlight-y` CSS custom properties on the host based on the
 * pointer position so a `radial-gradient` (or `mask`) in your CSS can
 * follow the cursor.
 *
 * @example
 * ```html
 * <div class="card" wrSpotlight>…</div>
 * ```
 *
 * ```scss
 * .card {
 *   background: radial-gradient(
 *     400px circle at var(--wr-spotlight-x, 50%) var(--wr-spotlight-y, 50%),
 *     color-mix(in srgb, var(--wr-color-primary) 15%, transparent),
 *     transparent 60%
 *   );
 * }
 * ```
 */
@Directive({
  selector: '[wrSpotlight]',
  host: { '(pointermove)': 'onMove($event)', '(pointerleave)': 'onLeave()' },
})
export class WrSpotlight {
  /** Optional default coordinates when no pointer is over the host. */
  readonly resetX = input<string>('50%');
  /**
   * Vertical half of that resting position. Same units as `resetX`.
   */
  readonly resetY = input<string>('50%');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the pointer is over the host — the rest position waits until it leaves. */
  private hovering = false;

  constructor() {
    const host = this.el.nativeElement;
    // An effect, not a constructor write: signal inputs are not bound while the
    // constructor runs, so reading them there always saw the `50%` default and a
    // custom rest point only took effect after the pointer had left once. Same
    // trap `WrTilt`'s constructor describes. Tracking them also follows a rest
    // point changed at runtime.
    effect(() => {
      const x = this.resetX();
      const y = this.resetY();
      if (this.hovering) return;
      host.style.setProperty('--wr-spotlight-x', x);
      host.style.setProperty('--wr-spotlight-y', y);
    });
    this.destroyRef.onDestroy(() => {
      host.style.removeProperty('--wr-spotlight-x');
      host.style.removeProperty('--wr-spotlight-y');
    });
  }

  /** @internal */
  protected onMove(event: PointerEvent): void {
    this.hovering = true;
    this.zone.runOutsideAngular(() => {
      const host = this.el.nativeElement;
      const rect = host.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      host.style.setProperty('--wr-spotlight-x', `${x}%`);
      host.style.setProperty('--wr-spotlight-y', `${y}%`);
    });
  }

  /** @internal */
  protected onLeave(): void {
    this.hovering = false;
    const host = this.el.nativeElement;
    host.style.setProperty('--wr-spotlight-x', this.resetX());
    host.style.setProperty('--wr-spotlight-y', this.resetY());
  }
}
