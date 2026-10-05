/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrDrawerPosition } from 'ngwr/drawer';

/** Narrows which open drawer a harness query matches. */
export interface WrDrawerHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the `[wrDrawerTitle]` text — a string is an exact match, a RegExp is
   * tested. A drawer with no title never matches.
   */
  readonly title?: string | RegExp;
  /**
   * Match the `[wrDrawerContent]` text. A drawer whose content is not wrapped in
   * that directive never matches.
   */
  readonly content?: string | RegExp;
  /** Match the edge the drawer slid in from: `left`, `right`, `top` or `bottom`. */
  readonly position?: WrDrawerPosition;
}
