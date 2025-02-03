/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';

import { WrPaginationComponent } from 'ngwr/pagination';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CodeComponent, SnippetComponent, WrPaginationComponent, WrTagComponent],
})
export class PaginationComponent implements OnInit {
  @HostBinding()
  class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  title = 'Pagination';
  description = 'A long list can be divided into several pages using Pagination';

  current = 1;
  pageSize = 10;
  total = 50;
  currentLarge = 1;
  pageSizeLarge = 10;
  totalLarge = 200;

  code = {
    import: `import { WrPaginationComponent } from "ngwr/pagination";`,
    component: `@Component({
                  //...,
                  imports: [WrPaginationComponent],
                })
                export class MyComponent {}`,
    basic: `<wr-pagination
              [total]="50"
              [(currentPage)]="current"
              [(pageSize)]="pageSize"
            ></wr-pagination>`,
    position: `<wr-pagination
                [total]="50"
                [(currentPage)]="current"
                [(pageSize)]="pageSize"
                position="start"
              ></wr-pagination>

              <wr-pagination
                [total]="50"
                [(currentPage)]="current"
                [(pageSize)]="pageSize"
                position="center"
              ></wr-pagination>

              <wr-pagination
                [total]="50"
                [(currentPage)]="current"
                [(pageSize)]="pageSize"
                position="end"
              ></wr-pagination>`,
    withSizeChanger: `<wr-pagination
                        [total]="50"
                        [(currentPage)]="current"
                        [(pageSize)]="pageSize"
                        [showSizeChanger]="true"
                      ></wr-pagination>`,
    withTotal: `<wr-pagination
                  [total]="50"
                  [(currentPage)]="current"
                  [(pageSize)]="pageSize"
                  [showTotal]="true"
                ></wr-pagination>`,
    morePages: `<wr-pagination
                  [total]="200"
                  [(currentPage)]="current"
                  [(pageSize)]="pageSize"
                ></wr-pagination>`,
    disabled: `<wr-pagination
                  [total]="50"
                  [(currentPage)]="current"
                  [(pageSize)]="pageSize"
                  [disabled]="true"
                ></wr-pagination>`,
    styling: `:root {
                --wr-pagination-gap: 1rem;
                --wr-pagination-items-gap: 0.5rem;
                --wr-pagination-font-size: 0.875rem;
                --wr-pagination-total-color: var(--wr-color-medium);
                --wr-pagination-ellipsis-color: var(--wr-color-medium);

                --wr-pagination-item-size: 1.625rem;
                --wr-pagination-item-padding: 0.5rem;

                --wr-pagination-select-option-height: var(--wr-pagination-item-size);
                --wr-pagination-select-padding-y: 0;
                --wr-pagination-select-padding-x: 0.825rem;
              }`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(this.title);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['pagination', 'wr-pagination']);
  }
}
