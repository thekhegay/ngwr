import { Component, signal } from '@angular/core';

import { WrPagination } from 'ngwr/pagination';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-pagination-page',
  templateUrl: './pagination.html',
  imports: [
    WrPagination,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PaginationComponent {
  /** Shared by every demo below at `[total]="120"` — twelve pages each. */
  protected readonly page = signal(1);

  /**
   * The size-changer demo is the one pager at `[total]="320"`, so it needs its
   * own page — and it needs it MORE now, not less. `WrPagination` clamps a
   * host-written `currentPage` at both ends since the fourth sweep, so a shared
   * signal on page 13 would be yanked back to 12 by the 120-item pagers the
   * moment they saw it. Before the clamp the same sharing left them with no
   * current page and two inert arrows; either way the demos need separate state.
   */
  protected readonly fullPage = signal(1);
  protected readonly size = signal(10);

  protected readonly snippets = {
    install: `import { WrPagination } from 'ngwr/pagination';

@Component({ imports: [WrPagination] })
export class MyComponent {}`,
    basic: `<wr-pagination [total]="120" [(currentPage)]="page" />`,
    sizes: `<wr-pagination [total]="120" [(currentPage)]="page" size="sm" />
<wr-pagination [total]="120" [(currentPage)]="page" size="md" />
<wr-pagination [total]="120" [(currentPage)]="page" size="lg" />`,
    shapes: `<wr-pagination [total]="120" [(currentPage)]="page" shape="rounded" />
<wr-pagination [total]="120" [(currentPage)]="page" shape="square" />`,
    full: `<wr-pagination
  [total]="320"
  [(currentPage)]="page"
  [(pageSize)]="size"
  showTotal
  showSizeChanger
  align="end"
/>`,
  };

  protected readonly api = API.WrPagination;
}
