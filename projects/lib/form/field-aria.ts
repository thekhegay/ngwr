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
  /**
   * Id of the field's message block while it is showing one, of its hint
   * otherwise, and `null` when it is showing neither.
   */
  readonly describedBy: Signal<string | null>;
  /** `'true'` while the field has a validation error, `null` otherwise. */
  readonly ariaInvalid: Signal<'true' | null>;
  /**
   * Id of the field's `<label>`, for a control `<label for>` cannot reach.
   *
   * `for` binds only to a LABELABLE element, so a control whose focusable part
   * is a `div` with a role gets nothing from it — measured, `wr-rating`,
   * `wr-knob` and `wr-file-upload` all rendered a field label whose `for` named
   * no element in the document. Point `aria-labelledby` at this instead; a
   * control that IS labelable should ignore it and let `for` do the work, or the
   * name is announced twice.
   */
  readonly labelledBy: Signal<string | null>;
}

/**
 * The two attributes that make a `<wr-form-field>`'s visible text — its error
 * message, or its hint — reach a screen reader. Bind both on whichever element
 * carries the control's role.
 *
 * Without them the copy the field renders is visible and nothing else: the
 * control announces itself as valid, and the text is associated with nothing.
 * No automated gate catches that — axe has no rule that a visible error or hint
 * must be programmatically associated with its control — so this helper exists
 * to make the wiring one line per control rather than three, and the specs are
 * the gate.
 *
 * The field renders an error OR a hint, never both, so `describedBy` names
 * whichever is on screen and `aria-invalid` is keyed SEPARATELY, on the field's
 * `errorKeys()`. Deriving it from `describedBy` instead — which is what every
 * control did while a hint had no id to name — makes a field with a plain hint
 * announce its control as invalid the moment the hint becomes describable.
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
  return {
    // `hintId` is optional on the interface so an app-provided field keeps
    // compiling; one without it describes nothing but its errors, as before.
    describedBy: computed(() => field?.describedBy() ?? field?.hintId?.() ?? null),
    ariaInvalid: computed<'true' | null>(() => ((field?.errorKeys().length ?? 0) > 0 ? 'true' : null)),
    // `null` for a control that `<label for>` already reaches — pointing at the
    // same label twice would name it twice. Only the role-based controls read
    // this, and only because `for` cannot bind to a role.
    labelledBy: computed(() => field?.labelId?.() ?? null),
  };
}
