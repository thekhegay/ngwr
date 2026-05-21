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
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { WrIconComponent, type WrIconName } from 'ngwr/icon';
import { noop, randomId } from 'ngwr/utils';

import { WR_CHECKBOX_GROUP } from './tokens';

/**
 * Two-state checkbox.
 *
 * **Standalone mode** — boolean value, works as a `ControlValueAccessor`:
 *
 * @example
 * ```html
 * <wr-checkbox [(ngModel)]="agree">I agree</wr-checkbox>
 * ```
 *
 * **Inside `<wr-checkbox-group>`** — the checkbox's `value` is added to
 * or removed from the group's array. The standalone CVA is ignored.
 *
 * @example
 * ```html
 * <wr-checkbox-group [(ngModel)]="features">
 *   <wr-checkbox value="autosave">Autosave</wr-checkbox>
 *   <wr-checkbox value="notifications">Notifications</wr-checkbox>
 * </wr-checkbox-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/checkbox
 */
@Component({
  selector: 'wr-checkbox',
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIconComponent],
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
   * Stable id used to associate the native input with its label.
   *
   * @default Randomly generated
   */
  readonly id = input<string>(randomId('wr-checkbox'));

  /**
   * Per-checkbox value used only when inside a `<wr-checkbox-group>`.
   * Ignored in standalone mode.
   */
  readonly value = input<unknown>(null);

  /**
   * Disable the checkbox. Also set automatically by Angular forms.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Optional icon name rendered inside the box when checked, in place of the
   * default checkmark. Use any registered NGWR icon.
   */
  readonly icon = input<WrIconName | null>(null);

  private readonly group = inject(WR_CHECKBOX_GROUP, { optional: true });

  // Standalone state. When inside a group, these are not used as the source of truth.
  protected readonly standaloneChecked = signal(false);
  protected readonly standaloneDisabledFromCva = signal(false);

  /** Derived "is checked". Reads from group when grouped, else local state. */
  protected readonly checked = computed(() => {
    return this.group ? this.group.isSelected(this.value()) : this.standaloneChecked();
  });

  /** Effective disabled — input wins, then group, then CVA. */
  protected readonly effectiveDisabled = computed(() => {
    if (this.disabled()) return true;
    return this.group ? this.group.isDisabled() : this.standaloneDisabledFromCva();
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-checkbox'];
    if (this.checked()) parts.push('wr-checkbox--checked');
    if (this.effectiveDisabled()) parts.push('wr-checkbox--disabled');
    return parts.join(' ');
  });

  private onChange: (value: boolean) => void = noop;
  private onTouched: () => void = noop;

  // ──────── ControlValueAccessor (standalone mode) ────────

  writeValue(value: boolean | null): void {
    this.standaloneChecked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.standaloneDisabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // ──────── Template handlers ────────

  protected onInputChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.group) {
      this.group.toggle(this.value());
      return;
    }
    this.standaloneChecked.set(checked);
    this.onChange(checked);
  }

  protected onInputBlur(): void {
    this.onTouched();
  }
}
