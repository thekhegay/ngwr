/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

/** Where the step popup sits relative to its target. */
export type WrTourPlacement = 'top' | 'bottom' | 'left' | 'right';

/** One stop on a tour. */
export interface WrTourStep {
  /**
   * What to spotlight — a CSS selector resolved when the step opens, or the
   * element itself. A step whose selector matches nothing is SKIPPED rather than
   * shown floating: a tour that points at a control the user cannot see is worse
   * than one that is a step shorter.
   */
  readonly target: string | HTMLElement;
  /** Heading above the copy. */
  readonly title?: string;
  /** The step's body text. */
  readonly content: string;
  /** Preferred side. The overlay falls back to the opposite side near an edge. @default 'bottom' */
  readonly placement?: WrTourPlacement;
  /**
   * Extra CSS classes for this step's overlay pane. Per STEP rather than per
   * tour, because each step disposes the previous pane and builds its own — so
   * one step can be widened for a long screenshot without touching the rest.
   */
  readonly panelClass?: WrClassInput;
}
