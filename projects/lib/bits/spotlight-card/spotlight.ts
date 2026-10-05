/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, Directive, ElementRef, NgZone, inject, input } from '@angular/core';

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
 *     rgba(var(--wr-color-primary-rgb), 0.15),
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
  readonly resetY = input<string>('50%');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const host = this.el.nativeElement;
    host.style.setProperty('--wr-spotlight-x', this.resetX());
    host.style.setProperty('--wr-spotlight-y', this.resetY());
    this.destroyRef.onDestroy(() => {
      host.style.removeProperty('--wr-spotlight-x');
      host.style.removeProperty('--wr-spotlight-y');
    });
  }

  /** @internal */
  protected onMove(event: PointerEvent): void {
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
    const host = this.el.nativeElement;
    host.style.setProperty('--wr-spotlight-x', this.resetX());
    host.style.setProperty('--wr-spotlight-y', this.resetY());
  }
}
