/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/** Built-in status — picks the default icon + accent colour. */
export type WrResultStatus = 'success' | 'warning' | 'error' | 'info' | 'empty';

/**
 * Large-illustration result / empty-state. Use after a successful action,
 * for empty list states, or 404 / 500 pages.
 *
 * @example
 * ```html
 * <wr-result status="success" title="Submitted!" description="We'll be in touch.">
 *   <button wrButton color="primary" wrResultExtra>Continue</button>
 * </wr-result>
 *
 * <wr-result status="empty" title="No projects yet">
 *   <button wrButton wrResultExtra>Create one</button>
 * </wr-result>
 * ```
 *
 * @see https://ngwr.dev/docs/components/result
 */
@Component({
  selector: 'wr-result',
  templateUrl: './result.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrResult {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly status = input<WrResultStatus>('info');

  protected readonly classes = computed(() => `wr-result wr-result--${this.status()}`);
}
