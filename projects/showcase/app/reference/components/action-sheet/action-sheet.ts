import { Component, signal } from '@angular/core';

import { WrActionSheet, type WrActionSheetAction } from 'ngwr/action-sheet';
import { WrButton } from 'ngwr/button';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-action-sheet-page',
  templateUrl: './action-sheet.html',
  imports: [
    WrActionSheet,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ActionSheetPageComponent {
  protected readonly open = signal(false);
  protected readonly picked = signal<string>('');

  protected readonly actions: readonly WrActionSheetAction[] = [
    { label: 'Take Photo', value: 'camera' },
    { label: 'Choose from Library', value: 'library' },
    { label: 'Delete', role: 'destructive', value: 'delete' },
    { label: 'Cancel', role: 'cancel', value: 'cancel' },
  ];

  protected onPick(action: WrActionSheetAction): void {
    this.picked.set(action.label);
  }

  protected readonly htmlSnippet = `<wr-btn (click)="open.set(true)">Open action sheet</wr-btn>

<wr-action-sheet [(open)]="open" title="Photo" [actions]="actions" (action)="onPick($event)" />`;

  protected readonly tsSnippet = `protected readonly open = signal(false);

protected readonly actions: WrActionSheetAction[] = [
  { label: 'Take Photo', value: 'camera' },
  { label: 'Choose from Library', value: 'library' },
  { label: 'Delete', role: 'destructive', value: 'delete' },
  { label: 'Cancel', role: 'cancel' },
];

onPick(action: WrActionSheetAction): void {
  // action.value === 'camera' | 'library' | 'delete' | 'cancel'
}`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'open', description: 'Whether the sheet is open (two-way).', type: 'model<boolean>', default: 'false' },
    { name: 'actions', description: 'The rows to offer.', type: 'WrActionSheetAction[]', default: '[]' },
    { name: 'title', description: 'Bold heading above the rows.', type: 'string', default: "''" },
    { name: 'message', description: 'Muted sub-heading under the title.', type: 'string', default: "''" },
    {
      name: 'action',
      description: 'Fires with the chosen row (never on a dismiss).',
      type: 'output<WrActionSheetAction>',
      default: '—',
    },
    { name: 'WrActionSheetAction', description: 'A single row.', type: 'interface', default: '—' },
    { name: 'label', description: 'Row label.', type: 'string', default: '—', sub: true },
    { name: 'value', description: 'Payload echoed back in `action`.', type: 'unknown', default: '—', sub: true },
    { name: 'icon', description: 'Optional leading `wr-icon` name.', type: 'string', default: '—', sub: true },
    {
      name: 'role',
      description: "'destructive' paints danger; 'cancel' drops to a bottom group.",
      type: "'default' | 'destructive' | 'cancel'",
      default: "'default'",
      sub: true,
    },
    { name: 'disabled', description: 'Disable the row.', type: 'boolean', default: 'false', sub: true },
  ];
}
