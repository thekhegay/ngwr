/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Template context of `<ng-template wrLoadStateContent>`. */
export interface WrLoadStateContentContext<T = unknown> {
  /** The resource's value: `let-value`. `undefined` when the wrapper is driven by `status`. */
  readonly $implicit: T;
  /** A reload is in flight behind the content, which stays on screen. */
  readonly reloading: boolean;
}

/** Template context of `<ng-template wrLoadStateError>`. */
export interface WrLoadStateErrorContext<E = unknown> {
  /** `resource.error()`: `let-error`. `undefined` when the wrapper is driven by `status`. */
  readonly $implicit: E;
  /** Reloads the resource and emits `retry`. Does nothing while a retry is in flight. */
  readonly retry: () => void;
  /** A retry is in flight, so the template can disable its button. */
  readonly retrying: boolean;
}
