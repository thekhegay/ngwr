/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrResizableEdge } from 'ngwr/resizable';

/** Narrows which `[wrResizable]` element a harness query matches. */
export interface WrResizableHarnessFilters extends BaseHarnessFilters {
  /** Match the handle's accessible name: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match the edge that drags. */
  readonly edge?: WrResizableEdge;
  /** Match only enabled (`false`) or only disabled (`true`) elements. */
  readonly disabled?: boolean;
  /** Match only collapsed (`true`) or only shown (`false`) elements. */
  readonly collapsed?: boolean;
}
