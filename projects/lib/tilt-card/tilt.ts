/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { DestroyRef, Directive, ElementRef, NgZone, inject, input } from '@angular/core';

/**
 * 3D mouse-tilt on hover. Adds `perspective(…) rotateX(…) rotateY(…)` to
 * the host's transform tracking the cursor's position over it.
 *
 * @example
 * ```html
 * <div class="card" wrTilt>…</div>
 * <div class="card" wrTilt maxTilt="20" [glare]="true">…</div>
 * ```
 */
@Directive({
  selector: '[wrTilt]',
  host: { '(pointermove)': 'onMove($event)', '(pointerleave)': 'onLeave()' },
})
export class WrTilt {
  /** Maximum tilt in degrees. @default 12 */
  readonly maxTilt = input(12, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 12)) });

  /** CSS perspective in pixels. @default 800 */
  readonly perspective = input(800, {
    transform: (v: unknown): number => Math.max(100, coerceNumberProperty(v, 800)),
  });

  /** Scale applied while hovered. @default 1.03 */
  readonly scale = input(1.03, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1.03)) });

  /** Add a moving glare highlight overlay. @default false */
  readonly glare = input(false, { transform: coerceBooleanProperty });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const host = this.el.nativeElement;
    host.style.transformStyle = 'preserve-3d';
    host.style.transition = 'transform 0.15s ease-out';
    if (this.glare()) this.installGlare();
    this.destroyRef.onDestroy(() => {
      host.style.transform = '';
    });
  }

  /** @internal */
  protected onMove(event: PointerEvent): void {
    this.zone.runOutsideAngular(() => {
      const host = this.el.nativeElement;
      const rect = host.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * this.maxTilt();
      const ry = (px - 0.5) * this.maxTilt();
      host.style.transform = `perspective(${this.perspective()}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${this.scale()})`;
      if (this.glare()) {
        host.style.setProperty('--wr-tilt-glare-x', `${px * 100}%`);
        host.style.setProperty('--wr-tilt-glare-y', `${py * 100}%`);
      }
    });
  }

  /** @internal */
  protected onLeave(): void {
    this.el.nativeElement.style.transform = '';
  }

  private installGlare(): void {
    const host = this.el.nativeElement;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';
    const glare = host.ownerDocument.createElement('span');
    glare.className = 'wr-tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    host.appendChild(glare);
    this.destroyRef.onDestroy(() => glare.remove());
  }
}
