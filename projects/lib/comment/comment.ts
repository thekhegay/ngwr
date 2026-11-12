/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrCommentSide, WrCommentVariant } from './types';

/**
 * One entry in a discussion or a chat: avatar, author, time, body, actions and
 * nested replies. The data stays with the app: the component takes no array,
 * fetches nothing and sorts nothing. Everything is projected or passed as a
 * string, and the app formats the time itself (`wrDate` is the usual route).
 *
 * Slots, each optional:
 *
 * - `<wr-avatar>` or `[wrCommentAvatar]` for the avatar column
 * - `[wrCommentAuthor]` for an author drawn by the app (a profile link) in
 *   place of the `author` input
 * - default content for the body
 * - `[wrCommentActions]` for the action row under the body
 * - nested `<wr-comment>` elements, or a `[wrCommentReplies]` wrapper, for
 *   replies; they indent twice, and deeper levels sit flush with their parent
 *   so a phone keeps room for the body
 *
 * The host is an `article` named after the author, replies sit in a `group`
 * named by `repliesLabel`, and no heading level is assumed: the page owns the
 * outline. Wrap a thread in a list and a chat in `role="log"`.
 *
 * `variant="bubble"` draws the body as a chat bubble; `side="end"` puts it on
 * the reader's own side of the log.
 *
 * @example
 * ```html
 * <wr-comment author="Ann" time="2 hours ago" [datetime]="posted">
 *   <wr-avatar size="2.5rem" alt="">AN</wr-avatar>
 *   Looks good to me.
 *   <div wrCommentActions><button wr-btn size="sm">Reply</button></div>
 *   <wr-comment author="Bob" time="an hour ago">Thanks!</wr-comment>
 * </wr-comment>
 *
 * <wr-comment variant="bubble" side="end" time="09:41">On my way.</wr-comment>
 * ```
 *
 * @see https://ngwr.dev/reference/components/comment
 */
@Component({
  selector: 'wr-comment',
  templateUrl: './comment.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-comment',
    '[class]': 'classes()',
    role: 'article',
    '[attr.aria-label]': 'author() || null',
  },
})
export class WrComment {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('comment');
  }

  /**
   * Who wrote it. Also the article's accessible name. Leave it empty when a
   * `[wrCommentAuthor]` element draws the name instead.
   *
   * @default ''
   */
  readonly author = input<string>('');

  /**
   * When it was written, already formatted: the component does no date
   * formatting. Run a `Date` through the `wrDate` pipe on the way in.
   *
   * @default ''
   */
  readonly time = input<string>('');

  /**
   * The same moment, machine-readable. With it the time renders as a
   * `<time datetime>`: a `Date` is written as ISO 8601, a string as given.
   *
   * @default null
   */
  readonly datetime = input<Date | string | null>(null);

  /**
   * `row` is a discussion entry; `bubble` is a chat message, which takes no replies.
   *
   * @default 'row'
   */
  readonly variant = input<WrCommentVariant>('row');

  /**
   * Which inline side a bubble sits on. `end` is the reader's own message.
   * Ignored by the `row` variant.
   *
   * @default 'start'
   */
  readonly side = input<WrCommentSide>('start');

  /** Accessible name of the replies group. Falls back to `comment.replies`, then `'Replies'`. */
  readonly repliesLabel = input<string | null>(null);

  protected readonly resolvedRepliesLabel = useI18nText(this.repliesLabel, 'comment.replies', 'Replies');

  protected readonly isoDatetime = computed(() => {
    const value = this.datetime();
    if (value === null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    return value || null;
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.variant() === 'bubble') parts.push('wr-comment--bubble', `wr-comment--${this.side()}`);
    return parts.join(' ');
  });
}
