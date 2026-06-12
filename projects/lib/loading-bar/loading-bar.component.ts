/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrLoadingBar } from './services/loading-bar';

/**
 * Thin progress bar fixed to the top of the viewport.
 *
 * Drop one at the root of your shell. Reads the singleton {@link WrLoadingBar}
 * — every router navigation drives it automatically; HTTP interceptors
 * can call `start()` / `complete()` to add their own slots.
 *
 * @example
 * ```html
 * <wr-loading-bar />               <!-- top, primary color -->
 * <wr-loading-bar color="#9b51e0" height="3px" />
 * ```
 */
@Component({
  selector: 'wr-loading-bar',
  templateUrl: './loading-bar.component.html',
  styleUrl: './loading-bar.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-loading-bar' },
})
export class WrLoadingBarComponent {
  /** Bar colour. Defaults to the primary brand colour. */
  readonly color = input<string>('var(--wr-color-primary)');

  /** Bar height. */
  readonly height = input<string>('2px');

  protected readonly bar = inject(WrLoadingBar);

  protected readonly active = computed(() => this.bar.state() !== 'idle');
}
