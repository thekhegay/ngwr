/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Signal } from '@angular/core';

import type { WrButtonShape } from './button-shape';

/**
 * Contract a child `<wr-btn>` reads from its enclosing `<wr-btn-group>`.
 *
 * @internal
 */
export interface WrButtonGroupContext {
  /** Shape cascade — child buttons fall back to this when they don't set their own. */
  readonly shape: Signal<WrButtonShape | null>;
}
