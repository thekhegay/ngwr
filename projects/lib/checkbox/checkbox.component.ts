/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  HostBinding,
  inject,
  Input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';
import { generateRandomId } from 'ngwr/cdk/utils';
import { WrIconComponent, wrIconName } from 'ngwr/icon';

/**
 * NGWR checkbox component.
 *
 * {@tutorial} [How to use wr-checkbox]{@link http://ngwr.dev/docs/components/checkbox}
 */
@Component({
  standalone: true,
  selector: 'wr-checkbox',
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, WrIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCheckboxComponent),
      multi: true,
    },
  ],
})
export class WrCheckboxComponent extends WrAbstractBase implements ControlValueAccessor {
  @Input() id: string = generateRandomId();
  @Input() icon: wrIconName | null = null;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-checkbox': true,
      'wr-checkbox--checked': this.inputValue(),
    };
  }

  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this.isDisabled() ? '' : null;
  }

  protected readonly inputValue = signal<boolean | null>(null);
  protected value?: boolean;

  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly isDisabled = signal(false);

  onChange: (value: boolean) => void = noop;
  onTouched: () => void = noop;

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(coerceBooleanProperty(isDisabled));
  }

  writeValue(value: boolean): void {
    this.value = value;
    this.onChange(value);
    this.inputValue.set(value);
    this.cdr.markForCheck();
  }
}
