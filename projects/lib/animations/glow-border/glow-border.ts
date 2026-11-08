/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { Directive, PLATFORM_ID, computed, inject, input } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * A short arc of brand light that runs round the host's edge for ever, with a
 * soft glow spilling outward. CSS does all of it: this class only decides
 * whether the arc turns. It stays lit but still under
 * `prefers-reduced-motion: reduce`, while the tab is hidden and on the server.
 * The host needs `position: relative`; `wr-btn` has it. The blurred copy of
 * the arc sits at a negative z-index, so the host's stacking parent isolates
 * itself (`isolation: isolate`) to keep it above the page background. The
 * host's own hover and focus states are untouched, and its focus ring paints
 * above the arc. Styles: `@use 'ngwr/animations/glow-border'`, which also
 * lists the `--wr-glow-border-*` hooks.
 */
@Directive({
  selector: '[wrGlowBorder]',
  host: {
    class: 'wr-glow-border',
    '[class.wr-glow-border--live]': 'live()',
  },
})
export class WrGlowBorder {
  /** Stops the arc without removing the directive. @default true */
  readonly active = input(true);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  protected readonly live = computed(
    () => this.isBrowser && this.active() && !this.platform.prefersReducedMotion() && this.platform.pageVisible()
  );

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/glow-border');
  }
}
