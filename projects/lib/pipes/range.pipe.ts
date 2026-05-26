/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/**
 * Creates an array of sequential indices `[0, 1, 2, ..., n-1]`.
 *
 * Useful for repeating template blocks a fixed number of times.
 *
 * @example
 * ```html
 * @for (i of (5 | wrRange); track i) {
 *   <div>Item {{ i }}</div>
 * }
 * ```
 */
@Pipe({ name: 'wrRange' })
export class WrRangePipe implements PipeTransform {
  transform(length: number): number[] {
    return Array.from({ length }, (_, i) => i);
  }
}
