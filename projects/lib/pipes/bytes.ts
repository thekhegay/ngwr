/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Humanise a byte count using binary (1024-based) units.
 *
 * @example
 * ```html
 * {{ 1234 | wrBytes }}            <!-- "1.2 KB"   -->
 * {{ 1234567 | wrBytes: 0 }}      <!-- "1 MB"     -->
 * {{ 0 | wrBytes }}               <!-- "0 B"      -->
 * ```
 */
@Pipe({ name: 'wrBytes' })
export class WrBytes implements PipeTransform {
  transform(value: number | string | null | undefined, decimals = 1): string {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '0 B';

    // Floored as well as capped: for `0 < n < 1` the log is negative, so an
    // unclamped index reads `UNITS[-1]` (`undefined`) and divides by `1024 ** -1`,
    // which rendered `0.5` as "512.0 undefined".
    const i = Math.min(Math.max(0, Math.floor(Math.log(n) / Math.log(1024))), UNITS.length - 1);
    const v = n / 1024 ** i;
    // Whole bytes never show a fractional part.
    const fractionDigits = i === 0 ? 0 : Math.max(0, decimals);
    return `${v.toFixed(fractionDigits)} ${UNITS[i]}`;
  }
}
