/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Options of a string {@link wrQueryParam}: no `parse` or `serialize`, the
 * parameter is read and written as it stands.
 */
interface WrQueryParamStringOptions {
  /**
   * What an absent parameter reads as, and the value that removes it from the
   * address.
   * @default ''
   */
  readonly default?: string;
  /**
   * Replace the current history entry instead of pushing one, so Back skips
   * the write. One navigation carries every write of a task: it replaces only
   * when every write asked to, since an entry replaced by mistake is lost and
   * an entry pushed by mistake is one more Back.
   * @default false
   */
  readonly replaceUrl?: boolean;
}

/**
 * Options of a typed {@link wrQueryParam}. Any `T` but `string` needs all
 * three of `default`, `parse` and `serialize`: the address holds strings, and
 * the signal holds `T`.
 */
interface WrQueryParamOptions<T> extends Omit<WrQueryParamStringOptions, 'default'> {
  /**
   * What an absent parameter reads as, and the value that removes it from the
   * address: a write equal to it by `Object.is`, or serializing to the same
   * string, navigates to an address without the parameter.
   */
  readonly default: T;
  /**
   * From the address to the value. The string is user input: anything the
   * address bar accepts reaches it. A throw reads as `default`; a value the
   * function cannot read is its call, and returning `default` is the usual
   * answer.
   */
  readonly parse: (raw: string) => T;
  /**
   * From the value to the address. Called once for `default` when the signal
   * is created, so a value that serializes like the default is left out too.
   */
  readonly serialize: (value: T) => string;
}

export type { WrQueryParamOptions, WrQueryParamStringOptions };
