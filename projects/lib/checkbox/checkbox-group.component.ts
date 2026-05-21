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
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

import { WR_CHECKBOX_GROUP, type WrCheckboxGroupContext } from './tokens';

/**
 * Manages a group of `<wr-checkbox>` children as a single form value
 * (an array of the checked items' `value` inputs).
 *
 * @example
 * ```html
 * <wr-checkbox-group [(ngModel)]="features">
 *   <wr-checkbox value="autosave">Autosave</wr-checkbox>
 *   <wr-checkbox value="notifications">Notifications</wr-checkbox>
 *   <wr-checkbox value="darkmode">Dark mode</wr-checkbox>
 * </wr-checkbox-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/checkbox-group
 */
@Component({
  selector: 'wr-checkbox-group',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-checkbox-group', role: 'group' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCheckboxGroupComponent),
      multi: true,
    },
    {
      provide: WR_CHECKBOX_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCheckboxGroupComponent),
    },
  ],
})
export class WrCheckboxGroupComponent implements ControlValueAccessor, WrCheckboxGroupContext {
  /**
   * Disable every child checkbox. Also set by Angular forms via
   * `setDisabledState`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly selected = signal<readonly unknown[]>([]);
  private readonly disabledFromCva = signal(false);

  /** Effective disabled state — input wins, CVA second. */
  readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  private onChange: (value: unknown[]) => void = noop;
  private onTouched: () => void = noop;

  // ──────── WrCheckboxGroupContext ────────

  isSelected(value: unknown): boolean {
    return this.selected().includes(value);
  }

  toggle(value: unknown): void {
    if (this.isDisabled()) return;
    const current = this.selected();
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    this.selected.set(next);
    this.onChange([...next]);
    this.onTouched();
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    this.selected.set(Array.isArray(value) ? [...(value as unknown[])] : []);
  }

  registerOnChange(fn: (value: unknown[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }
}
