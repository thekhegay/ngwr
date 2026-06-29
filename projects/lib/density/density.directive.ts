/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, ElementRef, effect, inject, input } from '@angular/core';

import { WR_DENSITY_CONFIG, type WrDensityValue } from './density-config';

/**
 * Scope a density override to a subtree. Writes the same `data-*`
 * attribute the global service writes — but on the host instead of
 * `<html>` — so the CSS-variable scope rules cascade only to descendants.
 *
 * @example
 * ```html
 * <!-- The whole sidebar is sm, the rest of the app keeps its global density. -->
 * <aside wrDensity="sm">
 *   <wr-list ...></wr-list>
 * </aside>
 * ```
 */
@Directive({
  selector: '[wrDensity]',
})
export class WrDensityDirective {
  /** Density to apply to this subtree. */
  readonly wrDensity = input.required<WrDensityValue>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly config = inject(WR_DENSITY_CONFIG);

  constructor() {
    effect(() => {
      this.host.nativeElement.setAttribute(this.config.attribute, this.wrDensity());
    });
  }
}
