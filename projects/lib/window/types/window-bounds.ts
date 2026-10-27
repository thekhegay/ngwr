/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ElementRef } from '@angular/core';

/**
 * Space to keep clear at each edge of the viewport, in CSS pixels — an app
 * header, a side rail, a status strip. Physical edges, like every window
 * coordinate: `x` and `left` are screen positions, not reading-order ones.
 */
export interface WrWindowInsets {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

/**
 * The work area: the rectangle that maximize, snapping, `keepInViewport` and
 * the opening cascade all keep a window inside.
 *
 * - `'viewport'` (the default) — the whole viewport.
 * - an inset object — the viewport minus that much at each edge.
 * - an element (or an `ElementRef`) — that element's box, for a desktop that
 *   lives inside a panel. It is measured again when it resizes, when the
 *   viewport resizes and when the page scrolls.
 *
 * A `<wr-window-taskbar>` on the page reserves its own strip on top of any of
 * these while it shows tabs, so a maximized window stops short of it.
 */
export type WrWindowBounds = 'viewport' | WrWindowInsets | HTMLElement | ElementRef<HTMLElement>;
