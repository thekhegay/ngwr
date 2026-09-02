/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { useConfigValue } from 'ngwr/config';
import { WrIcon, type WrIconName } from 'ngwr/icon';
import { randomId } from 'ngwr/utils';

import { WR_RADIO_GROUP } from './tokens';

/**
 * Single-choice option. Must be a child of `<wr-radio-group>`.
 *
 * @example
 * ```html
 * <wr-radio-group [(ngModel)]="size">
 *   <wr-radio value="sm">Small</wr-radio>
 *   <wr-radio value="md">Medium</wr-radio>
 *   <wr-radio value="lg">Large</wr-radio>
 * </wr-radio-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/radio
 */
export type WrRadioSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-radio',
  templateUrl: './radio.html',
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
export class WrRadio {
  /**
   * Stable id used to associate the native input with its label. Lands on the
   * inner `<input>`; the host never keeps it.
   */
  readonly id = input<string>(randomId('wr-radio'));

  /** Value selected when this radio is checked. */
  readonly value = input.required<unknown>();

  /**
   * Optional icon name rendered inside the dot when checked, in place of the
   * default solid circle. Use any registered NGWR icon.
   */
  readonly icon = input<WrIconName | null>(null);

  /**
   * Control size — shares the `--wr-control-*` contract. Set per option (the
   * group has no `size`); unset falls back to the `radio.size` app default from
   * `provideWrConfig()`. @default 'md'
   */
  readonly size = input<WrRadioSize | null>(null);

  /** `size`, then the app config, then `md`. @internal */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.radio?.size, 'md');

  /**
   * Disable just this option. The group can also be disabled as a whole via
   * `<wr-radio-group disabled>`; either source disables this radio.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly group = inject(WR_RADIO_GROUP, { optional: true });

  constructor() {
    if (!this.group) {
      throw new Error('[NGWR] <wr-radio> must be used inside <wr-radio-group>.');
    }
  }

  protected readonly name = computed(() => this.group?.name() ?? '');
  protected readonly checked = computed(() => this.group?.value() === this.value());
  /** Effective disabled — this option's own `disabled` or the group's. */
  protected readonly isDisabled = computed(() => this.disabled() || (this.group?.isDisabled() ?? false));

  /**
   * Readonly is a GROUP-level state — a single option cannot be read-only while
   * its siblings are not, because picking any of them rewrites the same value.
   * `aria-readonly` therefore lives on the `role="radiogroup"` host and NOT here:
   * role `radio` does not support it.
   */
  protected readonly isReadonly = computed(() => this.group?.isReadonly() ?? false);

  protected readonly classes = computed(() => {
    const parts = ['wr-radio'];
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-radio--${size}`);
    if (this.checked()) parts.push('wr-radio--checked');
    if (this.isDisabled()) parts.push('wr-radio--disabled');
    else if (this.isReadonly()) parts.push('wr-radio--readonly');
    if (this.icon()) parts.push('wr-radio--has-icon');
    return parts.join(' ');
  });

  /**
   * Cancel the selection while the group is read-only. `change` never fires for
   * a click whose default was prevented, so this is the only guard the pointer
   * and Space paths need; `onSelect` keeps its own for a synthetic `change`.
   */
  protected onInputClick(event: Event): void {
    if (this.isReadonly()) event.preventDefault();
  }

  protected onSelect(): void {
    if (this.isDisabled() || this.isReadonly()) return;
    this.group?.select(this.value());
  }

  protected onBlur(): void {
    this.group?.markTouched();
  }
}
