/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { CdkScrollable } from '@angular/cdk/scrolling';
import { Directive, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

let uid = 0;

/**
 * Styles the scrollable body section of a dialog. Auto-assigns an `id` so an
 * `alertdialog` panel can reference it via `aria-describedby`.
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
  host: { class: 'wr-dialog__content', '[attr.id]': 'id()' },
  hostDirectives: [CdkScrollable],
})
export class WrDialogContent {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('dialog');
  }

  /** The element's id, generated unless given. An `alertdialog` names it in `aria-describedby`. */
  readonly id = input(`wr-dialog-content-${++uid}`);
}
