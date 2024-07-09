/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { noop, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';
import { generateRandomId } from 'ngwr/cdk/utils';
import { WrIconComponent, wrIconName } from 'ngwr/icon';

@Component({
  standalone: true,
  selector: 'wr-checkbox',
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ReactiveFormsModule, WrIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCheckboxComponent),
      multi: true,
    },
  ],
})
export class WrCheckboxComponent extends WrAbstractBase implements ControlValueAccessor, OnInit {
  @Input({ required: true }) formControl!: FormControl;
  @Input() id: string = generateRandomId();
  @Input() icon: wrIconName | null = null;

  onChange: (value: boolean) => void = noop;
  onTouched: () => void = noop;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-checkbox': true,
      'wr-checkbox--checked': this.formControl.value,
    };
  }

  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this.formControl.disabled ? '' : null;
  }

  ngOnInit(): void {
    this.formControl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isChecked: boolean) => this.onChange(isChecked));
  }

  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(checked: boolean): void {
    this.formControl.patchValue(checked, { emitEvent: false });
  }

  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.formControl.disable();
    } else {
      this.formControl.enable();
    }
  }
}
