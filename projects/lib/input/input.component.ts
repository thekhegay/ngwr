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
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { debounceTime, noop, takeUntil, tap } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';
import { provideWrIcons, WrIconComponent, eye, eyeOff } from 'ngwr/icon';

import { WrInputType } from './input-types';

/**
 * NGWR input component.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/input}
 */
@Component({
  standalone: true,
  selector: 'wr-input',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, ReactiveFormsModule, WrIconComponent],
  providers: [
    provideWrIcons([eye, eyeOff]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrInputComponent),
      multi: true,
    },
  ],
})
export class WrInputComponent extends WrAbstractBase implements ControlValueAccessor, OnInit {
  formControl: FormControl = new FormControl();
  protected readonly eyeOn = signal(true);
  protected readonly isFocused = signal(false);

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
    // this.formControl.valueChanges
    //   .pipe(
    //     debounceTime(200),
    //     tap(value => this.onChange(value)),
    //     takeUntil(this.destroyed$)
    //   )
    //   .subscribe();
  }

  @Input() placeholder = '';
  @Input() prefix: string | null = null;
  @Input() suffix: string | null = null;
  @Input({ transform: booleanAttribute }) rounded = false;
  @Input({ transform: booleanAttribute }) passwordIcons = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() type: WrInputType = 'text';

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-input': true,
      'wr-input--rounded': this.rounded,
      'wr-input--has-prefix': this.prefix,
      'wr-input--has-suffix': this.suffix,
      'wr-input--password': this.passwordIcons,
      'wr-input--disabled': this.formControl.disabled,
      'wr-input--focused': this.isFocused(),
    };
  }

  onPasswordVisibilityChange(): void {
    if (this.type === 'password') {
      this.type = 'text';
      this.eyeOn.set(false);
    } else {
      this.type = 'password';
      this.eyeOn.set(true);
    }
  }
}
