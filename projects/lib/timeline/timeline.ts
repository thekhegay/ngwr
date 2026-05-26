/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Event-list ladder. Project `<wr-timeline-item>` children.
 *
 * @example
 * ```html
 * <wr-timeline>
 *   <wr-timeline-item title="Created" time="2026-05-01">Initial commit.</wr-timeline-item>
 *   <wr-timeline-item title="Deployed" time="2026-05-02" color="success">Live.</wr-timeline-item>
 * </wr-timeline>
 * ```
 *
 * @see https://ngwr.dev/docs/components/timeline
 */
@Component({
  selector: 'wr-timeline',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrTimeline {
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  protected readonly classes = computed(() => `wr-timeline wr-timeline--${this.orientation()}`);
}
