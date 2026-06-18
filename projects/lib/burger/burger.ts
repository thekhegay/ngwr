/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model } from '@angular/core';

/**
 * Animated menu toggle — three SVG strokes morph between a hamburger and a
 * close mark on `open`. Two-way bindable, so it pairs naturally with a
 * `<wr-drawer>` or any disclosure.
 *
 * The morph is pure CSS (`stroke-dasharray` / `stroke-dashoffset` tweens),
 * so it stays smooth without JS and collapses to its end state under
 * `prefers-reduced-motion`.
 *
 * @example Toggle a drawer
 * ```html
 * <wr-burger [(open)]="menuOpen" />
 * <wr-drawer [(open)]="menuOpen" position="right">…</wr-drawer>
 * ```
 *
 * @see https://ngwr.dev/components/burger
 */
@Component({
  selector: 'wr-burger',
  templateUrl: './burger.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrBurger {
  /** Two-way bindable open state. Drives the hamburger ↔ close morph. @default false */
  readonly open = model(false);

  /** Accessible label for the toggle button. @default 'Toggle menu' */
  readonly label = input('Toggle menu');

  /** Disable the toggle. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => ({
    'wr-burger': true,
    'wr-burger--opened': this.open(),
  }));

  protected toggle(): void {
    if (this.disabled()) return;
    this.open.set(!this.open());
  }
}
