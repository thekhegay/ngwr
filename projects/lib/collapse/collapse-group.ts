/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, forwardRef, input } from '@angular/core';

import { WR_COLLAPSE_GROUP, type WrCollapseGroupContext } from './tokens';

interface Member {
  close(): void;
  readonly id: object;
}

/**
 * Visual + behavioral grouping of `<wr-collapse>` children. When
 * `accordion` is true, opening one child closes the others.
 *
 * @see https://ngwr.dev/reference/components/collapse
 */
@Component({
  selector: 'wr-collapse-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-collapse-group' },
  providers: [
    {
      provide: WR_COLLAPSE_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCollapseGroup),
    },
  ],
})
export class WrCollapseGroup implements WrCollapseGroupContext {
  /** When true, only one child may be open at a time. @default false */
  readonly accordion = input(false, { transform: coerceBooleanProperty });

  private readonly members = new Map<object, Member>();

  register(member: Member): void {
    this.members.set(member.id, member);
  }

  unregister(memberId: object): void {
    this.members.delete(memberId);
  }

  notifyOpened(opener: object): void {
    if (!this.accordion()) return;
    for (const [id, member] of this.members) {
      if (id !== opener) member.close();
    }
  }
}
