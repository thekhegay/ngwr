/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import { WrResult } from './result';

/**
 * Pre-set 404 result. Override `title` / `description` for localisation.
 *
 * @example
 * ```html
 * <wr-result-404>
 *   <button wr-btn wrResultExtra>Back home</button>
 * </wr-result-404>
 * ```
 */
@Component({
  selector: 'wr-result-404',
  template: `<wr-result status="warning" [title]="title()" [description]="desc()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult404 {
  readonly title = input<string>('404');

  /** Body text. Falls back to `result.notFound` from WrI18n. */
  readonly description = input<string | null>(null);

  protected readonly desc = useI18nText(
    this.description,
    'result.notFound',
    'Sorry, the page you visited does not exist.'
  );
}

/** Pre-set 403 result — forbidden / no access. */
@Component({
  selector: 'wr-result-403',
  template: `<wr-result status="error" [title]="title()" [description]="desc()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult403 {
  readonly title = input<string>('403');

  /** Body text. Falls back to `result.forbidden` from WrI18n. */
  readonly description = input<string | null>(null);

  protected readonly desc = useI18nText(
    this.description,
    'result.forbidden',
    'Sorry, you are not authorized to access this page.'
  );
}

/** Pre-set 500 result — internal server error. */
@Component({
  selector: 'wr-result-500',
  template: `<wr-result status="error" [title]="title()" [description]="desc()"><ng-content /></wr-result>`,
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult500 {
  readonly title = input<string>('500');

  /** Body text. Falls back to `result.serverError` from WrI18n. */
  readonly description = input<string | null>(null);

  protected readonly desc = useI18nText(this.description, 'result.serverError', 'Sorry, something went wrong.');
}
