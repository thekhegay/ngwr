import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPopconfirm } from 'ngwr/popconfirm';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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

  protected readonly api = API.WrPopconfirm;

  protected onConfirm(): void {
    this.status.set('Confirmed');
  }

  protected onCancel(): void {
    this.status.set('Cancelled');
  }
}
