import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPopconfirm } from 'ngwr/popconfirm';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-popconfirm-page',
  templateUrl: './popconfirm.html',
  imports: [
    WrButton,
    WrPopconfirm,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PopconfirmPageComponent {
  protected readonly status = signal<string>('—');

  protected readonly snippets = {
    install: `import { WrPopconfirm } from 'ngwr/popconfirm';

@Component({ imports: [WrPopconfirm] })
export class MyComponent {}`,
    basic: `<wr-btn
  color="danger"
  [wrPopconfirm]="'Delete this item?'"
  confirmText="Delete"
  confirmColor="danger"
  (confirmed)="remove()"
  (cancelled)="onCancel()"
>Delete</wr-btn>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'wrPopconfirm', description: 'Confirmation message.', type: 'string', required: true },
    { name: 'position', description: 'Anchor side.', type: "'top' | 'bottom' | 'left' | 'right'", default: "'top'" },
    { name: 'confirmText', description: 'Label for the confirm button.', type: 'string', default: "'Confirm'" },
    { name: 'cancelText', description: 'Label for the cancel button.', type: 'string', default: "'Cancel'" },
    { name: 'confirmColor', description: 'Color of the confirm button.', type: 'WrColor', default: "'primary'" },
    { name: '(confirmed)', description: 'User clicked confirm.', type: 'EventEmitter<void>', default: '—' },
    { name: '(cancelled)', description: 'User dismissed.', type: 'EventEmitter<void>', default: '—' },
  ];

  protected onConfirm(): void {
    this.status.set('Confirmed');
  }

  protected onCancel(): void {
    this.status.set('Cancelled');
  }
}
