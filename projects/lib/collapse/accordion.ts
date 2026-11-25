/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, forwardRef, input, signal } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { wrCollapseHeadingLevel } from './heading-level';
import { WR_COLLAPSE_GROUP } from './tokens';
import type { WrCollapseGroupContext, WrCollapseGroupMember, WrCollapseHeadingLevel } from './types';

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
 * @see https://ngwr.dev/reference/components/collapse
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
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('collapse');
  }

  /** Always behaves as an accordion. Provided for context-interface symmetry. */
  readonly accordion = signal(true).asReadonly();

  /**
   * Heading level (1 to 6) a child header sits in when the child sets none. `null` leaves
   * the header a bare button.
   * @default null
   */
  readonly headingLevel = input<WrCollapseHeadingLevel | null, unknown>(null, { transform: wrCollapseHeadingLevel });

  private readonly members = new Map<object, WrCollapseGroupMember>();

  register(member: WrCollapseGroupMember): void {
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
