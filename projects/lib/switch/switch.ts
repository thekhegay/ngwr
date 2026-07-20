/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

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
  host: { '[class]': 'classes()' },
})
export class WrSwitch implements FormCheckboxControl {
  /** Stable id used to associate the native input with its label. */
  readonly id = input<string>(randomId('wr-switch'));

  /**
   * Disable the switch. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrSwitchSize>('md');

  /** On / off state. Bound by `[formField]`, or two-way via `[(checked)]`. */
  readonly checked = model<boolean>(false);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly classes = computed(() => {
    const parts = ['wr-switch'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-switch--${size}`);
    if (this.checked()) parts.push('wr-switch--checked');
    if (this.disabled()) parts.push('wr-switch--disabled');
    return parts.join(' ');
  });

  // Template handlers

  protected onInputChange(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected onInputBlur(): void {
    this.touch.emit();
  }
}
