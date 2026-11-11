/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WR_DIALOG_DEFAULTS } from './tokens';
import type { WrDialogDefaults } from './types';

/**
 * App-wide dialog defaults, as a feature of `provideWr()`: today `tabTitle`,
 * so every dialog names the browser tab while it is open. The same option on
 * `open()` or `confirm()` still wins.
 *
 * Bootstrap only: `WrDialog` is root-provided and reads it once, from the root
 * injector, so in a route's `providers` it changes nothing.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withDialog } from 'ngwr/dialog';
 *
 * bootstrapApplication(App, {
 *   providers: [provideWr(withDialog({ tabTitle: true }))],
 * });
 * ```
 */
export function withDialog(defaults: WrDialogDefaults): WrFeature<'dialog'> {
  return wrFeature('dialog', [{ provide: WR_DIALOG_DEFAULTS, useValue: defaults }]);
}
