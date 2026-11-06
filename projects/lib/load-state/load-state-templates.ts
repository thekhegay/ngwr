/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, type Resource, TemplateRef, inject, input } from '@angular/core';

import type { SafeAny } from 'ngwr/utils';

import type { WrLoadStateContentContext, WrLoadStateErrorContext } from './types';

/**
 * The content `<wr-load-state>` draws once the data is ready. A template rather
 * than projected content, so nothing of it is created before that: a plain
 * `<ng-content>` would be instantiated in every state.
 *
 * Name the resource through `[wrLoadStateContentOf]` and `let-value` arrives
 * typed. The input is read by the type checker only, the way `[wrTableCellOf]`
 * types a table cell: the wrapper hands the template the same context whether
 * or not it is set.
 *
 * @example
 * ```html
 * <wr-load-state [resource]="users">
 *   <ng-template wrLoadStateContent [wrLoadStateContentOf]="users" let-users>
 *     <wr-table [items]="users" [columns]="columns" />
 *   </ng-template>
 * </wr-load-state>
 * ```
 */
@Directive({
  selector: 'ng-template[wrLoadStateContent]',
})
export class WrLoadStateContent<T = SafeAny> {
  /**
   * The resource the template draws, for the type checker: nothing reads it at
   * runtime. Bind the same resource as the wrapper's `[resource]`.
   */
  readonly wrLoadStateContentOf = input<Resource<T | undefined> | null | undefined>(undefined);

  readonly template = inject<TemplateRef<WrLoadStateContentContext<T>>>(TemplateRef);

  /**
   * Types the template's `let-` variables under `strictTemplates`. `T` defaults
   * to `SafeAny` for the reason `WrOptionLeading` gives: without
   * `[wrLoadStateContentOf]` nothing infers the value, and narrowed to
   * `unknown` every `value.length` would stop compiling.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read
  static ngTemplateContextGuard<T>(_dir: WrLoadStateContent<T>, _ctx: unknown): _ctx is WrLoadStateContentContext<T> {
    return true;
  }
}

/**
 * Replaces the default skeleton while `<wr-load-state>` loads for the first time.
 *
 * @example
 * ```html
 * <ng-template wrLoadStateLoading><wr-spinner /></ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[wrLoadStateLoading]',
})
export class WrLoadStateLoading {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * Replaces the default failure of `<wr-load-state>`. The context carries the
 * error, `retry()` and `retrying`; the error's message is the app's to show.
 *
 * @example
 * ```html
 * <ng-template wrLoadStateError let-error let-retry="retry" let-retrying="retrying">
 *   <wr-alert type="danger" title="Could not load" [message]="error.message">
 *     <wr-btn wrAlertActions size="sm" [loading]="retrying" (click)="retry()">Try again</wr-btn>
 *   </wr-alert>
 * </ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[wrLoadStateError]',
})
export class WrLoadStateError<E = SafeAny> {
  readonly template = inject<TemplateRef<WrLoadStateErrorContext<E>>>(TemplateRef);

  /**
   * Types the template's `let-` variables under `strictTemplates`. `E` defaults
   * to `SafeAny` for the reason `WrOptionLeading` gives: nothing infers the error
   * type, and narrowed to `unknown`, `error.message` would not compile.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read
  static ngTemplateContextGuard<E>(_dir: WrLoadStateError<E>, _ctx: unknown): _ctx is WrLoadStateErrorContext<E> {
    return true;
  }
}

/**
 * Replaces the default `<wr-empty>` of `<wr-load-state>`.
 *
 * @example
 * ```html
 * <ng-template wrLoadStateEmpty>
 *   <wr-empty title="No orders yet"><wr-btn wrEmptyActions (click)="create()">Create one</wr-btn></wr-empty>
 * </ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[wrLoadStateEmpty]',
})
export class WrLoadStateEmpty {
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}
