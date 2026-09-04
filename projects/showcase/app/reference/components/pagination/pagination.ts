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

  /**
   * The size-changer demo is the one pager at `[total]="320"`, so it needs its
   * own page — and it needs it MORE now, not less. `WrPagination` clamps a
   * host-written `page` at both ends since the fourth sweep, so a shared
   * signal on page 13 would be yanked back to 12 by the 120-item pagers the
   * moment they saw it. Before the clamp the same sharing left them with no
   * current page and two inert arrows; either way the demos need separate state.
   */
  protected readonly fullPage = signal(1);
  protected readonly size = signal(10);

  /**
   * Server-side paging demo. Stands in for a `resource` whose value is dropped
   * whenever its params change: picking a page holds the page, drops `total`
   * to 0 for the length of the fake request, then restores it. Fifty-one items
   * at the default size of ten, so the settled strip is six pages.
   */
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
    install: `import { WrPagination } from 'ngwr/pagination';

@Component({ imports: [WrPagination] })
export class MyComponent {}`,
    basic: `<wr-pagination [total]="120" [(page)]="page" />`,
    a11y: `<!-- What \`<wr-pagination [total]="120" [(page)]="page" />\` renders, in the
     shape a Playwright or Testing Library locator sees. Tab reaches every
     cell; Enter and Space activate the focused one; arrow keys do nothing. -->
<wr-pagination role="navigation" aria-label="Pagination" class="wr-pagination wr-pagination--md …">
  <div class="wr-pagination__inner">
    <div class="wr-pagination__nav">
      <wr-btn role="button" tabindex="0" aria-label="Previous page" class="wr-pagination__nav-btn">…</wr-btn>
      <wr-btn role="button" tabindex="0" aria-label="Go to page 1" aria-current="page" class="wr-pagination__page">1</wr-btn>
      <wr-btn role="button" tabindex="0" aria-label="Go to page 2" class="wr-pagination__page">2</wr-btn>
      <span class="wr-pagination__ellipsis">…</span>
      <wr-btn role="button" tabindex="0" aria-label="Next page" class="wr-pagination__nav-btn">…</wr-btn>
    </div>
  </div>
</wr-pagination>

<!-- \`<wr-btn>\` is a custom element, so the role and tabindex are attributes it
     writes rather than native button semantics: query by role and name.

       page.getByRole('button', { name: 'Go to page 2' }).click();
       expect(page.getByRole('button', { name: 'Go to page 2' }))
         .toHaveAttribute('aria-current', 'page');

     The current cell is the one carrying \`aria-current="page"\`. A disabled
     arrow at the end of the range carries \`aria-disabled="true"\` and loses its
     \`tabindex\`; the \`disabled\` attribute is written too, but it is inert on a
     custom element — there is no \`disabled\` DOM property to read. -->`,
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

// The params function builds a fresh object literal every run, so it
// is never reference-equal to the last one: the resource drops its
// value the moment the page changes and regains it only when the
// response lands. That gap is what total reads as 0.
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
    sizeReset: `// Reset — one request, and it is for a page that exists.
onSizeChange(next: number): void {
  this.size.set(next);
  this.page.set(1);
}`,
    sizeKeep: `// Keep the page — nothing corrects it while total reads 0, so this
// can request a page the new size no longer has. The response is
// what corrects it.
onSizeChange(next: number): void {
  this.size.set(next);
}`,
    lastGoodTotal: `// The total from the last response that carried one, held
// across the next request.
readonly total = linkedSignal<number | undefined, number>({
  source: () => this.result.value()?.total,
  computation: (next, previous) => next ?? previous?.value ?? 0,
});`,
  };

  protected readonly api = API.WrPagination;
}
