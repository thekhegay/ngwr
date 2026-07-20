/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, forwardRef, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WR_CHECKBOX_GROUP, type WrCheckboxGroupContext } from './tokens';

/**
 * Manages a group of `<wr-checkbox>` children as a single form value
 * (an array of the checked items' `value` inputs).
 *
 * A signal-forms native control: it implements `FormValueControl<unknown[]>`,
 * so `[formField]` binds to its `value` model. `[(value)]` works standalone,
 * and classic `[(ngModel)]` / reactive forms keep working through the bridge.
 *
 * @example
 * ```html
 * <wr-checkbox-group [formField]="form.features">
 *   <wr-checkbox value="autosave">Autosave</wr-checkbox>
 *   <wr-checkbox value="notifications">Notifications</wr-checkbox>
 *   <wr-checkbox value="darkmode">Dark mode</wr-checkbox>
 * </wr-checkbox-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/checkbox
 */
@Component({
  selector: 'wr-checkbox-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-checkbox-group', role: 'group' },
  providers: [
    {
      provide: WR_CHECKBOX_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCheckboxGroup),
    },
  ],
})
export class WrCheckboxGroup implements FormValueControl<unknown[]>, WrCheckboxGroupContext {
  /**
   * Disable every child checkbox. Bound automatically from the field's
   * disabled state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** The checked items' values. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<unknown[]>([]);

  /** Emitted when a child toggles so a bound field can mark itself touched. */
  readonly touch = output<void>();

  // The current selection as a guaranteed array — a classic-forms binding can
  // write null even though the type is `unknown[]`, so normalise every read.
  private readonly selected = computed<readonly unknown[]>(() => {
    const v = this.value();
    return Array.isArray(v) ? v : [];
  });

  /** Effective disabled state (WrCheckboxGroupContext). */
  readonly isDisabled = computed(() => this.disabled());

  // WrCheckboxGroupContext

  isSelected(value: unknown): boolean {
    return this.selected().includes(value);
  }

  toggle(value: unknown): void {
    if (this.isDisabled()) return;
    const current = this.selected();
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    this.value.set(next);
    this.touch.emit();
  }
}
