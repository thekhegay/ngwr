/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { Service, inject } from '@angular/core';

/**
 * Page scroll lock shared by every modal NGWR overlay.
 *
 * CDK's `block()` strategy has no counter: a second one refuses to engage while
 * the first holds the page, and its `disable()` is then a no-op, so closing the
 * first of two stacked modals released the page under the one still open. Here
 * every strategy is a holder, the page stays blocked while any holder is
 * enabled and is released when the last one disables, in whatever order.
 *
 * @internal
 */
@Service()
export class WrScrollBlock {
  private readonly block = inject(ScrollStrategyOptions).block();
  private holders = 0;

  /** A scroll strategy for one overlay (or one component) that blocks the page while it is enabled. */
  strategy(): ScrollStrategy {
    let held = false;
    return {
      attach: () => undefined,
      enable: () => {
        if (!held) {
          held = true;
          this.holders++;
        }
        // CDK ignores an enable while the page is already blocked, and one that
        // found nothing to block at the first holder may find it at a later one.
        this.block.enable();
      },
      disable: () => {
        if (!held) return;
        held = false;
        if (--this.holders === 0) this.block.disable();
      },
    };
  }
}
