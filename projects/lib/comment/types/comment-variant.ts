/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** How a `<wr-comment>` is drawn: a discussion row, or a chat bubble. */
export type WrCommentVariant = 'row' | 'bubble';

/**
 * Which inline side a bubble sits on. `start` is a message from someone else,
 * `end` is the reader's own, so both follow the writing direction under RTL.
 */
export type WrCommentSide = 'start' | 'end';
