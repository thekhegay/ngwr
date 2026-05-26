/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/**
 * Clamp a string to `length` characters, appending `ellipsis` when truncated.
 *
 * @example
 * ```html
 * {{ 'Hello, world' | wrTruncate: 5 }}           <!-- "Hello…"      -->
 * {{ 'Hello, world' | wrTruncate: 8: '...' }}    <!-- "Hello, w..." -->
 * ```
 */
@Pipe({ name: 'wrTruncate' })
export class WrTruncate implements PipeTransform {
  transform(value: string | null | undefined, length = 80, ellipsis = '…'): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.length <= length) return s;
    return s.slice(0, Math.max(0, length)) + ellipsis;
  }
}
