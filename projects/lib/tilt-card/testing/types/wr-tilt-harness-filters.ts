/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which tilted element a harness query matches. */
export interface WrTiltHarnessFilters extends BaseHarnessFilters {
  /** Match only the ones carrying a glare overlay (`true`) or only the ones without. */
  readonly glare?: boolean;
  /** Match only elements at rest (`true`) or only ones holding a tilt (`false`). */
  readonly flat?: boolean;
}

/** The two rotations a tilt writes, in degrees. */
export interface WrTiltRotation {
  /** Positive tips the top of the card toward the viewer. */
  readonly rotateX: number;
  /** Positive tips the right edge away. */
  readonly rotateY: number;
}
