/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconName } from 'ngwr/icon';

/**
 * One entry in a `<wr-segmented>` track.
 *
 * `value` is what the model receives when this segment is picked.
 * `label` is shown when present; otherwise an icon-only segment renders.
 */
export interface WrSegmentedOption<T = unknown> {
  readonly value: T;
  readonly label?: string;
  readonly icon?: WrIconName;
  readonly disabled?: boolean;
}
