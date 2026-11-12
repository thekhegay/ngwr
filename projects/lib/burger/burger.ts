/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

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
 * @see https://ngwr.dev/reference/components/burger
 */
@Component({
  selector: 'wr-burger',
  templateUrl: './burger.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-burger', '[class]': 'classes()' },
})
export class WrBurger {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('burger');
  }

  /** Two-way bindable open state. Drives the hamburger ↔ close morph. @default false */
  readonly open = model(false);

  /**
   * Accessible name for the toggle button. Falls back to `burger.label`, then
   * `'Toggle menu'`.
   */
  readonly label = input<string | null>(null);

  protected readonly resolvedLabel = useI18nText(this.label, 'burger.label', 'Toggle menu');

  /** Disable the toggle. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => ({
    'wr-burger--opened': this.open(),
  }));

  protected toggle(): void {
    if (this.disabled()) return;
    this.open.set(!this.open());
  }
}
