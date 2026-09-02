/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { useConfigValue } from 'ngwr/config';
import { useFormFieldAria } from 'ngwr/form';
import { randomId } from 'ngwr/utils';

/**
 * Boolean toggle with an iOS-style slider.
 *
 * A signal-forms native control: it implements `FormCheckboxControl`, so
 * `[formField]` binds straight to its `checked` model — no
 * `ControlValueAccessor` in between. `[(checked)]` works standalone.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-switch [formField]="form.notifications">Notifications</wr-switch>
 *
 * <!-- standalone two-way binding -->
 * <wr-switch [(checked)]="enabled">Notifications</wr-switch>
 * ```
 *
 * @see https://ngwr.dev/reference/components/switch
 */
export type WrSwitchSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-switch',
  templateUrl: './switch.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    // The `id` input belongs to the native input, not to this element — a static
    // `id="x"` would otherwise be written here too and leave the document with
    // two elements sharing it, which is what broke `<label for>`.
    '[attr.id]': 'null',
  },
})
export class WrSwitch implements FormCheckboxControl {
  /**
   * Accessible name for a switch used WITHOUT projected text. The wrapping
   * `<label>` names the control whenever content is projected; with none, the
   * label is empty and the input has no name at all.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Stable id used to associate the native input with its label. Lands on the
   * inner `<input>`; the host never keeps it.
   */
  readonly id = input<string>(randomId('wr-switch'));

  /**
   * Disable the switch. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse edits while staying focusable and submittable. Bound automatically
   * from the field's readonly state when used with `[formField]`.
   *
   * A native checkbox ignores the `readonly` attribute, so this cancels the
   * click's activation behaviour instead — which covers Space too, since the key
   * arrives as a click — and mirrors the state as `aria-readonly`, which role
   * `switch` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

  /**
   * Control size — shares the `--wr-control-*` contract. Unset falls back to the
   * `switch.size` app default from `provideWrConfig()`. @default 'md'
   */
  readonly size = input<WrSwitchSize | null>(null);

  /** `size`, then the app config, then `md`. @internal */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.switch?.size, 'md');

  /** On / off state. Bound by `[formField]`, or two-way via `[(checked)]`. */
  readonly checked = model<boolean>(false);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly classes = computed(() => {
    const parts = ['wr-switch'];
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-switch--${size}`);
    if (this.checked()) parts.push('wr-switch--checked');
    if (this.disabled()) parts.push('wr-switch--disabled');
    else if (this.readonly()) parts.push('wr-switch--readonly');
    return parts.join(' ');
  });

  // Template handlers

  /**
   * Cancel the toggle while readonly. `change` never fires for a click whose
   * default was prevented, so this is the only guard the pointer and Space paths
   * need; `onInputChange` keeps its own for a synthetic `change`.
   */
  protected onInputClick(event: Event): void {
    if (this.readonly()) event.preventDefault();
  }

  protected onInputChange(event: Event): void {
    if (this.readonly()) {
      // A synthetic `change` cannot be prevented — put the DOM back instead.
      (event.target as HTMLInputElement).checked = this.checked();
      return;
    }
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected onInputBlur(): void {
    this.touch.emit();
  }
}
