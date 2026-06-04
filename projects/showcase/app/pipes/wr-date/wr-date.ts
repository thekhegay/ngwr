import { Component, signal } from '@angular/core';

import { WrDate } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-date-page',
  templateUrl: './wr-date.html',
  imports: [WrDate, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class WrDatePipePage {
  protected readonly now = signal(new Date());

  protected readonly snippets = {
    install: `import { WrDate } from 'ngwr/pipes';

@Component({ imports: [WrDate] })
export class MyComponent { /* ... */ }`,

    usage: `{{ now | wrDate }}                          <!-- shortDate            -->
{{ now | wrDate: 'mediumDateTime' }}        <!-- named key            -->
{{ now | wrDate: 'dd.MM.yyyy' }}            <!-- raw token string     -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDate',
      description:
        'Delegates to WrDateAdapter when provided; falls back to Intl.DateTimeFormat with the same named keys.',
      type: "(value: Date | string | number, format = 'shortDate') => string",
      default: '—',
    },
  ];
}
