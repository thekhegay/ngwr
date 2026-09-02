/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { useConfigValue } from 'ngwr/config';
import { useFormFieldAria } from 'ngwr/form';
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
  host: {
    '[class]': 'classes()',
    // The `id` input belongs to the native input, not to this element. A static
    // `id="x"` in a consumer's template is written to the host as a plain
    // attribute AS WELL as fed to the input, which put two elements with the
    // same id in the document and made `<label for>` resolve through
    // `getElementById` to the host — not a labelable element, so `input.labels`
    // went from 1 to 0 and `document.getElementById(id)` returned the wrong node.
    '[attr.id]': 'null',
  },
  imports: [WrIcon],
})
export class WrCheckbox implements FormCheckboxControl {
  /**
   * Stable id used to associate the native input with its label. Lands on the
   * inner `<input>`; the host never keeps it.
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
   * Accessible name for a checkbox used WITHOUT projected text — a selection
   * cell in a table, say. The wrapping `<label>` names the control whenever
   * content is projected; with none, the native input has no name, and an
   * `aria-label` put on the host lands on a `<wr-checkbox>` element that no
   * screen reader ever announces.
   */
  readonly ariaLabel = input<string | null>(null);

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

  /**
   * Refuse edits while staying focusable and submittable. Bound automatically
   * from the field's readonly state when used with `[formField]`.
   *
   * A native `<input type="checkbox">` ignores the `readonly` attribute, so this
   * cancels the click's activation behaviour instead — which covers Space too,
   * since a checkbox turns Space into a click — and mirrors the state as
   * `aria-readonly`, which role `checkbox` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Control size — shares the `--wr-control-*` contract. Unset falls back to the
   * `checkbox.size` app default from `provideWrConfig()`. @default 'md'
   */
  readonly size = input<WrCheckboxSize | null>(null);

  /** `size`, then the app config, then `md`. @internal */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.checkbox?.size, 'md');

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

  /** Effective readonly — this box's own `readonly` input, or the group's. */
  protected readonly effectiveReadonly = computed(() => {
    if (this.readonly()) return true;
    return this.group ? this.group.isReadonly() : false;
  });

  /**
   * The surrounding `<wr-form-field>`'s error state, mirrored onto the native
   * input. Inside a `<wr-checkbox-group>` the GROUP is the bound control and
   * carries the state, so a grouped box shields itself and stays silent — nine
   * boxes each announcing the group's one error is noise, not information.
   */
  private readonly fieldAria = useFormFieldAria();
  protected readonly ariaInvalid = computed(() => (this.group ? null : this.fieldAria.ariaInvalid()));
  protected readonly describedBy = computed(() => (this.group ? null : this.fieldAria.describedBy()));

  protected readonly classes = computed(() => {
    const parts = ['wr-checkbox'];
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-checkbox--${size}`);
    if (this.indeterminate()) parts.push('wr-checkbox--indeterminate');
    else if (this.isChecked()) parts.push('wr-checkbox--checked');
    if (this.effectiveDisabled()) parts.push('wr-checkbox--disabled');
    else if (this.effectiveReadonly()) parts.push('wr-checkbox--readonly');
    return parts.join(' ');
  });

  // Template handlers

  /**
   * Cancel the toggle while readonly. `change` never fires for a click whose
   * default was prevented, so this is the only guard the pointer and Space
   * paths need; `onInputChange` keeps its own for a synthetic `change`.
   */
  protected onInputClick(event: Event): void {
    if (this.effectiveReadonly()) event.preventDefault();
  }

  protected onInputChange(event: Event): void {
    if (this.effectiveReadonly()) {
      // A synthetic `change` cannot be prevented — put the DOM back instead.
      (event.target as HTMLInputElement).checked = this.isChecked();
      return;
    }
    if (this.group) {
      this.group.toggle(this.checkboxValue());
      return;
    }
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected onInputBlur(): void {
    // Inside a group the GROUP is the bound control, and its own `touch` is
    // what a form listens to; the child's output is wired to nothing there.
    if (this.group) this.group.blurred();
    this.touch.emit();
  }
}
