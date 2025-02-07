import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import { arrowTop, provideWrIcons, WrIconComponent } from 'ngwr/icon';

import { WrTableOrder } from '../types';

@Component({
  selector: 'wr-table-sort',
  templateUrl: './table-sort.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideWrIcons([arrowTop])],
  imports: [WrIconComponent],
  host: {
    class: 'wr-table-sort',
    '[class.wr-table-sort--asc]': 'order() === TableOrder.ASC',
    '[class.wr-table-sort--desc]': 'order() === TableOrder.DESC',
  },
})
export class WrTableSortComponent {
  order = input<WrTableOrder>();

  protected readonly TableOrder = WrTableOrder;
}
