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
  protected readonly dirty = signal(false);

  protected readonly positions: readonly WrPopconfirmPosition[] = [
    'top',
    'top-start',
    'top-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'left-start',
    'left-end',
    'right',
    'right-start',
    'right-end',
  ];

  protected readonly snippets = {
    positions: `<wr-btn wrPopconfirm="Delete this item?" position="bottom-start" (confirmed)="remove()">Delete</wr-btn>`,
    basic: `<wr-btn
  color="danger"
  wrPopconfirm="Delete this item?"
  confirmText="Delete"
  confirmColor="danger"
  (confirmed)="remove()"
  (cancelled)="onCancel()"
>Delete</wr-btn>`,
    disabled: `<!-- Ask only when there is something to lose -->
<wr-btn
  wrPopconfirm="Discard your changes?"
  [wrPopconfirmDisabled]="!dirty()"
  (click)="!dirty() && close()"
  (confirmed)="close()"
>Close</wr-btn>`,
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
