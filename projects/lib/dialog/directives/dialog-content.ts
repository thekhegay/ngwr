/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { CdkScrollable } from '@angular/cdk/scrolling';
import { Directive } from '@angular/core';

/**
 * Styles the scrollable body section of a dialog.
 *
 * `CdkScrollable` is a host directive because this element is a real scroll
 * container (`overflow: auto`) and an anchored overlay opened from inside it has
 * to follow its trigger. CDK's `reposition()` strategy listens to
 * `ScrollDispatcher`, which is fed by registered scrollables plus ONE
 * non-capturing `document` listener — and element `scroll` does not bubble, so
 * without the registration a `<wr-select>` halfway down a long dialog form kept
 * its panel pinned to the viewport while the trigger scrolled away. Angular
 * Material carries the same host directive on `MatDialogContent` for the same
 * reason.
 *
 * @example
 * ```html
 * <div wrDialogContent>…body…</div>
 * ```
 */
@Directive({
  selector: '[wrDialogContent]',
  host: { class: 'wr-dialog__content' },
  hostDirectives: [CdkScrollable],
})
export class WrDialogContent {}
