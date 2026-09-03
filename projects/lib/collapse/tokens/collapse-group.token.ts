/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * What a `<wr-collapse>` hands its parent group when it registers.
 *
 * A named export rather than the structural type it used to be spelled as. Both
 * group components declared their OWN local `interface Member`, so d.ts
 * flattening had two of one name to resolve and published the second as
 * `Member$1` — a bundler-assigned identifier in the signature of a public method,
 * which no consumer could import and nobody had authored.
 */
export interface WrCollapseGroupMember {
  /** Close this collapse — the group calls it on siblings in accordion mode. */
  close(): void;
  /** Identity of the registering collapse, used as the map key and by `notifyOpened`. */
  readonly id: object;
}

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

/**
 * Token a `<wr-collapse>` injects to register itself with — and notify of
 * open events — its parent `<wr-collapse-group>`. Drives the accordion
 * behaviour when the group has `accordion` enabled.
 *
 * @internal
 */
export const WR_COLLAPSE_GROUP = new InjectionToken<WrCollapseGroupContext>('WR_COLLAPSE_GROUP');
