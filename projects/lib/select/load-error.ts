/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { SafeAny } from 'ngwr/utils';

import type { WrSelectLoadErrorContext } from './types';

/**
 * Replaces what a failed `[loader]` shows in the panel: the message, the retry
 * button, a loader while the retry runs, any text of the app's own. Declare it as
 * a DIRECT child of `<wr-select>`. The context carries the error, the query that
 * failed, `canRetry`, `retry()` and `retrying`.
 *
 * **It draws inside the error row, and that row is an option of the listbox**,
 * since the panel element is the listbox and may own nothing else. So the
 * template holds nothing focusable: a `<button>` inside an option is nested
 * interactive content. Draw a retry the way the default does, a `<span>` with
 * the `.wr-btn` classes and `(click)="retry()"`, inside `@if (canRetry)`. The
 * select's `retryable` decides `canRetry`, and lets Enter in the field reach it.
 *
 * @example
 * ```html
 * <wr-select mode="search" retryable [loader]="search">
 *   <ng-template wrSelectLoadError let-error let-canRetry="canRetry" let-retry="retry" let-retrying="retrying">
 *     <p>Search is offline: {{ error.message }}</p>
 *     @if (canRetry) {
 *       <span class="wr-btn wr-btn--sm" (click)="retry()">{{ retrying ? 'Retrying…' : 'Retry' }}</span>
 *     }
 *   </ng-template>
 * </wr-select>
 * ```
 */
@Directive({
  selector: 'ng-template[wrSelectLoadError]',
})
export class WrSelectLoadError<E = SafeAny> {
  readonly template = inject<TemplateRef<WrSelectLoadErrorContext<E>>>(TemplateRef);

  /**
   * Types the template's `let-` variables under `strictTemplates`. `E` defaults
   * to `SafeAny` for the reason `WrOptionLeading` gives: nothing infers the error
   * type, and narrowed to `unknown`, `error.message` would not compile.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read
  static ngTemplateContextGuard<E>(_dir: WrSelectLoadError<E>, _ctx: unknown): _ctx is WrSelectLoadErrorContext<E> {
    return true;
  }
}
