/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  AfterContentInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
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
import { provideWrIcons, eye, eyeOff, WrIconModule } from 'ngwr/icon';

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
  imports: [FormsModule, WrIconModule],
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
export class WrInputComponent extends WrAbstractBase implements ControlValueAccessor, AfterContentInit {
  @Input() prefix: string | null = null;
  @Input() suffix: string | null = null;
  @Input({ transform: booleanAttribute }) rounded = false;
  @Input({ transform: booleanAttribute }) passwordIcons = false;

  @ContentChild('input') private inputRefFromTemplate?: ElementRef<HTMLInputElement>;

  private get inputElement(): HTMLInputElement {
    return this.inputRefFromTemplate?.nativeElement || this.elementRef.nativeElement.querySelector('input');
  }

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
  private readonly elementRef = inject(ElementRef);

  protected readonly eyeOn = signal(true);
  protected readonly isFocused = signal(false);
  protected readonly isDisabled = signal(false);

  ngAfterContentInit(): void {
    if (this.inputElement) {
      this.setupInputElement();
    } else {
      console.error('No input element found in wr-input component');
    }
  }

  private setupInputElement(): void {
    const input = this.inputElement;
    input.classList.add('wr-input__native');

    input.addEventListener('focus', () => {
      this.isFocused.set(true);
      this.cdr.markForCheck();
    });

    input.addEventListener('blur', () => {
      this.isFocused.set(false);
      this.onTouch();
      this.cdr.markForCheck();
    });

    input.addEventListener('input', event => {
      const value = (event.target as HTMLInputElement).value;
      this.onChange(value);
    });
  }

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

    if (this.inputElement) {
      this.inputElement.disabled = isDisabled;
    }
  }

  writeValue(value: string): void {
    if (this.inputElement) {
      this.inputElement.value = value ?? '';
    }
    this.cdr.markForCheck();
  }

  onPasswordVisibilityChange(): void {
    if (!this.inputElement) return;

    const newType = this.inputElement.type === 'password' ? 'text' : 'password';
    this.inputElement.type = newType;
    this.eyeOn.set(newType === 'password');
  }
}
