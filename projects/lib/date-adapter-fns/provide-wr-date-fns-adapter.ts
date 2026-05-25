/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { EnvironmentProviders } from '@angular/core';

import { provideWrDateAdapter } from 'ngwr/date-adapter';

import { WrDateFnsAdapter } from './wr-date-fns-adapter';

/**
 * Register the {@link WrDateFnsAdapter} so date-pickers / calendars in this
 * app use `date-fns` for all math and formatting. Pass `locale` to override
 * the BCP 47 tag.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrDateFnsAdapter()],
 * });
 * ```
 */
export function provideWrDateFnsAdapter(options: { readonly locale?: string } = {}): EnvironmentProviders {
  return provideWrDateAdapter({ adapter: WrDateFnsAdapter, locale: options.locale });
}
