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
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

import { WR_SELECT } from './tokens';

let uid = 0;

/**
 * Single option inside a `<wr-select>`.
 *
 * The option's display label is taken from its projected text content;
 * the form value is its `value` input.
 *
 * @example
 * ```html
 * <wr-option value="sm">Small</wr-option>
 * <wr-option [value]="42">Forty-two</wr-option>
 * ```
 */
@Component({
  selector: 'wr-option',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'option',
    '[attr.id]': 'id',
    '[class]': 'classes()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(click)': 'onClick()',
  },
})
export class WrOption {
  /** The value contributed when this option is chosen. Required. */
  readonly value = input.required<unknown>();

  /** Disable this option. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Stable id used for `aria-activedescendant`. */
  readonly id = `wr-option-${++uid}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(WR_SELECT, { optional: true });

  /** @internal — true when this option matches the parent's current value. */
  protected readonly selected = computed(() => this.parent?.value() === this.value());

  /** @internal — true when this option is the keyboard cursor target. */
  protected readonly active = computed(() => this.parent?.activeOptionId() === this.id);

  protected readonly classes = computed(() => {
    const parts = ['wr-option'];
    if (this.selected()) parts.push('wr-option--selected');
    if (this.active()) parts.push('wr-option--active');
    if (this.disabled()) parts.push('wr-option--disabled');
    return parts.join(' ');
  });

  constructor() {
    if (this.parent) {
      const parent = this.parent;
      // Re-register when disabled or value changes so the parent has fresh metadata.
      effect(onCleanup => {
        const unreg = parent.registerOption({
          id: this.id,
          value: this.value(),
          disabled: this.disabled(),
          getLabel: () => this.host.nativeElement.textContent?.trim() ?? '',
        });
        onCleanup(() => unreg());
      });
      inject(DestroyRef);
    }
  }

  protected onClick(): void {
    if (this.disabled() || !this.parent) return;
    const label = this.host.nativeElement.textContent?.trim() ?? '';
    this.parent.selectOption(this.value(), label);
  }
}
