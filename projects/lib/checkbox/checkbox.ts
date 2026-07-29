/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { randomId } from 'ngwr/utils';

import { WR_CHECKBOX_GROUP } from './tokens';

/**
 * Two-state checkbox.
 *
 * A signal-forms native control: it implements `FormCheckboxControl`, so
 * `[formField]` binds straight to its `checked` model — no
 * `ControlValueAccessor` in between. `[(checked)]` works standalone, and
 * classic `[(ngModel)]` / reactive forms keep working through Angular's bridge.
 *
 * @example
 * ```html
 * <wr-checkbox [(checked)]="agree">I agree</wr-checkbox>
 * <wr-checkbox [formField]="form.agree">I agree</wr-checkbox>
 * ```
 *
 * **Inside `<wr-checkbox-group>`** — the checkbox's `checkboxValue` is added to
 * or removed from the group's array, and the group is the native form control.
 * (The identity input is `checkboxValue`, not `value`, because
 * `FormCheckboxControl` reserves `value` — its form state is the boolean
 * `checked`.)
 *
 * @example
 * ```html
 * <wr-checkbox-group [formField]="form.features">
 *   <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>
 *   <wr-checkbox checkboxValue="notifications">Notifications</wr-checkbox>
 * </wr-checkbox-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/checkbox
 */
export type WrCheckboxSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-checkbox',
  templateUrl: './checkbox.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
})
export class WrCheckbox implements FormCheckboxControl {
  /**
   * Stable id used to associate the native input with its label.
   *
   * @default Randomly generated
   */
  readonly id = input<string>(randomId('wr-checkbox'));

  /**
   * This checkbox's identity when inside a `<wr-checkbox-group>` — the value
   * added to / removed from the group's array. Ignored in standalone mode.
   * (Named `checkboxValue`, not `value`, because `FormCheckboxControl` reserves
   * `value`.)
   */
  readonly checkboxValue = input<unknown>(null);

  /**
   * Checked state — the form value. Bound by `[formField]`, two-way via
   * `[(checked)]`, or `[(ngModel)]`. Ignored inside a `<wr-checkbox-group>`,
   * where the group's array is the source of truth.
   */
  readonly checked = model<boolean>(false);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /**
   * Disable the checkbox. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrCheckboxSize>('md');

  /**
   * Optional icon name rendered inside the box when checked, in place of the
   * default checkmark. Use any registered NGWR icon.
   */
  readonly icon = input<WrIconName | null>(null);

  /**
   * Show the indeterminate ("mixed") state — a dash instead of a check. Visual
   * only and controlled: set it yourself for a parent "select all" whose
   * children are partly checked, and clear it on the next toggle. Takes visual
   * precedence over `checked`; the native input reports `aria-checked="mixed"`.
   *
   * @default false
   */
  readonly indeterminate = input(false, { transform: coerceBooleanProperty });

  private readonly group = inject(WR_CHECKBOX_GROUP, { optional: true });

  /** Rendered "is checked" — reads the group when grouped, else the `checked` model. */
  protected readonly isChecked = computed(() =>
    this.group ? this.group.isSelected(this.checkboxValue()) : this.checked()
  );

  /** Effective disabled — the `disabled` input wins, then the group. */
  protected readonly effectiveDisabled = computed(() => {
    if (this.disabled()) return true;
    return this.group ? this.group.isDisabled() : false;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-checkbox'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-checkbox--${size}`);
    if (this.indeterminate()) parts.push('wr-checkbox--indeterminate');
    else if (this.isChecked()) parts.push('wr-checkbox--checked');
    if (this.effectiveDisabled()) parts.push('wr-checkbox--disabled');
    return parts.join(' ');
  });

  // Template handlers

  protected onInputChange(event: Event): void {
    if (this.group) {
      this.group.toggle(this.checkboxValue());
      return;
    }
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected onInputBlur(): void {
    this.touch.emit();
  }
}
