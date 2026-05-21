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
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';

import { WR_SELECT } from './tokens';

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
    '[class]': 'classes()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(click)': 'onClick()',
  },
})
export class WrOptionComponent {
  /** The value contributed when this option is chosen. Required. */
  readonly value = input.required<unknown>();

  /** Disable this option. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(WR_SELECT, { optional: true });

  /** @internal — true when this option matches the parent's current value. */
  protected readonly selected = computed(() => this.parent?.value() === this.value());

  protected readonly classes = computed(() => {
    const parts = ['wr-option'];
    if (this.selected()) parts.push('wr-option--selected');
    if (this.disabled()) parts.push('wr-option--disabled');
    return parts.join(' ');
  });

  protected onClick(): void {
    if (this.disabled() || !this.parent) return;
    const label = this.host.nativeElement.textContent?.trim() ?? '';
    this.parent.selectOption(this.value(), label);
  }
}
