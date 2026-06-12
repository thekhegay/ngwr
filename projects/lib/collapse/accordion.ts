/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, forwardRef, signal } from '@angular/core';

import { WR_COLLAPSE_GROUP, type WrCollapseGroupContext } from './tokens';

interface Member {
  close(): void;
  readonly id: object;
}

/**
 * Accordion — a `<wr-collapse>` container that enforces single-open
 * behavior: opening a child closes its siblings.
 *
 * Use `<wr-collapse-group>` when you only need visual grouping without
 * the mutually-exclusive open semantics.
 *
 * @example
 * ```html
 * <wr-accordion>
 *   <wr-collapse title="Profile">…</wr-collapse>
 *   <wr-collapse title="Security">…</wr-collapse>
 *   <wr-collapse title="Notifications">…</wr-collapse>
 * </wr-accordion>
 * ```
 *
 * @see https://ngwr.dev/components/collapse
 */
@Component({
  selector: 'wr-accordion',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-collapse-group wr-collapse-group--accordion' },
  providers: [
    {
      provide: WR_COLLAPSE_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrAccordion),
    },
  ],
})
export class WrAccordion implements WrCollapseGroupContext {
  /** Always behaves as an accordion. Provided for context-interface symmetry. */
  readonly accordion = signal(true).asReadonly();

  private readonly members = new Map<object, Member>();

  register(member: Member): void {
    this.members.set(member.id, member);
  }

  unregister(memberId: object): void {
    this.members.delete(memberId);
  }

  notifyOpened(opener: object): void {
    for (const [id, member] of this.members) {
      if (id !== opener) member.close();
    }
  }
}
