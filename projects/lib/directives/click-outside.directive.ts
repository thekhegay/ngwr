/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, NgZone, inject, output } from '@angular/core';

/**
 * Fires `(wrClickOutside)` when a pointer event lands outside the host
 * element. Useful for closing custom poppers / menus.
 *
 * @example
 * ```html
 * <div class="popup" (wrClickOutside)="close()"> … </div>
 * ```
 */
@Directive({ selector: '[wrClickOutside]' })
export class WrClickOutsideDirective {
  readonly wrClickOutside = output<MouseEvent>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Listen outside Angular to avoid CD on every page click; re-enter
    // only when the event lands outside the host.
    this.zone.runOutsideAngular(() => {
      const handler = (event: MouseEvent): void => {
        const target = event.target as Node | null;
        if (target && !this.host.nativeElement.contains(target)) {
          this.zone.run(() => this.wrClickOutside.emit(event));
        }
      };
      this.doc.addEventListener('mousedown', handler, true);
      this.destroyRef.onDestroy(() => {
        this.doc.removeEventListener('mousedown', handler, true);
      });
    });
  }
}
