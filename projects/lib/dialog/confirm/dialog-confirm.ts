/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

import { WrDialogRef } from '../dialog-ref';
import { WrDialogContent, WrDialogFooter, WrDialogTitle } from '../directives';
import { WR_DIALOG_DATA } from '../tokens';
import type { WrDialogIntent } from '../types';

import type { WrDialogConfirmData } from './dialog-confirm-data';

const INTENT_COLORS: Partial<Record<WrDialogIntent, 'danger' | 'warning'>> = { danger: 'danger', warning: 'warning' };

/**
 * The content `WrDialog.confirm()` and `WrDialog.alert()` mount: the dialog's
 * own title, content and footer around two `wr-btn`, or one for an alert. Not
 * exported; the service is the API.
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
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('dialog');
  }

  protected readonly data = inject<WrDialogConfirmData>(WR_DIALOG_DATA);
  protected readonly ref = inject<WrDialogRef<WrDialogConfirm, boolean>>(WrDialogRef);

  protected readonly alert = this.data.alert === true;
  protected readonly intent = this.data.intent ?? null;
  // An alert's button dismisses a message, so it never takes the intent's color.
  protected readonly color =
    this.data.confirmColor ?? (this.alert || !this.intent ? 'primary' : (INTENT_COLORS[this.intent] ?? 'primary'));
  protected readonly danger = this.color === 'danger';

  protected readonly confirmLabel = useI18nText(signal(this.data.confirmLabel ?? null), 'common.ok', 'OK');
  protected readonly cancelLabel = useI18nText(signal(this.data.cancelLabel ?? null), 'common.cancel', 'Cancel');
}
