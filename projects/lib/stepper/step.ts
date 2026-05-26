/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import { WR_STEPPER } from './tokens';

/**
 * One step in a {@link WrStepper}. Project as a child:
 *
 * ```html
 * <wr-stepper>
 *   <wr-step label="Account"> … </wr-step>
 *   <wr-step label="Profile" description="Optional"> … </wr-step>
 * </wr-stepper>
 * ```
 *
 * The stepper hides every step except the active one via a host class —
 * each step still mounts once, so component state survives navigation.
 *
 * @see https://ngwr.dev/docs/components/stepper
 */
@Component({
  selector: 'wr-step',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-step',
    '[class.wr-step--active]': 'isActive()',
  },
})
export class WrStep {
  /** Header label. */
  readonly label = input<string>('');

  /** Secondary text shown under the label. */
  readonly description = input<string>('');

  /** Marks the step as optional in the header. */
  readonly optional = input(false, { transform: coerceBooleanProperty });

  /**
   * Override completion state. When unset, the stepper auto-derives it
   * from the active index (any step before `active` is completed).
   */
  readonly completed = input<boolean | null>(null);

  /** Disables the header — also blocks header clicks. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Stepper-assigned index. Set by the parent when contentChildren updates. */
  readonly _index = signal(-1);

  private readonly stepper = inject(WR_STEPPER);

  protected readonly isActive = computed(() => this._index() === this.stepper.active());
}
