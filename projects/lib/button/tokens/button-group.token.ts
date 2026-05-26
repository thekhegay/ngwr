/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

import type { WrButtonShape } from '../types';

/**
 * Contract a child `<wr-btn>` reads from its enclosing `<wr-btn-group>`.
 *
 * @internal
 */
export interface WrButtonGroupContext {
  /** Shape cascade — child buttons fall back to this when they don't set their own. */
  readonly shape: Signal<WrButtonShape | null>;
}

/**
 * Token a `<wr-btn>` injects to discover its parent `<wr-btn-group>`. The
 * group provides itself via this token so children can react to the
 * group's `shape` cascade.
 *
 * @internal
 */
export const WR_BUTTON_GROUP = new InjectionToken<WrButtonGroupContext>('WR_BUTTON_GROUP');
