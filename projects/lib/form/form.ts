/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Directive, computed, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

/**
 * Lays out the fields of a form: a column with a gap by default, a wrapping
 * row with `inline`, or rows of `columns` equal columns that fall back to one
 * column when the form itself is narrow.
 *
 * @example
 * ```html
 * <form wrForm columns="2">
 *   <wr-form-field label="First name"><input wrInput /></wr-form-field>
 *   <wr-form-field label="Last name"><input wrInput /></wr-form-field>
 *   <wr-form-field label="Email" wrFormSpan><input wrInput /></wr-form-field>
 * </form>
 * ```
 *
 * @see https://ngwr.dev/reference/components/form
 */
@Directive({
  selector: '[wrForm]',
  host: {
    class: 'wr-form',
    '[class.wr-form--inline]': 'inline()',
    '[class.wr-form--columns]': 'grid()',
    '[style.--wr-form-columns]': 'columns()',
  },
})
export class WrForm {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('form');
  }

  /**
   * Lay the fields out in a wrapping row, aligned on their bottom edge.
   * `columns` is ignored.
   *
   * @default false
   */
  readonly inline = input(false, { transform: coerceBooleanProperty });

  /**
   * How many equal columns a row holds. Below a form width of `30rem` every
   * field takes a full row.
   *
   * @default 1
   */
  readonly columns = input(1, {
    transform: (value: unknown): number => Math.max(1, Math.floor(coerceNumberProperty(value, 1))),
  });

  protected readonly grid = computed(() => !this.inline() && this.columns() > 1);
}

/**
 * Stretches a child of `[wrForm]` over several columns: all of them with no
 * value, or the given number.
 *
 * @example
 * ```html
 * <wr-form-field label="Address" wrFormSpan="2"><input wrInput /></wr-form-field>
 * ```
 *
 * @see https://ngwr.dev/reference/components/form
 */
@Directive({
  selector: '[wrFormSpan]',
  host: { class: 'wr-form__span', '[style.--wr-form-span]': 'track()' },
})
export class WrFormSpan {
  /**
   * Columns to span. Empty or `'full'` takes the whole row.
   *
   * @default 'full'
   */
  readonly span = input<number | 'full', unknown>('full', {
    alias: 'wrFormSpan',
    transform: value => {
      const count = Math.floor(coerceNumberProperty(value, 0));
      return count >= 1 ? count : 'full';
    },
  });

  protected readonly track = computed(() => {
    const span = this.span();
    return span === 'full' ? '1 / -1' : `span ${span}`;
  });
}
