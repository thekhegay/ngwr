/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness } from '@angular/cdk/testing';

import { WrInputHarness } from './wr-input-harness';

/**
 * Harness for `<wr-input-group>`: the clear (×) button and the spinner it draws
 * around the field it wraps. The field itself is a {@link WrInputHarness}, from
 * {@link getInput}.
 *
 * There is no `getPrefix()` / `getSuffix()`: an affix is the app's own markup,
 * so a spec reads it straight off its own template.
 *
 * @example
 * ```ts
 * const search = await loader.getHarness(WrInputGroupHarness);
 *
 * await (await search.getInput()).setValue('ada');
 * expect(await search.isLoading()).toBe(true);
 * await search.clear();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrInputGroupHarness extends ComponentHarness {
  static hostSelector = 'wr-input-group';

  /** The first field the group wraps, the one `clearable` and `loading` act on. */
  async getInput(): Promise<WrInputHarness> {
    return this.locatorFor(WrInputHarness)();
  }

  /** Whether the clear (×) button is on show: `clearable`, with text, neither disabled nor read-only. */
  async hasClearButton(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-input-group__clear')()) !== null;
  }

  /** Click the clear (×) button. Throws when it is not on show. */
  async clear(): Promise<void> {
    const button = await this.locatorForOptional('.wr-input-group__clear')();
    if (!button) {
      throw new Error(
        'WrInputGroupHarness.clear(): no clear button. It shows on a `clearable` group ' +
          'whose field has text and is neither disabled nor read-only.'
      );
    }
    await button.click();
  }

  /** Whether the group is drawing its `loading` spinner. */
  async isLoading(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-input-group__spinner')()) !== null;
  }
}
