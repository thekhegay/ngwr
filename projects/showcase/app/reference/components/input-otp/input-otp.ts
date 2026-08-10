import { Component, signal } from '@angular/core';

import { WrInputOtp } from 'ngwr/input-otp';

import {
  DocApiComponent,
  type DocApiRow,
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

  protected readonly snippets = {
    install: `import { WrInputOtp } from 'ngwr/input-otp';

@Component({ imports: [WrInputOtp] })
export class MyComponent {
  protected code = '';
  protected verify(code: string) { /* … */ }
}`,

    basic: `<wr-input-otp [(value)]="code" length="6" (completed)="verify($event)" />`,

    masked: `<wr-input-otp [(value)]="secret" mask />`,

    alpha: `<wr-input-otp [(value)]="alphaNumeric" mode="alphanumeric" length="8" />`,
  };

  protected readonly api = API.WrInputOtp;

  protected readonly events: readonly DocApiRow[] = [
    {
      name: 'completed',
      description: 'Fires once every cell holds a character — useful for auto-submit.',
      type: '(value: string) => void',
      default: '—',
    },
  ];

  protected onCompleted(value: string): void {
    this.lastCompleted.set(value);
  }
}
