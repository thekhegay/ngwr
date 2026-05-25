/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A mentionable item — extend with whatever metadata your app needs. */
export type WrMentionItem = {
  readonly label: string;
  readonly [key: string]: unknown;
};

/** Payload emitted by `(wrMentionSelected)` on commit. */
export type WrMentionCommit<T extends WrMentionItem = WrMentionItem> = {
  /** The selected item. */
  readonly item: T;
  /** The trigger character that opened the panel (e.g. `'@'`). */
  readonly trigger: string;
  /** The query text the user typed after the trigger. */
  readonly query: string;
};
