/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDialogConfirmOptions } from '../types';

/** What the service hands `WrDialogConfirm`: `alert` drops the cancel button. */
export type WrDialogConfirmData = Pick<
  WrDialogConfirmOptions,
  'title' | 'message' | 'confirmLabel' | 'cancelLabel' | 'confirmColor' | 'intent'
> & { readonly alert?: boolean };
