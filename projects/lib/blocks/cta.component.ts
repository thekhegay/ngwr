/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Call-to-action banner. Title + subtitle + actions slot.
 *
 * @example
 * ```html
 * <wr-block-cta title="Ready to ship?" subtitle="Start building today.">
 *   <button wrCtaActions>Get started</button>
 * </wr-block-cta>
 * ```
 *
 * @see https://ngwr.dev/docs/components/blocks
 */
@Component({
  selector: 'wr-block-cta',
  templateUrl: './cta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-block-cta' },
})
export class WrBlockCtaComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
}
