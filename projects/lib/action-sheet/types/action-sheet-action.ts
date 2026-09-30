/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One row in a {@link WrActionSheet}. */
export interface WrActionSheetAction {
  /** Row label. */
  label: string;
  /** Caller-defined payload, echoed back in the `action` output. */
  value?: unknown;
  /** Optional leading icon — a `wr-icon` name. */
  icon?: string;
  /**
   * Visual role. `destructive` paints the row in the danger colour; `cancel`
   * moves it to a separate group pinned at the bottom (iOS style).
   * @default 'default'
   */
  role?: 'default' | 'destructive' | 'cancel';
  /** Disable the row. */
  disabled?: boolean;
}
