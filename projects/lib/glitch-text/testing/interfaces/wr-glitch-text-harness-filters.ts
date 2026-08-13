/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-glitch-text>` a harness query matches. */
export interface WrGlitchTextHarnessFilters extends BaseHarnessFilters {
  /** Match the rendered text — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /**
   * Match only the hover-gated variant (`true`) or only the always-on one (`false`).
   * Note that hover-gated is the DEFAULT, so `{ hoverOnly: false }` selects the
   * component that was explicitly told `[enableOnHover]="false"`.
   */
  readonly hoverOnly?: boolean;
}

/** How long each clone layer takes to complete one tear cycle, in seconds. */
export interface WrGlitchTextDurations {
  /** The `::before` clone — `speed × 2`. */
  readonly before: number;
  /** The `::after` clone — `speed × 3`. */
  readonly after: number;
}

/** The two clone `text-shadow`s, exactly as the component wrote them. */
export interface WrGlitchTextColourSplit {
  /** The `::before` clone's shadow — offset right, and tinted `info`. */
  readonly before: string;
  /** The `::after` clone's shadow — offset left, and tinted `danger`. */
  readonly after: string;
}
