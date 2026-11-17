/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, ElementRef, Injector, afterNextRender, effect, inject, input } from '@angular/core';

import { wrGetFocusableElements } from 'ngwr/utils';

/**
 * Focus the host element after the first render, or whenever the bound
 * expression turns truthy. `"first"` focuses the first focusable element
 * inside the host instead: the control of a form, a card or a dialog body.
 * Disabled and hidden elements are skipped.
 *
 * @example
 * ```html
 * <input wrAutofocus />
 * <input [wrAutofocus]="shouldFocus()" />
 * <form wrAutofocus="first">…</form>
 * <form [wrAutofocus]="editing() && 'first'">…</form>
 * ```
 */
@Directive({ selector: '[wrAutofocus]' })
export class WrAutofocus {
  /**
   * Truthy = focus the host, `'first'` = focus the first focusable element
   * inside it. Defaults to `true` so bare `wrAutofocus` works.
   */
  readonly wrAutofocus = input(true, {
    transform: (value: unknown): boolean | 'first' => (value === 'first' ? value : coerceBooleanProperty(value)),
  });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const mode = this.wrAutofocus();
      if (!mode) return;
      // After the render, so what the same change drew is there to take focus.
      afterNextRender(
        () => {
          const host = this.el.nativeElement;
          (mode === 'first' ? wrGetFocusableElements(host)[0] : host)?.focus();
        },
        { injector: this.injector }
      );
    });
  }
}
