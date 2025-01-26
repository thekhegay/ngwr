/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ContentChildren,
  QueryList,
  AfterContentInit,
  HostBinding,
  booleanAttribute,
} from '@angular/core';

import { WrOptionComponent } from './select-option.component';

@Component({
  selector: 'wr-option-group',
  templateUrl: './select-option-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class WrOptionGroupComponent implements AfterContentInit {
  @Input()
  label = '';

  @Input({ transform: booleanAttribute })
  disabled = false;

  @ContentChildren(WrOptionComponent)
  options!: QueryList<WrOptionComponent>;

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-select-group': true,
      'wr-select-group--disabled': this.disabled,
    };
  }

  ngAfterContentInit(): void {
    if (this.disabled) {
      this.options.forEach(option => (option.disabled = true));
    }
  }
}
