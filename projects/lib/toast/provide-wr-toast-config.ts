/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_TOAST_CONFIG } from './default-toast-config';
import { WR_TOAST_CONFIG } from './tokens';
import type { WrToastConfig } from './types';

/**
 * Registers a global {@link WrToastConfig} for {@link WrToast}. Any
 * field you omit falls back to {@link DEFAULT_TOAST_CONFIG}; the `labels`
 * sub-object is merged separately so you can override a single string at a
 * time (useful for i18n).
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrToastConfig({
 *       position: 'bottom-end',
 *       showCopy: true,
 *       maxStack: 3,
 *       labels: { close: 'Закрыть', copy: 'Копировать', copied: 'Скопировано', closeAll: 'Закрыть все' },
 *     }),
 *   ],
 * });
 * ```
 */
export function provideWrToastConfig(config: Partial<WrToastConfig>): EnvironmentProviders {
  const merged: WrToastConfig = {
    ...DEFAULT_TOAST_CONFIG,
    ...config,
    labels: { ...DEFAULT_TOAST_CONFIG.labels, ...config.labels },
  };
  return makeEnvironmentProviders([{ provide: WR_TOAST_CONFIG, useValue: merged }]);
}
