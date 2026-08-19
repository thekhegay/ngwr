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
   * own page. `WrPagination` clamps in an effect that tracks `totalPages()`
   * and reads `currentPage()` untracked, so a page written from outside is
   * never pulled back into range: picking page 13+ here used to leave every
   * 120-item pager on the page with no current page and two inert arrows.
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
