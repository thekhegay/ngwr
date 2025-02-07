/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  booleanAttribute,
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
import { provideWrIcons, eye, eyeOff, WrIconComponent } from 'ngwr/icon';

import { WrInputType } from './input-types';

/**
 * NGWR input component.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/input}
 */
@Component({
  selector: 'wr-input',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, WrIconComponent],
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
export class WrInputComponent extends WrAbstractBase implements ControlValueAccessor {
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
      'wr-input--disabled': this.isDisabled(),
      'wr-input--focused': this.isFocused(),
    };
  }

  protected readonly inputValue = signal<string | null>(null);

  protected value?: string;

  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly eyeOn = signal(true);
  protected readonly isFocused = signal(false);
  protected readonly isDisabled = signal(false);

  onChange: (value: string) => void = noop;
  onTouch: () => void = noop;

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(coerceBooleanProperty(isDisabled));
  }

  writeValue(value: string): void {
    this.value = value;
    this.onChange(value);
    this.inputValue.set(value);
    this.cdr.markForCheck();
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
