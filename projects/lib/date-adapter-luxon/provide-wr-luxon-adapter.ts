/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { EnvironmentProviders } from '@angular/core';

import { provideWrDateAdapter } from 'ngwr/date-adapter';

import { WrLuxonAdapter } from './wr-luxon-adapter';

/**
 * Register the {@link WrLuxonAdapter} so date-pickers / calendars in this
 * app use Luxon `DateTime` for all math and formatting. Pass `locale` to
 * override the BCP 47 tag.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrLuxonAdapter()],
 * });
 * ```
 */
export function provideWrLuxonAdapter(options: { readonly locale?: string } = {}): EnvironmentProviders {
  return provideWrDateAdapter({ adapter: WrLuxonAdapter, locale: options.locale });
}
