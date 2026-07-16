import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrToolbar } from 'ngwr/toolbar';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-toolbar-page',
  templateUrl: './toolbar.html',
  imports: [
    WrButton,
    WrToolbar,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ToolbarPageComponent {
  protected readonly snippet = `<wr-toolbar>
  <div wrToolbarStart><strong>Items</strong></div>
  <div wrToolbarCenter><wr-btn>Grid</wr-btn> <wr-btn>List</wr-btn></div>
  <div wrToolbarEnd><wr-btn color="primary">New</wr-btn></div>
</wr-toolbar>`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'responsive', description: 'Stack zones when the box is narrow.', type: 'boolean', default: 'false' },
  ];
}
