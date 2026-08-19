/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import { WrStep } from './step';
import { WR_STEPPER, type WrStepperContext } from './tokens';

/** A label with no consumer input to forward — see `optionalLabel` below. */
const NO_OVERRIDE = signal<string | null>(null).asReadonly();

/**
 * Multi-step wizard container. Children are `<wr-step>` components — the
 * stepper renders one numbered header per step (with connectors) and the
 * body of the currently active one.
 *
 * Two-way bind `[(active)]` to the active step index. Set `linear="true"`
 * to forbid jumping past incomplete steps.
 *
 * @example
 * ```html
 * <wr-stepper [(active)]="step" linear>
 *   <wr-step label="Account">…</wr-step>
 *   <wr-step label="Profile">…</wr-step>
 *   <wr-step label="Confirm">…</wr-step>
 * </wr-stepper>
 * ```
 *
 * @see https://ngwr.dev/reference/components/stepper
 */
@Component({
  selector: 'wr-stepper',
  templateUrl: './stepper.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: WR_STEPPER,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrStepper),
    },
  ],
})
export class WrStepper implements WrStepperContext {
  /** Index of the currently visible step. */
  readonly active = model(0);

  /** Layout direction. @default 'horizontal' */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Lock steps after the latest completed one. @default false */
  readonly linear = input(false, { transform: coerceBooleanProperty });

  /**
   * Drop a horizontal stepper to a vertical layout when its own box is too
   * narrow for the row (a container query on its own width, not the
   * viewport — so it adapts inside a narrow column or side panel). No effect
   * when `orientation` is already `vertical`. @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  protected readonly steps = contentChildren(WrStep);

  /**
   * The "optional" badge sits INSIDE the header button's label span, so the word
   * is part of the step's accessible name — a hard-coded literal announced English
   * to every locale, not just showed it. Catalog-only rather than an input: the
   * badge is one word shared by every step, and an app that wants other wording
   * overrides `stepper.optional` once instead of on every `<wr-step>`.
   */
  protected readonly optionalLabel = useI18nText(NO_OVERRIDE, 'stepper.optional', 'optional');

  protected readonly classes = computed(() => {
    const parts = ['wr-stepper', `wr-stepper--${this.orientation()}`];
    if (this.linear()) parts.push('wr-stepper--linear');
    if (this.responsive()) parts.push('wr-stepper--responsive');
    return parts.join(' ');
  });

  constructor() {
    // Push each step's index down so it can compute its own active state.
    effect(() => {
      this.steps().forEach((step, i) => step._index.set(i));
    });

    // `active` is a plain `model`, so `[(active)]` and an `@if`-shrunk step list
    // both write into it unchecked — only `goTo` clamped. Out of range no step
    // matches `.wr-step--active`, and since `.wr-step` is `display: none` until it
    // does, the stepper renders its header row over an empty body with no header
    // carrying `aria-current="step"`. Same guard as `wr-carousel`; the `last < 0`
    // return keeps it quiet until `contentChildren` resolves.
    effect(() => {
      const last = this.steps().length - 1;
      if (last < 0) return;
      const clamped = Math.min(Math.max(0, this.active()), last);
      if (clamped !== this.active()) this.active.set(clamped);
    });
  }

  /** Is the step at `index` considered completed? */
  protected isCompleted(index: number): boolean {
    const override = this.steps()[index]?.completed();
    if (override !== null && override !== undefined) return override;
    return index < this.active();
  }

  /** Is the step at `index` reachable for direct header clicks? */
  protected isReachable(index: number): boolean {
    if (this.steps()[index]?.disabled()) return false;
    if (!this.linear()) return true;
    if (index <= this.active()) return true;
    for (let i = 0; i < index; i++) {
      if (!this.isCompleted(i)) return false;
    }
    return true;
  }

  protected onHeaderClick(index: number): void {
    if (this.isReachable(index)) this.goTo(index);
  }

  // Imperative API

  goTo(index: number): void {
    const last = this.steps().length - 1;
    if (last < 0) return;
    const clamped = Math.min(Math.max(0, index), last);
    this.active.set(clamped);
  }

  next(): void {
    this.goTo(this.active() + 1);
  }

  prev(): void {
    this.goTo(this.active() - 1);
  }
}
