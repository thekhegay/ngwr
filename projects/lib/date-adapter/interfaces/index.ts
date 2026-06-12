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
   * BCP 47 locale tag (`'en-US'`, `'ru-RU'`, …). Default: `navigator.language`
   * in the browser, `'en-US'` on the server.
   */
  readonly locale?: string;
}

export type { WrDateFormat } from './wr-date-format';
export type { WrDateAdapterOptions };
