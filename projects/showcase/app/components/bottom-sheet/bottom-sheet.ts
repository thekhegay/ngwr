import { Component, signal } from '@angular/core';

import { WrBottomSheet } from 'ngwr/bottom-sheet';
import { WrButton } from 'ngwr/button';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-bottom-sheet-page',
  templateUrl: './bottom-sheet.html',
  imports: [
    WrBottomSheet,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BottomSheetPage {
  protected readonly open = signal(false);
  protected readonly openTall = signal(false);

  protected readonly snippet = `<wr-bottom-sheet [(open)]="open" height="40vh">
  <h2>Quick actions</h2>
  <p>Project content here. Backdrop click or Escape closes.</p>
</wr-bottom-sheet>

<button wr-btn color="primary" (click)="open.set(true)">Open</button>`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'open', description: 'Two-way bindable open state.', type: 'boolean (model)', default: 'false' },
    { name: 'height', description: 'Sheet height (any CSS length).', type: 'string', default: "'auto'" },
    {
      name: 'maxHeight',
      description: 'Cap so the sheet never covers the whole viewport.',
      type: 'string',
      default: "'90vh'",
    },
    { name: 'hasBackdrop', description: 'Show the dimming backdrop.', type: 'boolean', default: 'true' },
    {
      name: 'closeOnBackdropClick',
      description: 'Close when the backdrop is clicked.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'closeOnEscape', description: 'Close on Escape.', type: 'boolean', default: 'true' },
    { name: 'showHandle', description: 'Show the visual drag-handle indicator.', type: 'boolean', default: 'true' },
    {
      name: 'ariaLabel',
      description: 'Accessible label for the dialog region.',
      type: 'string',
      default: "'Bottom sheet'",
    },
  ];
}
