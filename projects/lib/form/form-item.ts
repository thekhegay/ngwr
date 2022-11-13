import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Input,
  ViewEncapsulation,
} from '@angular/core';

import { InputBoolean } from 'ngwr/core/decorators';
import { SafeAny } from 'ngwr/core/types';

@Component({
  selector: 'wr-form-item',
  exportAs: 'wrFormItem',
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrFormItem {
  @Input()
  @InputBoolean()
  get hasError(): boolean {
    return this._hasError;
  }
  set hasError(value: BooleanInput) {
    this._hasError = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _hasError: boolean = false;

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-form-item': true,
      'wr-form-item--has-error': this.hasError,
    };
  }

  constructor(private readonly cdr: ChangeDetectorRef) {}
}
