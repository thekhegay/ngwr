/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastConfig } from './interfaces';

/**
 * Library defaults applied when no {@link provideWrToastConfig} call is
 * registered. Merged shallowly with the consumer's overrides (the `labels`
 * sub-object is merged separately so callers can override one string at a
 * time).
 */
export const DEFAULT_TOAST_CONFIG: WrToastConfig = {
  position: 'top-end',
  mode: 'stack',
  duration: 4000,
  showProgress: true,
  showCopy: false,
  showCloseAll: true,
  closeAllThreshold: 2,
  maxStack: 5,
  // Null, not English: the host resolves each one through the i18n catalog and
  // falls back to English only if nothing is registered. See `WrToastConfig`.
  labels: {
    close: null,
    copy: null,
    copied: null,
    closeAll: null,
  },
};
