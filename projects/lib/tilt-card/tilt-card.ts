/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

import { WrTilt } from './tilt';

/**
 * Card wrapper that applies the `[wrTilt]` directive out-of-the-box,
 * plus a small set of card-style defaults (radius, padding, surface).
 * Pass any inputs through — they're forwarded to the hosted directive.
 *
 * For arbitrary elements that just need the tilt behaviour, use the
 * `[wrTilt]` directive directly:
 *
 * ```html
 * <img wrTilt [maxTilt]="10" src="…" />
 * ```
 *
 * @example
 * ```html
 * <wr-tilt-card>
 *   <h3>Hello</h3>
 *   <p>Move the cursor across me.</p>
 * </wr-tilt-card>
 *
 * <wr-tilt-card [maxTilt]="20" [glare]="true">…</wr-tilt-card>
 * ```
 */
@Component({
  selector: 'wr-tilt-card',
  template: '<ng-content />',
  styleUrl: './tilt-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  hostDirectives: [
    {
      directive: WrTilt,
      inputs: ['maxTilt', 'perspective', 'scale', 'glare'],
    },
  ],
  host: { class: 'wr-tilt-card' },
})
export class WrTiltCard {}
