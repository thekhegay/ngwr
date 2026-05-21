/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a `<wr-tab>` uses to talk to its parent `<wr-tabs>`.
 *
 * @internal
 */
export type WrTabsContext = {
  /** Currently active tab key (component-managed only). */
  readonly active: Signal<string | null>;
  /** Activate a tab by key (component-managed only). */
  activate(key: string): void;
  /** Register a child tab so the parent can pick a default. */
  register(tab: { key: string; routerLink: unknown }): void;
  /** Unregister on destroy. */
  unregister(key: string): void;
};

export const WR_TABS = new InjectionToken<WrTabsContext>('WR_TABS');
