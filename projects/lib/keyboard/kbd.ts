/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrKbdSize } from './interfaces';

/**
 * Tiny keycap chip — renders projected content (`⌘`, `K`, `Enter`, etc.) in
 * a beveled rectangle that reads as a physical key. Stack multiple `<wr-kbd>`
 * with a plain `+` between them for chords.
 *
 * @example
 * ```html
 * <wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd>
 * <wr-kbd size="lg">Esc</wr-kbd>
 * ```
 *
 * @see https://ngwr.dev/reference/components/keyboard
 */
@Component({
  selector: 'wr-kbd',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrKbd {
  /** Visual size variant. @default 'md' */
  readonly size = input<WrKbdSize>('md');

  protected readonly classes = computed(() => `wr-kbd wr-kbd--${this.size()}`);
}
