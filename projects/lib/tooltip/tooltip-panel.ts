/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Internal floating label rendered by `WrTooltip` inside a CDK
 * overlay. Not part of the public template API.
 *
 * @internal
 */
@Component({
  selector: 'wr-tooltip',
  template: '{{ text() }}',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-tooltip', role: 'tooltip' },
})
export class WrTooltipPanel {
  readonly text = input.required<string>();
}
