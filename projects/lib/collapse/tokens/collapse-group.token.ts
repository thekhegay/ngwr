/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

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
  register(member: { close(): void; readonly id: object }): void;
  /** Unregister on destroy. */
  unregister(memberId: object): void;
}

/**
 * Token a `<wr-collapse>` injects to register itself with — and notify of
 * open events — its parent `<wr-collapse-group>`. Drives the accordion
 * behaviour when the group has `accordion` enabled.
 *
 * @internal
 */
export const WR_COLLAPSE_GROUP = new InjectionToken<WrCollapseGroupContext>('WR_COLLAPSE_GROUP');
