/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

/** Built-in dot colours. */
export type WrTimelineColor = 'primary' | 'success' | 'warning' | 'danger' | 'medium';

/**
 * One event in a {@link WrTimelineComponent}. Project content for the
 * description; `title` and `time` are header inputs.
 */
@Component({
  selector: 'wr-timeline-item',
  templateUrl: './timeline-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrTimelineItemComponent {
  readonly title = input<string>('');
  readonly time = input<string>('');
  readonly color = input<WrTimelineColor>('primary');

  protected readonly classes = computed(() => `wr-timeline-item wr-timeline-item--${this.color()}`);
}
