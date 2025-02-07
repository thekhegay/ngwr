import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  OnInit,
  Output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { startWith } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WrAbstractBase } from 'ngwr/cdk';
import { WrDropdownDirective, WrDropdownMenuComponent } from 'ngwr/dropdown';
import { checkmark, filter as filterIcon, provideWrIcons, WrIconComponent } from 'ngwr/icon';

import { WrTableFilterItem } from '../types';

@Component({
  selector: 'wr-table-filter',
  templateUrl: './table-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ReactiveFormsModule, WrIconComponent, WrDropdownDirective, WrDropdownMenuComponent],
  providers: [provideWrIcons([checkmark, filterIcon])],
  host: {
    class: 'wr-table-filter',
    '[class.wr-table-filter--active]': 'length > 0',
  },
})
export class WrTableFilterComponent extends WrAbstractBase implements OnInit {
  items = input.required<WrTableFilterItem[]>();

  @Output()
  readonly selectedItems = new EventEmitter<WrTableFilterItem[]>();

  protected readonly search = new FormControl<string | null>(null, { nonNullable: true });
  protected readonly filteredItems = signal<WrTableFilterItem[]>([]);

  protected get length(): number {
    return this.filteredItems().filter(i => i.isSelected).length;
  }

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(startWith(null))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(value => {
        let filtered = [...this.items()];
        if (value) {
          filtered = this.items().filter(i => {
            const searchValue = value.toLowerCase();

            const itemTitle = i.title.toLowerCase();
            const itemValue = i.value.toLowerCase();

            const hasTitle = itemTitle.includes(searchValue);
            const hasValue = itemValue.includes(searchValue);

            return hasTitle || hasValue;
          });
        }
        this.filteredItems.set(filtered);
      });
  }

  onItemSelect(item: WrTableFilterItem): void {
    const array = this.filteredItems();
    const index = array.findIndex(i => i === item);
    array[index].isSelected = !array[index].isSelected;
    this.getSelectedItems();
  }

  onResetClick(): void {
    const array = [...this.filteredItems()];
    array.map(i => (i.isSelected = false));
    this.filteredItems.set(array);
    this.selectedItems.emit([]);
  }

  getSelectedItems(): void {
    const selected = this.filteredItems().filter(i => i.isSelected);
    this.selectedItems.emit(selected);
  }
}
