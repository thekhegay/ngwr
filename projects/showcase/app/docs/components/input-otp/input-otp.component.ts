import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputOtpComponent } from 'ngwr/input-otp';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-input-otp-page',
  templateUrl: './input-otp.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrInputOtpComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class InputOtpPageComponent {
  protected code = '';
  protected codeShort = '';
  protected secret = '';
  protected alphaNumeric = '';
  protected readonly lastCompleted = signal<string | null>(null);

  protected readonly snippets = {
    install: `import { WrInputOtpComponent } from 'ngwr/input-otp';

@Component({ imports: [WrInputOtpComponent, FormsModule] })
export class MyComponent {
  protected code = '';
  protected verify(code: string) { /* … */ }
}`,

    basic: `<wr-input-otp [(ngModel)]="code" length="6" (completed)="verify($event)" />`,

    masked: `<wr-input-otp [(ngModel)]="secret" mask />`,

    alpha: `<wr-input-otp [(ngModel)]="alphaNumeric" mode="alphanumeric" length="8" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'length', description: 'Number of cells. Clamped to `[1, 20]`.', type: 'number', default: '6' },
    {
      name: 'mode',
      description: 'Character set per cell.',
      type: "'numeric' | 'alphanumeric' | 'text'",
      default: "'numeric'",
    },
    { name: 'mask', description: 'Hide typed characters (`type="password"`).', type: 'boolean', default: 'false' },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'placeholder', description: 'Character shown in empty cells.', type: 'string', default: "'•'" },
  ];

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
