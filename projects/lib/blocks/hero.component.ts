/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Marketing hero block. Title + subtitle inputs, three slots:
 * `[wrHeroBadge]` (small label above title), `[wrHeroActions]` (button row),
 * `[wrHeroMedia]` (right-side image / illustration / video).
 *
 * @example
 * ```html
 * <wr-block-hero title="Build faster" subtitle="Angular UI components.">
 *   <span wrHeroBadge>v2.0 released</span>
 *   <div wrHeroActions>
 *     <button>Get started</button>
 *     <button>Read docs</button>
 *   </div>
 *   <img wrHeroMedia src="hero.png" alt="" />
 * </wr-block-hero>
 * ```
 *
 * @see https://ngwr.dev/docs/components/blocks
 */
@Component({
  selector: 'wr-block-hero',
  templateUrl: './hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-block-hero' },
})
export class WrBlockHeroComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
}
