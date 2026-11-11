/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDialogDefaults } from '../types';

/** What `withDialog()` provides. @internal */
export const WR_DIALOG_DEFAULTS = new InjectionToken<WrDialogDefaults>('WR_DIALOG_DEFAULTS', {
  factory: (): WrDialogDefaults => ({}),
});
