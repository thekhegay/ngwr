/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A button on a toast: "Undo" on "Item deleted", "Retry" on "Upload failed".
 * Pressing it closes the toast and calls `run`, once.
 */
export interface WrToastAction {
  /** The button's text. The app supplies it: the library ships no copy for it. */
  readonly label: string;
  /** Called once when the button is pressed, after the toast has closed. */
  readonly run: () => void;
}
