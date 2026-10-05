/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One row in either pane of a `<wr-transfer>`. */
export interface WrTransferItem<TValue = unknown> {
  /** Identity — what `[(value)]` carries, compared with SameValueZero. */
  readonly value: TValue;
  /** Text shown in the pane and matched by the search box. */
  readonly label: string;
  /** Greyed out and never moved by the bulk buttons. */
  readonly disabled?: boolean;
}
