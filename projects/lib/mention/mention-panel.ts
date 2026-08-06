/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input, output } from '@angular/core';

import type { WrMentionItem } from './interfaces';

/**
 * The id of the option at `index`, given the listbox's own id.
 *
 * Lives here, and is used from both sides, because this format is a contract
 * between two files: the panel stamps it onto each `<li>`, and the directive
 * names one of them in `aria-activedescendant`. Written out twice, the two would
 * drift and the reference would silently dangle — and a dangling
 * `aria-activedescendant` is not an error the browser reports, it just stops
 * announcing options.
 *
 * @internal
 */
export function wrMentionOptionId(listboxId: string, index: number): string {
  return `${listboxId}-opt-${index}`;
}

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

  /**
   * Id of the `<ul role="listbox">`, minted by the directive and pointed at by
   * its `aria-controls`. Owned there rather than here because the panel is
   * disposed and rebuilt whenever the caret leaves a mention, while the
   * attribute on the host has to stay put.
   *
   * Plain `input('')`, never `input.required` — a ComponentPortal-created
   * component throws on the first change detection if a required input is unset.
   */
  readonly listboxId = input('');

  /** Accessible name for the listbox. ARIA requires one; the directive supplies it from the catalog. */
  readonly listLabel = input('');

  protected optionId(index: number): string {
    return wrMentionOptionId(this.listboxId(), index);
  }

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
