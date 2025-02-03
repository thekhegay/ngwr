/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  model,
  numberAttribute,
  HostBinding,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButtonComponent } from 'ngwr/button';
import { provideWrIcons, arrowBack, arrowForward } from 'ngwr/icon';
import { WrSelectComponent } from 'ngwr/select';
import { WrOptionComponent } from 'ngwr/select/select-option.component';

import { WrPaginationPosition } from './pagination.types';

@Component({
  selector: 'wr-pagination',
  standalone: true,
  imports: [WrButtonComponent, WrSelectComponent, WrOptionComponent, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideWrIcons([arrowBack, arrowForward])],
})
export class WrPaginationComponent {
  currentPage = model<number>(1);
  total = input<number, number>(0, { transform: numberAttribute });
  pageSize = model<number>(10);
  pageSizeOptions = input<number[]>([10, 20, 50, 100]);
  showSizeChanger = input<boolean, boolean>(false, { transform: booleanAttribute });
  showTotal = input<boolean, boolean>(false, { transform: booleanAttribute });
  position = input<WrPaginationPosition>('start');
  disabled = input<boolean, boolean>(false, { transform: booleanAttribute });
  ofLabel = input<string>('of');

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-pagination': true,
      'wr-pagination--disabled': this.disabled(),
    };
  }

  protected readonly String = String;

  protected readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()));

  protected readonly currentRange = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.total());
    return `${start}-${end} ${this.ofLabel()} ${this.total()}`;
  });

  protected readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const items: (number | '...')[] = [];

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    items.push(1);

    if (current > 4) {
      items.push('...');
    }

    let start: number;
    let end: number;

    if (current <= 4) {
      start = 2;
      end = 5;
    } else if (current >= total - 3) {
      start = total - 4;
      end = total - 1;
    } else {
      start = current - 2;
      end = current + 2;
    }

    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (current < total - 3) {
      items.push('...');
    }

    if (end !== total) {
      items.push(total);
    }

    return items;
  });

  protected isCurrentPage(page: number): boolean {
    return this.currentPage() === page;
  }

  protected onPageChange(page: number): void {
    if (this.disabled() || page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  protected onPageSizeChange(size: number): void {
    if (this.disabled() || size === this.pageSize()) {
      return;
    }

    this.pageSize.set(size);

    const newTotalPages = Math.ceil(this.total() / size);
    if (this.currentPage() > newTotalPages) {
      this.onPageChange(newTotalPages);
    }
  }
}
