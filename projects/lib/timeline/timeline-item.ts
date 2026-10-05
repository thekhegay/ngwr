/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrTimelineColor } from './types';

/**
 * One event in a {@link WrTimeline}. Project content for the
 * description; `title` and `time` are header inputs.
 */
@Component({
  selector: 'wr-timeline-item',
  templateUrl: './timeline-item.html',
  encapsulation: ViewEncapsulation.None,
  // See `WrAlert`: a static `title=` feeds the input AND lands on the host,
  // where the browser draws it as a tooltip over the whole component.
  host: { '[class]': 'classes()', '[attr.title]': 'null' },
})
export class WrTimelineItem {
  readonly title = input<string>('');
  readonly time = input<string>('');
  readonly color = input<WrTimelineColor>('primary');

  protected readonly classes = computed(() => `wr-timeline-item wr-timeline-item--${this.color()}`);
}

export type { WrTimelineColor } from './types';
