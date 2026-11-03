/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Template context of `<ng-template wrSelectLoadError>`. */
export interface WrSelectLoadErrorContext<E = unknown> {
  /** What the loader threw or rejected with: `let-error`. */
  readonly $implicit: E;
  /** The query whose load failed. */
  readonly query: string;
  /**
   * A retry is on offer: `retryable` is set and nothing else is in the panel. Draw
   * the retry control only while it is, the way the default row does.
   */
  readonly canRetry: boolean;
  /** Runs the load again for that query, while `canRetry` and no retry is in flight. */
  readonly retry: () => void;
  /** A retry is in flight, so the template can draw a loader. */
  readonly retrying: boolean;
}
