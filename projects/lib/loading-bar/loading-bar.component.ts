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
 * Drop one at the root of your shell. Reads the singleton {@link WrLoadingBar},
 * which is driven manually by `start()` / `complete()` — an HTTP interceptor, a
 * long save, anything with a beginning and an end.
 *
 * Router navigations drive it too, but only once you add
 * `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router`. That is an opt-in
 * because the subscription is what pulls `@angular/router` into the bundle: this
 * component is 2.4 kB of its own code and used to carry 66 kB of router into
 * apps that never routed.
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
