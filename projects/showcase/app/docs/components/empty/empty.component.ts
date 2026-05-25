import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrEmptyComponent } from 'ngwr/empty';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-empty-page',
  templateUrl: './empty.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrEmptyComponent,
    WrButtonComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class EmptyPageComponent {
  protected readonly snippets = {
    install: `import { WrEmptyComponent } from 'ngwr/empty';

@Component({ imports: [WrEmptyComponent] })
export class MyComponent {}`,
    basic: `<wr-empty />`,
    custom: `<wr-empty icon="search" title="No results">
  Try a different query or clear filters.
  <ng-container wrEmptyActions>
    <wr-btn (click)="reset()">Reset filters</wr-btn>
  </ng-container>
</wr-empty>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'icon',
      type: `WrIconName | null`,
      default: `'folder'`,
      description: 'Icon name above the title. `null` hides it.',
    },
    {
      name: 'title',
      type: 'string',
      default: `'No data'`,
      description: 'Headline shown below the icon.',
    },
  ];
}
