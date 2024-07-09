/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

export const WR_DIALOG_DATA = new InjectionToken<SafeAny>('WR_DIALOG_DATA');
