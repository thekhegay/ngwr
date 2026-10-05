import { Component, signal } from '@angular/core';

import { WrInputOtp } from 'ngwr/input-otp';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-input-otp-page',
  templateUrl: './input-otp.html',
  imports: [WrInputOtp, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class InputOtpPageComponent {
  protected code = '';
  protected codeShort = '';
  protected secret = '';
  protected alphaNumeric = '';
  protected readonly lastCompleted = signal<string | null>(null);

  /** Pre-filled so the read-only strip has something to announce. */
  protected lockedCode = '428159';

  protected readonly snippets = {
    states: `<wr-input-otp disabled [(value)]="code" />
<wr-input-otp readonly [(value)]="code" />`,
    basic: `<wr-input-otp [(value)]="code" length="6" (completed)="verify($event)" />`,

    masked: `<wr-input-otp [(value)]="secret" mask />`,

    alpha: `<wr-input-otp [(value)]="alphaNumeric" mode="alphanumeric" length="8" />`,
  };

  protected readonly api = API.WrInputOtp;

  protected onCompleted(value: string): void {
    this.lastCompleted.set(value);
  }
}
