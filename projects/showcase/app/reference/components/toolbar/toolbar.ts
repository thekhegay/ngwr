import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrToolbar } from 'ngwr/toolbar';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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
  protected readonly install = `import { WrToolbar } from 'ngwr/toolbar';

@Component({ imports: [WrToolbar] })
export class MyComponent {}`;

  protected readonly snippet = `<wr-toolbar>
  <div wrToolbarStart><strong>Items</strong></div>
  <div wrToolbarCenter><wr-btn>Grid</wr-btn> <wr-btn>List</wr-btn></div>
  <div wrToolbarEnd><wr-btn color="primary">New</wr-btn></div>
</wr-toolbar>`;

  protected readonly api = API.WrToolbar;
}
