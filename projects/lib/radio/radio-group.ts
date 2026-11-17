/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  HostAttributeToken,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useFormFieldAria } from 'ngwr/form';
import { wrRandomId, wrCheckStyles } from 'ngwr/utils';

import { WrRadio } from './radio';
import { WR_RADIO_GROUP } from './tokens';
import type { WrRadioGroupContext } from './types';

/**
 * Hosts a group of `<wr-radio>` children as a single-value selection.
 *
 * A signal-forms native control: it implements `FormValueControl`, so
 * `[formField]` binds to its `value` model — the currently selected radio's
 * `value`. `[(value)]` works standalone. Classic `[(ngModel)]` / reactive forms
 * keep working through Angular's bridge.
 *
 * `T` is an item of `[options]` and `V` is a radio's value: the return type of
 * `[valueWith]`, or else the type of the value binding.
 *
 * @example
 * ```html
 * <wr-radio-group [formField]="form.size">
 *   <wr-radio value="sm">Small</wr-radio>
 *   <wr-radio value="md">Medium</wr-radio>
 *   <wr-radio value="lg">Large</wr-radio>
 * </wr-radio-group>
 *
 * <!-- One radio per item, the id in the model -->
 * <wr-radio-group [options]="plans" [displayWith]="planName" [valueWith]="planId" [(value)]="planId" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/radio
 */
@Component({
  selector: 'wr-radio-group',
  templateUrl: './radio-group.html',
  imports: [WrRadio],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-radio-group',
    role: 'radiogroup',
    '[attr.aria-readonly]': 'readonly() || null',
    // `aria-labelledby` is how a `role="radiogroup"` gets its name from a
    // `<wr-form-field label="…">`: `<label for>` binds only to a LABELABLE
    // element, and this host is a `div` with a role, so the field's visible
    // label pointed at nothing and the group announced unnamed. This is the
    // case `useFormFieldAria().labelledBy()` exists for, and `wr-rating`
    // already reads it.
    //
    // The consumer's OWN attribute wins, and has to: the component ships no
    // label input on purpose — the question above a radio group is the
    // consumer's heading — so a binding that always wrote the field's id
    // would delete a hand-written `aria-labelledby` on every group that is
    // not inside a field, which is most of them.
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-invalid]': 'fieldAria.ariaInvalid()',
    '[attr.aria-required]': 'fieldAria.ariaRequired()',
    '[attr.aria-describedby]': 'fieldAria.describedBy()',
  },
  providers: [
    {
      provide: WR_RADIO_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrRadioGroup),
    },
  ],
})
export class WrRadioGroup<T = unknown, V = T> implements FormValueControl<V | null>, WrRadioGroupContext {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('radio');
  }

  /**
   * Shared `name` attribute. Defaults to a random id so multiple groups
   * on the same page don't collide. (Also the `FormUiControl.name` slot.)
   */
  readonly name = input<string>(wrRandomId('wr-radio-group'));

  /**
   * Option array. Each item is rendered as a `<wr-radio>` whose value is the
   * item, or `[valueWith]` of it, and whose label comes from `[displayWith]`,
   * before any projected `<wr-radio>` children.
   *
   * @example
   * ```html
   * <wr-radio-group [options]="plans" [displayWith]="planName" [valueWith]="planId" [(value)]="planId" />
   * ```
   */
  readonly options = input<readonly T[]>([]);

  /** Maps an `[options]` item to its label. @default String */
  readonly displayWith = input<(item: T) => string>((item: T) => String(item));

  /**
   * Maps an `[options]` item to the value the model holds, so a list of objects
   * can bind an id. Values are compared with `===`. Without it an item is its
   * own value.
   */
  readonly valueWith = input<((item: T) => V) | null>(null);

  /** An item's value: `valueWith` of it, or the item itself. */
  protected valueOf(item: T): V {
    const valueWith = this.valueWith();
    return valueWith ? valueWith(item) : (item as unknown as V);
  }

  /**
   * Disable the whole group. Bound automatically from the field's disabled
   * state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse selection changes while every option stays focusable and the value
   * still submits. Bound automatically from the field's readonly state when used
   * with `[formField]`.
   *
   * Native radios ignore the `readonly` attribute, so the group cancels the
   * activation instead and mirrors the state as `aria-readonly`, which role
   * `radiogroup` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  /**
   * Whatever the consumer wrote on the host, read once at construction.
   *
   * `HostAttributeToken` rather than a DOM read: it resolves from the
   * element's attributes through DI, so it works under SSR, where a
   * constructor-time `getAttribute` would not.
   */
  private readonly ownLabelledBy = inject(new HostAttributeToken('aria-labelledby'), { optional: true });

  protected readonly fieldAria = useFormFieldAria();

  protected readonly labelledBy = computed(() => this.ownLabelledBy ?? this.fieldAria.labelledBy());

  /** The selected radio's value. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<V | null>(null);

  /** Emitted on blur from any child so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Effective disabled state (WrRadioGroupContext). */
  readonly isDisabled = computed(() => this.disabled());

  /** Effective readonly state (WrRadioGroupContext). */
  readonly isReadonly = computed(() => this.readonly());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Focus the group — what Signal Forms calls to focus this control. The radio
   * Tab lands on takes it: the checked one, or the first enabled one while
   * nothing is checked. The `role="radiogroup"` host has no tab stop of its own,
   * and a disabled radio has none either — so a checked radio that is disabled
   * hands focus to the first enabled one too, where Tab would skip the group.
   */
  focus(options?: FocusOptions): void {
    const host = this.host.nativeElement;
    const radio =
      host.querySelector<HTMLInputElement>('.wr-radio__input:checked:not(:disabled)') ??
      host.querySelector<HTMLInputElement>('.wr-radio__input:not(:disabled)');
    radio?.focus(options);
  }

  // WrRadioGroupContext

  select(value: unknown): void {
    if (this.isDisabled() || this.isReadonly()) return;
    this.value.set(value as V);
  }

  markTouched(): void {
    this.touch.emit();
  }
}
