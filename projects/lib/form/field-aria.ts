/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, computed, inject } from '@angular/core';

import { WR_FORM_FIELD } from './tokens';

/** What {@link useFormFieldAria} hands a control to bind on its own element. */
export interface WrFormFieldAria {
  /** Id of the field's message block, or `null` when it is showing none. */
  readonly describedBy: Signal<string | null>;
  /** `'true'` while the field is showing a message, `null` otherwise. */
  readonly ariaInvalid: Signal<'true' | null>;
}

/**
 * The two attributes that make a `<wr-form-field>`'s visible error reach a
 * screen reader — bind both on whichever element carries the control's role.
 *
 * Without them the messages the field renders are visible and nothing else: the
 * control announces itself as valid, and the message is associated with nothing.
 * No automated gate catches that — axe has no rule that a visible error must be
 * programmatically associated with its control — so this helper exists to make
 * the wiring one line per control rather than three, and the specs are the gate.
 *
 * `aria-invalid` is keyed on the message EXISTING rather than on `errorKeys()`,
 * because the field only publishes an id once it is showing something —
 * announcing "invalid" while pointing at nothing is worse than staying quiet.
 *
 * Must be called from an injection context (a field initialiser or a
 * constructor). Returns inert signals outside a `<wr-form-field>`.
 *
 * Pass `skipSelf` from a COMPOSITE control — one whose own template renders
 * other ngwr controls. Such a component shields its subtree by re-providing
 * `WR_FORM_FIELD` as `null`, or the inner parts each announce the outer field's
 * error as their own; a component sees its own providers, so it has to read the
 * real field from one level up.
 *
 * @example
 * ```ts
 * protected readonly fieldAria = useFormFieldAria();
 * ```
 * ```html
 * <input [attr.aria-invalid]="fieldAria.ariaInvalid()" [attr.aria-describedby]="fieldAria.describedBy()" />
 * ```
 */
export function useFormFieldAria(options?: { readonly skipSelf?: boolean }): WrFormFieldAria {
  const field = inject(WR_FORM_FIELD, { optional: true, skipSelf: options?.skipSelf ?? false });
  const describedBy = computed(() => field?.describedBy() ?? null);
  return {
    describedBy,
    ariaInvalid: computed<'true' | null>(() => (describedBy() ? 'true' : null)),
  };
}
