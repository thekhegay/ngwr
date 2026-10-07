import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { type WrPopconfirmPosition, WrPopconfirm } from 'ngwr/popconfirm';

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

  protected readonly positions: readonly WrPopconfirmPosition[] = ['top', 'bottom', 'left', 'right'];

  protected readonly snippets = {
    positions: `<wr-btn wrPopconfirm="Delete this item?" position="bottom" (confirmed)="remove()">Delete</wr-btn>`,
    basic: `<wr-btn
  color="danger"
  wrPopconfirm="Delete this item?"
  confirmText="Delete"
  confirmColor="danger"
  (confirmed)="remove()"
  (cancelled)="onCancel()"
>Delete</wr-btn>`,
    exportAs: `<wr-btn wrPopconfirm="Delete this file?" #ask="wrPopconfirm" (confirmed)="remove()">
  Delete
</wr-btn>

<!-- Anywhere else in the same template -->
<wr-btn [disabled]="ask.isOpen()" (click)="ask.open()">Ask again</wr-btn>`,
  };

  protected readonly api = API.WrPopconfirm;

  protected onConfirm(): void {
    this.status.set('Confirmed');
  }

  protected onCancel(): void {
    this.status.set('Cancelled');
  }
}
