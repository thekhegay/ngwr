/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

import { WrSquircle } from './wr-squircle';

/**
 * Standalone squircle container. Equivalent to `<div wrSquircle>` but
 * named for ergonomics in templates.
 *
 * @example
 * ```html
 * <wr-squircle [radius]="24" style="width: 160px; height: 160px; background: var(--wr-color-primary)">
 *   …
 * </wr-squircle>
 * ```
 *
 * @see https://ngwr.dev/docs/components/squircle
 */
@Component({
  selector: 'wr-squircle',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-squircle' },
  hostDirectives: [{ directive: WrSquircle, inputs: ['radius', 'smoothing', 'borderWidth', 'borderColor'] }],
})
export class WrSquircleHost {}
