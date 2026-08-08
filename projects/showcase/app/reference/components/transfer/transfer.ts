import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';

import { WrTransfer, type WrTransferItem } from 'ngwr/transfer';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-transfer-page',
  templateUrl: './transfer.html',
  imports: [
    JsonPipe,
    WrTransfer,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TransferComponent {
  protected readonly permissions: readonly WrTransferItem[] = [
    { value: 'read', label: 'Read records' },
    { value: 'write', label: 'Create and edit' },
    { value: 'delete', label: 'Delete records' },
    { value: 'export', label: 'Export to CSV' },
    { value: 'invite', label: 'Invite teammates' },
    { value: 'billing', label: 'Manage billing' },
    { value: 'audit', label: 'Read the audit log', disabled: true },
  ];

  protected readonly granted = signal<readonly unknown[]>(['read']);
  protected readonly searchGranted = signal<readonly unknown[]>([]);

  protected readonly snippets = {
    install: `import { WrTransfer } from 'ngwr/transfer';

@Component({ imports: [WrTransfer] })
export class MyComponent {}`,
    basic: `<wr-transfer [items]="permissions" [(value)]="granted" />`,
    searchable: `<wr-transfer
  searchable
  sourceTitle="All permissions"
  targetTitle="Granted"
  [items]="permissions"
  [(value)]="granted"
/>`,
    forms: `<!-- Signal Forms — the value is the right pane -->
<wr-transfer [items]="permissions" [formField]="form.granted" />

<!-- Classic reactive forms keep working through Angular's bridge -->
<wr-transfer [items]="permissions" [formControl]="granted" />`,
  };

  protected readonly api = API.WrTransfer;
}
