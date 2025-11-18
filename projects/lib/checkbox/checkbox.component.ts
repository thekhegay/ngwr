/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'rxjs';

import { generateRandomId } from 'ngwr/cdk/utils';
import { WrIconComponent, wrIconName } from 'ngwr/icon';

/**
 * NGWR checkbox component.
 *
 * Can be used standalone or as part of Angular forms (reactive or template-driven)
 * thanks to the `ControlValueAccessor` implementation.
 *
 * @example
 * ```html
 * <wr-checkbox [(ngModel)]="isAccepted">
 *   I accept terms and conditions
 * </wr-checkbox>
 * ```
 *
 * @example
 * ```html
 * <form [formGroup]="form">
 *   <wr-checkbox formControlName="rememberMe">
 *     Remember me
 *   </wr-checkbox>
 * </form>
 * ```
 *
 * @see WrIconComponent
 * @see http://ngwr.dev/docs/components/checkbox
 *
 * @publicApi
 */
@Component({
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
export class WrCheckboxComponent implements ControlValueAccessor {
  /**
   * Unique id used to associate the host label and the native input.
   *
   * @default Randomly generated id
   */
  readonly id = input<string>(generateRandomId('wr-checkbox'));
  /**
   * Optional icon to render instead of the default checkmark.
   */
  readonly icon = input<wrIconName | null>(null);

  /**
   * Internal signal holding the current checkbox value.
   *
   * @internal
   */
  protected readonly inputValue = signal(false);

  /**
   * Internal disabled state controlled by Angular forms via `setDisabledState`.
   *
   * @internal
   */
  protected readonly isDisabled = signal(false);

  /**
   * Callback registered by Angular forms to be notified when the value changes.
   *
   * @internal
   */
  private onChange: (value: boolean) => void = noop;

  /**
   * Callback registered by Angular forms to be notified when the control is touched.
   *
   * @internal
   */
  private onTouched: () => void = noop;

  /**
   * Host CSS classes.
   *
   * Adds `wr-checkbox--checked` when the current value is `true`.
   */
  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    const baseClass = 'wr-checkbox';

    return {
      [baseClass]: true,
      [`${baseClass}--checked`]: this.inputValue(),
    };
  }

  /**
   * Native `disabled` attribute on the host.
   *
   * Used to trigger `&[disabled]` styles in CSS.
   */
  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this.isDisabled() ? '' : null;
  }

  // ──────────────────── ControlValueAccessor ────────────────────

  /**
   * Writes a new value from the form model into the view.
   * This method is called by Angular forms.
   */
  writeValue(value: boolean | null): void {
    this.inputValue.set(!!value);
    // Нет необходимости в ChangeDetectorRef:
    // обновление signal автоматически помечает компонент на проверку.
  }

  /**
   * Registers a callback function that should be called when the control's
   * value changes in the UI (i.e. user interaction).
   */
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers a callback function that should be called when the control is blurred.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Enables or disables the component from the Angular forms API.
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(coerceBooleanProperty(isDisabled));
  }

  // ──────────────────── Template event handlers ─────────────────

  /**
   * Handles native `<input type="checkbox">` change events.
   *
   * @internal
   */
  protected onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const checked = !!target?.checked;

    this.inputValue.set(checked);
    this.onChange(checked);
  }

  /**
   * Handles native `<input>` blur events and notifies Angular forms.
   *
   * @internal
   */
  protected onInputBlur(): void {
    this.onTouched();
  }
}
