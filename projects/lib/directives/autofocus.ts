/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';

/**
 * Focus the host element after the first render — or whenever the bound
 * expression transitions to truthy.
 *
 * @example
 * ```html
 * <input wrAutofocus />
 * <input [wrAutofocus]="shouldFocus()" />
 * ```
 */
@Directive({ selector: '[wrAutofocus]' })
export class WrAutofocus {
  /** Truthy = focus. Defaults to `true` so bare `wrAutofocus` works. */
  readonly wrAutofocus = input(true, { transform: coerceBooleanProperty });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      if (this.wrAutofocus()) this.el.nativeElement.focus();
    });
    effect(() => {
      if (this.wrAutofocus()) {
        // Microtask defer so view updates that flip the expression land first.
        queueMicrotask(() => this.el.nativeElement.focus());
      }
    });
  }
}
