/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Signal } from '@angular/core';

import type { WrCollapseGroupMember } from './collapse-group-member';

/**
 * Contract a collapse uses to talk to its parent `<wr-collapse-group>`.
 *
 * @internal
 */
export interface WrCollapseGroupContext {
  /** When true, only one child collapse may be open at a time. */
  readonly accordion: Signal<boolean>;
  /** Called by a child when it opens — closes siblings in accordion mode. */
  notifyOpened(opener: object): void;
  /** Register a child so the group can call `closeAll()` etc. */
  register(member: WrCollapseGroupMember): void;
  /** Unregister on destroy. */
  unregister(memberId: object): void;
}
