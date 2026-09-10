import type { Type } from '@angular/core';

import type { WrDateAdapter } from '../wr-date-adapter';

/**
 * Options for {@link provideWrDateAdapter}.
 */
interface WrDateAdapterOptions {
  /**
   * Adapter class. Default: {@link WrNativeDateAdapter}.
   *
   * Pass a custom subclass to swap implementations (`WrDateFnsAdapter`,
   * `WrLuxonAdapter`, …).
   */
  readonly adapter?: Type<WrDateAdapter<unknown>>;

  /**
   * BCP 47 locale tag (`'en-US'`, `'ru-RU'`, …).
   *
   * Default: Angular's own `LOCALE_ID`, which is what {@link WR_DATE_LOCALE}
   * resolves to. This line used to say `navigator.language` in the browser and
   * `'en-US'` on the server, which was true before v14 and has been wrong since
   * — v14 made `LOCALE_ID` the single locale source precisely so an app that
   * sets it correctly stops formatting dates in whatever language the visitor's
   * browser happens to be.
   */
  readonly locale?: string;
}

export type { WrDateFormat } from './wr-date-format';
export type { WrDateAdapterOptions };
