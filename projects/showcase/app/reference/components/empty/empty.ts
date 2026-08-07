import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrEmpty } from 'ngwr/empty';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-empty-page',
  templateUrl: './empty.html',
  imports: [
    WrEmpty,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class EmptyPageComponent {
  protected readonly snippets = {
    install: `import { WrEmpty } from 'ngwr/empty';

@Component({ imports: [WrEmpty] })
export class MyComponent {}`,
    basic: `<wr-empty />`,
    custom: `<wr-empty icon="search" title="No results">
  Try a different query or clear filters.
  <ng-container wrEmptyActions>
    <wr-btn (click)="reset()">Reset filters</wr-btn>
  </ng-container>
</wr-empty>`,
  };

  protected readonly api = API.WrEmpty;
}
