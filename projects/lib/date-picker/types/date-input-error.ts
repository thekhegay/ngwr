/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Why the text typed into a picker's field was not committed.
 *
 * A picker never guesses: text it cannot read, or a date the calendar would
 * refuse, leaves the bound value exactly as it was. This is the reason it
 * refused, in the shape Angular's forms carry an error — `kind` is the key
 * `<wr-form-field>` resolves a message for (`validation.<kind>` in the
 * `ngwr/i18n` catalogs), and `message` is that sentence already resolved, for
 * a template that renders errors itself.
 *
 * - `dateFormat` — the text does not read as a date in the field's format.
 *   `example` is a date written in that format, for the message to show.
 * - `minDate` / `maxDate` — the text reads, and the date is outside the bounds.
 * - `dateFilter` — the text reads, and the `dateFilter` predicate rejects it.
 *
 * The same keys, and the same `min` / `max` payload, as `WrValidators.minDate`
 * and `WrValidators.maxDate`, so one app-wide message covers both.
 */
export type WrDateInputError =
  | { readonly kind: 'dateFormat'; readonly message: string; readonly example: string }
  | { readonly kind: 'minDate'; readonly message: string; readonly date: Date; readonly min: Date }
  | { readonly kind: 'maxDate'; readonly message: string; readonly date: Date; readonly max: Date }
  | { readonly kind: 'dateFilter'; readonly message: string; readonly date: Date };

/** A {@link WrDateInputError} from one end of a `<wr-date-range-picker>`. */
export type WrDateRangeInputError = WrDateInputError & { readonly end: 'start' | 'end' };
