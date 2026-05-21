/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDialogRef } from '../dialog-ref';

/**
 * Token exposing the open dialog's `WrDialogRef` to components and
 * directives rendered inside it (e.g. `[wrDialogClose]`).
 *
 * @internal
 */
export const WR_DIALOG_REF = new InjectionToken<WrDialogRef<unknown, unknown>>('WR_DIALOG_REF');
