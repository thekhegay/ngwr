/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A debounced function — same signature as the original plus `cancel`. */
export type WrDebouncedFn<TArgs extends readonly unknown[]> = ((...args: TArgs) => void) & {
  readonly cancel: () => void;
};

/**
 * Wrap `fn` so it only fires `waitMs` after the last invocation.
 * Useful for resize / scroll / input handlers.
 *
 * @example
 * ```ts
 * const onResize = debounce(() => recalcLayout(), 150);
 * window.addEventListener('resize', onResize);
 * ```
 */
export function debounce<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number
): WrDebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
