/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  HostBinding,
  inject,
  booleanAttribute,
  TemplateRef,
  ContentChild,
} from '@angular/core';

import { SafeAny } from '../cdk/types';

import { WrSelectComponent } from './select.component';

@Component({
  selector: 'wr-option',
  templateUrl: './select-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    '(click)': 'select()',
  },
  imports: [NgTemplateOutlet],
})
export class WrOptionComponent {
  @Input()
  value: SafeAny;

  @Input()
  label?: string;

  @Input({ transform: booleanAttribute })
  disabled = false;

  @ContentChild(TemplateRef)
  customTemplate?: TemplateRef<SafeAny>;

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-option': true,
      'wr-option--selected': this.isSelected,
      'wr-option--disabled': this.disabled,
      'wr-option--highlighted': this.isHighlighted,
      'wr-option--filtered': this.isFiltered,
    };
  }

  protected readonly context = {
    $implicit: this,
    option: this,
  };

  private readonly selectComponent = inject(WrSelectComponent);

  get isSelected(): boolean {
    const currentValue = this.selectComponent.currentValue;
    if (this.selectComponent.isMultiple) {
      return Array.isArray(currentValue) && currentValue.includes(this.value);
    }
    return currentValue === this.value;
  }

  get isHighlighted(): boolean {
    return this.selectComponent.isHighlightedOption(this);
  }

  get isFiltered(): boolean {
    return this.selectComponent.isFilteredOption(this);
  }

  select(): void {
    if (!this.disabled) {
      this.selectComponent.onOptionSelect(this);
    }
  }
}
