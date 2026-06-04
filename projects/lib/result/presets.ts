/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import { WrResult } from './result';

/**
 * Pre-set 404 result. Override `title` / `description` for localisation.
 *
 * @example
 * ```html
 * <wr-result-404>
 *   <button wrButton wrResultExtra>Back home</button>
 * </wr-result-404>
 * ```
 */
@Component({
  selector: 'wr-result-404',
  template: `<wr-result status="warning" [title]="title()" [description]="description()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult404 {
  readonly title = input<string>('404');
  readonly description = input<string>("Sorry, the page you visited doesn't exist.");
}

/** Pre-set 403 result — forbidden / no access. */
@Component({
  selector: 'wr-result-403',
  template: `<wr-result status="error" [title]="title()" [description]="description()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult403 {
  readonly title = input<string>('403');
  readonly description = input<string>("Sorry, you're not authorized to view this page.");
}

/** Pre-set 500 result — internal server error. */
@Component({
  selector: 'wr-result-500',
  template: `<wr-result status="error" [title]="title()" [description]="description()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult500 {
  readonly title = input<string>('500');
  readonly description = input<string>('Sorry, something went wrong.');
}
