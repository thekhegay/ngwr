/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { useI18nText } from 'ngwr/i18n';

import { WrDialogRef } from '../dialog-ref';
import { WrDialogContent, WrDialogFooter, WrDialogTitle } from '../directives';
import { WR_DIALOG_DATA } from '../tokens';
import type { WrDialogConfirmOptions } from '../types';

/**
 * The content `WrDialog.confirm()` mounts: the dialog's own title, content and
 * footer around two `wr-btn`. Not exported; the service is the API.
 */
@Component({
  selector: 'wr-dialog-confirm',
  templateUrl: './dialog-confirm.html',
  imports: [WrButton, WrDialogTitle, WrDialogContent, WrDialogFooter],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-dialog-confirm',
    '[class.wr-dialog-confirm--danger]': 'danger',
  },
})
export class WrDialogConfirm {
  protected readonly data = inject<WrDialogConfirmOptions>(WR_DIALOG_DATA);
  protected readonly ref = inject<WrDialogRef<WrDialogConfirm, boolean>>(WrDialogRef);

  protected readonly color = this.data.confirmColor ?? 'primary';
  protected readonly danger = this.color === 'danger';

  protected readonly confirmLabel = useI18nText(signal(this.data.confirmLabel ?? null), 'common.ok', 'OK');
  protected readonly cancelLabel = useI18nText(signal(this.data.cancelLabel ?? null), 'common.cancel', 'Cancel');
}
