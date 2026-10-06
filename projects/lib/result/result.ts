/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrResultStatus } from './types';

/**
 * Large-illustration result / empty-state. Use after a successful action,
 * for empty list states, or 404 / 500 pages.
 *
 * @example
 * ```html
 * <wr-result status="success" title="Submitted!" description="We'll be in touch.">
 *   <button wr-btn color="primary" wrResultExtra>Continue</button>
 * </wr-result>
 *
 * <wr-result status="empty" title="No projects yet">
 *   <button wr-btn wrResultExtra>Create one</button>
 * </wr-result>
 * ```
 *
 * @see https://ngwr.dev/reference/components/result
 */
@Component({
  selector: 'wr-result',
  templateUrl: './result.html',
  encapsulation: ViewEncapsulation.None,
  // See `WrAlert`: a static `title=` feeds the input AND lands on the host,
  // where the browser draws it as a tooltip over the whole component.
  host: { '[class]': 'classes()', '[attr.title]': 'null' },
})
export class WrResult {
  /**
   * The headline — the outcome in a few words. Pair it with `description` for the
   * detail; a result with neither renders the illustration alone.
   */
  readonly title = input<string>('');
  /**
   * Secondary line under the title. Say what happens next, not what went wrong
   * again — the title has already said it.
   */
  readonly description = input<string>('');
  /**
   * Which illustration and tint to draw. `empty` is the quiet one, for a list with
   * nothing in it rather than for something that failed.
   */
  readonly status = input<WrResultStatus>('info');

  protected readonly classes = computed(() => `wr-result wr-result--${this.status()}`);
}

export type { WrResultStatus } from './types';
