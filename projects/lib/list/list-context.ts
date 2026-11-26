/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

import type { WrListSelection } from './types';

/** What a row reads from the `<wr-list>` it sits in. Not exported from the entry point. */
export interface WrListContext {
  readonly selection: Signal<WrListSelection | null>;
  readonly disabled: Signal<boolean>;
  isSelected(value: unknown): boolean;
  isTabStop(item: object): boolean;
  activate(item: object): void;
  pick(item: object): void;
}

export const WR_LIST = new InjectionToken<WrListContext>('WR_LIST');
