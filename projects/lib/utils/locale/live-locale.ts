/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * The interface language as a signal, for what has to follow a language switch
 * without importing `ngwr/i18n`: `provideWrI18n()` provides it as
 * `WrI18n.locale`, and `ngwr/date` formats in it. Not provided when the app
 * does not call `provideWrI18n()`, so inject it as optional.
 */
export const WR_LIVE_LOCALE = new InjectionToken<Signal<string>>('WR_LIVE_LOCALE');
