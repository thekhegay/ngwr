/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, signal, type WritableSignal } from '@angular/core';

import type { WrLightbox } from './lightbox';

interface Entry {
  readonly member: WrLightbox;
  readonly host: HTMLElement;
}

/**
 * Every grouped `wr-lightbox`, keyed by its `group`.
 *
 * @internal
 */
@Service()
export class WrLightboxGroups {
  private readonly groups = new Map<string, WritableSignal<readonly Entry[]>>();

  add(group: string, member: WrLightbox, host: HTMLElement): void {
    this.entries(group).update(list => [...list, { member, host }]);
  }

  remove(group: string, member: WrLightbox): void {
    const entries = this.entries(group);
    entries.update(list => list.filter(entry => entry.member !== member));
    if (!entries().length) this.groups.delete(group);
  }

  /**
   * Re-reads the order. Registration follows creation, and a member that only
   * MOVED in the document registers nothing, so the gallery asks again each
   * time it opens.
   */
  refresh(group: string): void {
    this.groups.get(group)?.update(list => [...list]);
  }

  /** The group's members in document order. */
  members(group: string): readonly WrLightbox[] {
    return [...this.entries(group)()]
      .sort((a, b) =>
        // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
        (a.host.compareDocumentPosition(b.host) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 ? -1 : 1
      )
      .map(entry => entry.member);
  }

  private entries(group: string): WritableSignal<readonly Entry[]> {
    let entries = this.groups.get(group);
    if (!entries) {
      entries = signal<readonly Entry[]>([]);
      this.groups.set(group, entries);
    }
    return entries;
  }
}
