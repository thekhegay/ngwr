/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, LOCALE_ID, ViewEncapsulation, computed, inject, input, numberAttribute } from '@angular/core';

import type { WrColor } from 'ngwr/theme';
import { wrCheckStyles, wrIntlNumberFormat } from 'ngwr/utils';

import type { WrBadgeShape, WrBadgeSize } from './types';

/**
 * Lean chip — color, size, rounded/pill. Use for short labels and counts
 * (e.g. "ONLINE", "3 unread", "v2.1"), where the words say the state and the
 * colour decorates it. Reach for `<wr-tag>` when you need icons, loading
 * state, or outlined / transparent styles.
 *
 * @example
 * ```html
 * <wr-badge color="success">Active</wr-badge>
 * <wr-badge color="danger" size="sm">3</wr-badge>
 * <wr-badge color="primary" shape="pill">New</wr-badge>
 *
 * <span class="wr-badge-anchor">
 *   <wr-btn icon="bell" aria-label="Notifications" />
 *   <wr-badge anchor color="danger" size="sm" shape="pill" [count]="unread()" />
 * </span>
 * ```
 *
 * @see https://ngwr.dev/reference/components/badge
 */
@Component({
  selector: 'wr-badge',
  // One line, so a badge with nothing to draw holds no text node and `:empty` matches.
  template:
    '@if (text(); as value) {<span class="wr-badge__count" [attr.aria-hidden]="ariaLabel() ? true : null">{{ value }}</span>}' +
    '@if (ariaLabel(); as label) {<span class="wr-badge__label">{{ label }}</span>}' +
    '@if (!dot()) {<ng-content />}',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-badge',
    '[class]': 'classes()',
  },
})
export class WrBadge {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('badge');
  }

  /**
   * Color variant. Maps to `--wr-color-*` CSS variables from the theme. It is
   * decoration or category, never the state on its own: four of the five intents
   * share one lightness and `success` against `danger` is 1.004:1, so the label
   * has to say the state (`Offline`, not a red `Status`). A badge draws no
   * icon — when a chip must stand for a status without words, use `<wr-tag>`
   * with its `icon` input.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor | null>('primary');

  /**
   * Size variant.
   *
   * @default 'md'
   */
  readonly size = input<WrBadgeSize>('md');

  /**
   * Corner treatment. Mirrors `<wr-btn>` — `rounded` (default) uses the
   * small form-radius; `pill` rounds the ends fully.
   *
   * @default 'rounded'
   */
  readonly shape = input<WrBadgeShape>('rounded');

  /**
   * Outlined style — transparent fill, colored border and text.
   *
   * @default false
   */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

  /**
   * A number the badge draws itself, grouped per `LOCALE_ID`. `null` draws
   * nothing and leaves the badge to its projected text. `0` hides the badge
   * unless `showZero` is set.
   *
   * @default null
   */
  readonly count = input<number | null>(null);

  /**
   * The largest `count` drawn as is: past it the badge reads `99+`.
   *
   * @default 99
   */
  readonly max = input(99, { transform: numberAttribute });

  /**
   * Keep a `count` of `0` on screen.
   *
   * @default false
   */
  readonly showZero = input(false, { transform: coerceBooleanProperty });

  /**
   * A small circle with no text, which also drops the `count` and any
   * projected text. Colour is all
   * it shows, so name it with `ariaLabel` unless the words beside it already
   * say the state.
   *
   * @default false
   */
  readonly dot = input(false, { transform: coerceBooleanProperty });

  /**
   * Text for a screen reader, drawn visually hidden: the name of a `dot`, or
   * what a `count` counts (`3 unread messages`), read in place of the bare
   * number.
   *
   * @default null
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Pin the badge to the top end corner of the nearest `.wr-badge-anchor`
   * wrapper, over an icon button or an avatar. An anchored badge with nothing
   * to draw is hidden.
   *
   * @default false
   */
  readonly anchor = input(false, { transform: coerceBooleanProperty });

  private readonly locale = inject(LOCALE_ID);

  protected readonly text = computed(() => {
    const count = this.count();
    if (count === null || this.dot()) return null;
    const max = this.max();
    const format = wrIntlNumberFormat(this.locale);
    return count > max ? `${format.format(max)}+` : format.format(count);
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];

    const color = this.color();
    if (color) parts.push(`wr-badge--${color}`);

    const size = this.size();
    if (size !== 'md') {
      parts.push(`wr-badge--${size}`);
    }
    const shape = this.shape();
    if (shape !== 'rounded') {
      parts.push(`wr-badge--${shape}`);
    }
    if (this.outlined()) {
      parts.push('wr-badge--outlined');
    }
    if (this.dot()) {
      parts.push('wr-badge--dot');
    } else if (this.count() !== null) {
      parts.push('wr-badge--count');
      if (this.count() === 0 && !this.showZero()) parts.push('wr-badge--hidden');
    }
    if (this.anchor()) {
      parts.push('wr-badge--anchor');
    }
    return parts.join(' ');
  });
}
