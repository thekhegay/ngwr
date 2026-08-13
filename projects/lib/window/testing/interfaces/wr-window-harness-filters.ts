/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrWindowState } from 'ngwr/window';

/** Narrows which `<wr-window>` a harness query matches. */
export interface WrWindowHarnessFilters extends BaseHarnessFilters {
  /** Match the title-bar text — a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match windows in one visual state. */
  readonly state?: WrWindowState;
}

/** Narrows which `<wr-window-taskbar>` a harness query matches. */
export interface WrWindowTaskbarHarnessFilters extends BaseHarnessFilters {
  /** Match the edge the taskbar is pinned to. */
  readonly position?: 'top' | 'bottom';
}

/**
 * Where a window is and how big, in CSS pixels — the numbers the component writes
 * inline, not a measured box.
 */
export interface WrWindowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
