import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { BooleanInput, InputBoolean, SafeAny } from '../_core';

@Component({
  selector: 'wr-form-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WrFormItemComponent {
  @Input() @InputBoolean() hasError: BooleanInput = false;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-form-item': true,
      'wr-form-item--has-error': this.hasError
    };
  }
}
