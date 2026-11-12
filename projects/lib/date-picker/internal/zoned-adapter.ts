/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injector } from '@angular/core';

import { WrDateAdapter } from 'ngwr/date';

/**
 * The adapter a picker works on. A mode with a time holds an instant, shown and
 * read on the wall clock of `withDates({ timeZone })`; a date-only mode holds a
 * calendar day, which has no zone.
 *
 * @internal
 */
export function wrPickerAdapter(adapter: WrDateAdapter<Date>, withTime: boolean): WrDateAdapter<Date> {
  return withTime ? adapter.zoned() : adapter;
}

/**
 * An injector that hands the picker's adapter to the panel it opens, so the
 * field and the panel read one value as one wall clock.
 *
 * @internal
 */
export function wrPickerPanelInjector(parent: Injector, adapter: WrDateAdapter<Date>): Injector {
  return Injector.create({ parent, providers: [{ provide: WrDateAdapter, useValue: adapter }] });
}
