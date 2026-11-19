/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  ElementRef,
  Renderer2,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  inject,
  input,
} from '@angular/core';

import { useI18nFormatter } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

import { WrAvatar } from './avatar';
import type { WrAvatarShape, WrAvatarSize } from './types';

/** A count limit: a whole number from 0, anything else (`null`, `''`, `NaN`, a negative) is no limit. */
function toMax(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Avatars stacked with a small overlap, and a "+N" avatar once more are
 * projected than `max` allows.
 *
 * The avatars beyond `max` get the `hidden` attribute (`display: none`), so they
 * leave the paint and the accessibility tree together. The "+N" avatar takes the
 * size and shape of the first one and is named "N more" through the `avatar.more`
 * i18n key, with the visible text hidden from assistive technology. Each avatar
 * keeps its own `size`: give them all the same one.
 *
 * The group is a `role="group"` named by `label`; with no `label` it carries no
 * role, since an unnamed group announces nothing useful. Avatars must be direct
 * children (a `@for` is fine, a wrapper element is not).
 *
 * @example
 * ```html
 * <wr-avatar-group [max]="3" label="Assignees">
 *   @for (p of people; track p.id) {
 *     <wr-avatar shape="circle" [size]="32" [name]="p.name" tint />
 *   }
 * </wr-avatar-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/avatar
 */
@Component({
  selector: 'wr-avatar-group',
  templateUrl: './avatar-group.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-avatar-group',
    '[attr.role]': 'label() ? "group" : null',
    '[attr.aria-label]': 'label() || null',
  },
  imports: [WrAvatar],
})
export class WrAvatarGroup {
  /**
   * The most avatars drawn. Past it the rest are hidden and a "+N" avatar counts
   * them. Unset, negative or not a number: no limit.
   *
   * @default null
   */
  readonly max = input<number | null, unknown>(null, { transform: toMax });

  /**
   * The group's accessible name, for example "Assignees". Without one the group
   * has no role.
   *
   * @default null
   */
  readonly label = input<string | null>(null);

  private readonly avatars = contentChildren(WrAvatar);
  private readonly elements = contentChildren(WrAvatar, { read: ElementRef });
  private readonly renderer = inject(Renderer2);
  private readonly moreText = useI18nFormatter('avatar.more', '{{count}} more');

  /** How many avatars `max` hides. */
  protected readonly hiddenCount = computed(() => {
    const max = this.max();
    return max === null ? 0 : Math.max(0, this.avatars().length - max);
  });

  protected readonly moreName = computed(() => this.moreText({ count: this.hiddenCount() }));
  protected readonly moreSize = computed<WrAvatarSize>(() => this.avatars()[0]?.size() ?? '6rem');
  protected readonly moreShape = computed<WrAvatarShape>(() => this.avatars()[0]?.shape() ?? 'rounded');

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('avatar');

    // Only the `hidden` the group set comes off again: one a consumer put on an
    // avatar is theirs.
    const hiddenByGroup = new WeakSet<HTMLElement>();
    effect(() => {
      const max = this.max();
      this.elements().forEach((el, i) => {
        const node = (el as ElementRef<HTMLElement>).nativeElement;
        if (max !== null && i >= max) {
          if (node.hasAttribute('hidden')) return;
          this.renderer.setAttribute(node, 'hidden', '');
          hiddenByGroup.add(node);
        } else if (hiddenByGroup.delete(node)) {
          this.renderer.removeAttribute(node, 'hidden');
        }
      });
    });
  }
}
