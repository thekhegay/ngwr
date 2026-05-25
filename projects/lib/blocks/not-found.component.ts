/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Pre-built 404 page. Big numeric headline + customizable message and
 * actions slot.
 *
 * @example
 * ```html
 * <wr-block-not-found title="Page not found" subtitle="That URL doesn't exist.">
 *   <a wrNotFoundActions routerLink="/">Back home</a>
 * </wr-block-not-found>
 * ```
 *
 * @see https://ngwr.dev/docs/components/blocks
 */
@Component({
  selector: 'wr-block-not-found',
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-block-not-found' },
})
export class WrBlockNotFoundComponent {
  readonly code = input<string>('404');
  readonly title = input<string>('Page not found');
  readonly subtitle = input<string>("That page doesn't exist or has moved.");
}
