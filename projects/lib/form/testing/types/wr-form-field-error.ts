/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where a visible message came from, as far as the DOM can tell.
 *
 * - `projected` — a `<wr-form-error key="…">` the consumer wrote. It is its own
 *   element, so this one IS distinguishable.
 * - `resolved` — the field rendered it from the copy chain
 *   (`provideWrFormErrors()` → the `ngwr/i18n` `validation.*` catalog → the
 *   built-in English sentence). All three links render the same `<div>`, so the
 *   DOM cannot say which of them answered — compare the TEXT if you need to know.
 */
export type WrFormFieldErrorSource = 'projected' | 'resolved';

/** One message a `<wr-form-field>` is currently showing. */
export interface WrFormFieldError {
  /**
   * Validator key the message answers, read from `data-key`. `null` for a keyless
   * `<wr-form-error>`, which always renders.
   */
  readonly key: string | null;
  /** The rendered text. */
  readonly text: string;
  /** Whether the consumer wrote this message or the field resolved it. */
  readonly source: WrFormFieldErrorSource;
}
