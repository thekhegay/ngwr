/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input, output } from '@angular/core';

import type { WrMentionItem } from './types';

/**
 * Overlay panel rendered by {@link WrMention}. Not intended for
 * direct use — the directive instantiates it via a ComponentPortal.
 */
@Component({
  selector: 'wr-mention-panel',
  templateUrl: './mention-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-mention-panel' },
})
export class WrMentionPanel {
  readonly items = input<readonly WrMentionItem[]>([]);
  readonly activeIndex = input(0);
  readonly displayWith = input<(item: WrMentionItem) => string>(item => item.label);

  /** Emitted when the user picks an item (click). */
  readonly picked = output<WrMentionItem>();

  /** Emitted on mouseenter — used by the directive to track hover. */
  readonly hovered = output<number>();

  protected onPick(item: WrMentionItem, event: MouseEvent): void {
    // mousedown semantics — keep focus on the input.
    event.preventDefault();
    this.picked.emit(item);
  }
}
