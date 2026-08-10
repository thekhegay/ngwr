/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * What a projected control can read from its surrounding `<wr-form-field>`.
 *
 * The field renders `<label [for]>` before it can see what was projected into
 * it, so the id has to travel the other way: the control adopts the id the
 * label already points at. Doing it through DI keeps it a render-time binding,
 * which is what SSR needs — stamping the id from `afterNextRender` would leave
 * every prerendered page with a label pointing at nothing.
 */
export interface WrFormFieldContext {
  /** Id the field's `<label for>` points at. */
  readonly controlId: Signal<string>;

  /**
   * The reverse direction, for the one case the paragraph above does not cover: a
   * projected control that already carries its own `id` keeps it, and the label has
   * to follow, or `for` names an element that does not exist and the field ends up
   * with no label at all. Called during the control's construction, so the label's
   * binding still resolves in the same render pass.
   */
  adoptControlId(id: string): void;

  /**
   * Validator keys currently in error, once the control is touched or dirty.
   * Empty when the field is valid or has not been interacted with.
   */
  readonly errorKeys: Signal<readonly string[]>;

  /** Id of the element listing the visible messages, or `null` when there are none. */
  readonly describedBy: Signal<string | null>;
}

/** Present only inside a `<wr-form-field>`; inject with `{ optional: true }`. */
export const WR_FORM_FIELD = new InjectionToken<WrFormFieldContext>('WR_FORM_FIELD');
