/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injectable } from '@angular/core';

/**
 * Tracks open `<wr-window>` instances so a freshly-focused window can be
 * brought to the top of the stack without consumers having to manage
 * z-indexes themselves.
 *
 * - `bringToFront()` returns a strictly increasing z-index. Each window
 *   keeps the result in a signal and rebinds it on pointerdown.
 * - `nextStartOffset()` cascades new windows by ~30px so two windows opened
 *   at the same default position don't perfectly overlap.
 */
@Injectable({ providedIn: 'root' })
export class WrWindowManager {
  private readonly baseZ = 1000;
  private topZ = this.baseZ;
  private openCount = 0;

  /** Reserve the next z-index. Strictly increasing across the app's lifetime. */
  bringToFront(): number {
    this.topZ += 1;
    return this.topZ;
  }

  /** Cascade offset for new windows, so two opens don't perfectly overlap. */
  nextStartOffset(): { readonly x: number; readonly y: number } {
    const offset = (this.openCount % 10) * 30;
    this.openCount += 1;
    return { x: 50 + offset, y: 50 + offset };
  }
}
