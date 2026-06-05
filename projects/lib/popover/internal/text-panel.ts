/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Internal floating label rendered when `<… [wrPopover]="'…'" mode="tooltip">`
 * receives a string instead of a template. Not part of the public template
 * API — use the `WrPopover` directive in tooltip mode instead.
 *
 * @internal
 */
@Component({
  selector: 'wr-popover-text',
  template: '{{ text() }}',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-tooltip', role: 'tooltip' },
})
export class WrPopoverTextPanel {
  readonly text = input.required<string>();
}
