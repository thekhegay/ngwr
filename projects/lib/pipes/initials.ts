/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { wrInitials } from 'ngwr/utils';

/**
 * Up to two initials of a name: `wrInitials()` from `ngwr/utils`, upper-cased
 * in `LOCALE_ID`.
 *
 * @example
 * ```html
 * {{ 'Roman Khegay' | wrInitials }}   <!-- "RK" -->
 * {{ 'madonna' | wrInitials }}        <!-- "M"  -->
 * {{ '王小明' | wrInitials }}          <!-- "王" -->
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-initials
 */
@Pipe({ name: 'wrInitials' })
export class WrInitials implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: string | null | undefined): string {
    return wrInitials(value, this.locale);
  }
}
