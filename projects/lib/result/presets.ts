/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import type { WrResultStatus } from './interfaces';
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
  templateUrl: './presets.html',
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult404 {
  /** Bound by the shared template; not an input — a preset IS its status. */
  protected readonly status: WrResultStatus = 'warning';

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
  templateUrl: './presets.html',
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult403 {
  /** Bound by the shared template; not an input — a preset IS its status. */
  protected readonly status: WrResultStatus = 'error';

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
  templateUrl: './presets.html',
  encapsulation: ViewEncapsulation.None,
  imports: [WrResult],
})
export class WrResult500 {
  /** Bound by the shared template; not an input — a preset IS its status. */
  protected readonly status: WrResultStatus = 'error';

  readonly title = input<string>('500');

  /** Body text. Falls back to `result.serverError` from WrI18n. */
  readonly description = input<string | null>(null);

  protected readonly desc = useI18nText(this.description, 'result.serverError', 'Sorry, something went wrong.');
}
