import { Component, DestroyRef, inject, signal } from '@angular/core';

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

  /** The 320-item demo needs its own page: the 120-item pagers would clamp a shared one. */
  protected readonly fullPage = signal(1);
  protected readonly size = signal(10);

  /** Server-side paging demo: picking a page drops `total` to 0 for a fake 900 ms request. */
  protected readonly serverPage = signal(1);
  protected readonly serverTotal = signal(51);
  private serverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The fake request outlives navigation otherwise — it would write to
    // signals of a destroyed page.
    inject(DestroyRef).onDestroy(() => {
      if (this.serverTimer) clearTimeout(this.serverTimer);
    });
  }

  protected onServerPage(page: number): void {
    if (this.serverTimer) clearTimeout(this.serverTimer);
    this.serverPage.set(page);
    this.serverTotal.set(0);
    this.serverTimer = setTimeout(() => this.serverTotal.set(51), 900);
  }

  protected readonly snippets = {
    basic: `<wr-pagination [total]="120" [(page)]="page" />`,
    sizes: `<wr-pagination [total]="120" [(page)]="page" size="sm" />
<wr-pagination [total]="120" [(page)]="page" size="md" />
<wr-pagination [total]="120" [(page)]="page" size="lg" />`,
    shapes: `<wr-pagination [total]="120" [(page)]="page" shape="rounded" />
<wr-pagination [total]="120" [(page)]="page" shape="square" />`,
    full: `<wr-pagination
  [total]="320"
  [(page)]="page"
  [(pageSize)]="size"
  showTotal
  showSizeChanger
  align="end"
/>`,
    serverHtml: `<wr-pagination
  [total]="total()"
  [page]="page()"
  (pageChange)="page.set($event)"
/>`,
    serverTs: `private readonly http = inject(HttpClient);

readonly page = signal(1);
readonly size = signal(10);

// The resource drops its value while a new page loads, so total reads 0.
private readonly result = rxResource({
  params: () => ({ page: this.page(), size: this.size() }),
  stream: ({ params }) => this.http.get<{ data: User[]; total: number }>('/api/users', { params }),
});

readonly rows = computed(() => this.result.value()?.data ?? []);
readonly total = computed(() => this.result.value()?.total ?? 0);`,
    sizeHtml: `<wr-pagination
  showSizeChanger
  [total]="total()"
  [page]="page()"
  (pageChange)="page.set($event)"
  [pageSize]="size()"
  (pageSizeChange)="onSizeChange($event)"
/>`,
    sizeReset: `onSizeChange(next: number): void {
  this.size.set(next);
  this.page.set(1);
}`,
    lastGoodTotal: `readonly total = linkedSignal<number | undefined, number>({
  source: () => this.result.value()?.total,
  computation: (next, previous) => next ?? previous?.value ?? 0,
});`,
  };

  protected readonly api = API.WrPagination;
}
