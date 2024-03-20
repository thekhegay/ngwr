/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { WrAbstractBase } from 'ngwr/cdk';
import { provideWrIcons, WrIconComponent, wrIconEye, wrIconEyeOff } from 'ngwr/icon';
import { SafeAny } from 'ngwr/types';

import { debounceTime, noop, tap } from 'rxjs';

import { WrInputType } from './input-types';

/**
 * NGWR input component.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/input}
 */
@Component({
  standalone: true,
  selector: 'wr-input',
  templateUrl: 'input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, ReactiveFormsModule, WrIconComponent],
  providers: [
    provideWrIcons([wrIconEye, wrIconEyeOff]),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WrInputComponent),
      multi: true,
    },
  ],
})
export class WrInputComponent extends WrAbstractBase implements ControlValueAccessor, OnInit {
  formControl: FormControl = new FormControl();

  onChange: (value: string) => void = noop;
  onTouch: () => void = noop;

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      return this.formControl.disable();
    }
    return this.formControl.enable();
  }

  writeValue(value: string): void {
    this.formControl.setValue(value, { emitEvent: false });
  }

  ngOnInit(): void {
    this.formControl.valueChanges
      .pipe(
        debounceTime(200),
        tap(value => this.onChange(value)),
        takeUntilDestroyed(this.destroyed$)
      )
      .subscribe();
  }

  @Input() placeholder: string = '';
  @Input() prefix: string | null = null;
  @Input() suffix: string | null = null;
  @Input({ transform: booleanAttribute }) passwordIcons: boolean = false;
  @Input({ transform: booleanAttribute }) readonly: boolean = false;
  @Input() type: WrInputType = 'text';

  eyeOn = true;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-input': true,
      'wr-input--has-prefix': this.prefix,
      'wr-input--has-suffix': this.suffix,
      'wr-input--password': this.passwordIcons,
    };
  }

  onPasswordVisibilityChange(): void {
    this.type = this.type === 'password' ? 'text' : 'password';
    this.eyeOn = !this.eyeOn;
  }
}
