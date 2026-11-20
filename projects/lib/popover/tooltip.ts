/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, inject } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WR_TOOLTIP_ONLY } from './internal/tooltip-only';
import { WrPopover } from './popover';

/**
 * Short form of `[wrPopover]` with `mode="tooltip"`: the same panel, delays,
 * hover and keyboard-focus trigger, and the same naming of an icon-only button.
 *
 * It is `WrPopover` as a host directive, so the inputs keep their `wrPopover`
 * names, and `#tip="wrTooltip"` reaches it as `tip.popover` (`tip.popover.isOpen()`).
 * Do not put `[wrPopover]` on the same element.
 *
 * @example
 * ```html
 * <wr-btn icon="trash" wrTooltip="Delete" />
 * <wr-btn wrTooltip="Save changes" position="bottom">Save</wr-btn>
 * ```
 *
 * @see https://ngwr.dev/reference/components/popover
 */
@Directive({
  selector: '[wrTooltip]',
  exportAs: 'wrTooltip',
  providers: [{ provide: WR_TOOLTIP_ONLY, useValue: true }],
  hostDirectives: [
    {
      directive: WrPopover,
      inputs: [
        'wrPopover: wrTooltip',
        'position',
        'showDelay',
        'hideDelay',
        'wrPopoverOrigin',
        'wrPopoverDisabled',
        'panelClass',
      ],
      outputs: ['opened', 'closed'],
    },
  ],
})
export class WrTooltip {
  /** The hosted popover: `isOpen()`, `open()`, `close()`. */
  readonly popover = inject(WrPopover, { self: true });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('popover');
  }
}
