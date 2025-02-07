/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'newArray',
})
export class NewArrayPipe implements PipeTransform {
  transform(arrayLength: number): number[] {
    return new Array(arrayLength);
  }
}
