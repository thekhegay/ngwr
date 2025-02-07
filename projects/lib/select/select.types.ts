/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */
import { SafeAny } from 'ngwr/cdk/types';

export interface WrSelectOption {
  label: string;
  value: SafeAny;
  disabled?: boolean;
}

export interface WrSelectGroup {
  label: string;
  options: WrSelectOption[];
  disabled?: boolean;
}
