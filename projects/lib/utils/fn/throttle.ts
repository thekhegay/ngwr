/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A throttled function — same signature as the original plus `cancel`. */
export type WrThrottledFn<TArgs extends readonly unknown[]> = ((...args: TArgs) => void) & {
  readonly cancel: () => void;
};

/**
 * Wrap `fn` so it fires at most once every `waitMs`. Leading-edge call
 * fires immediately; trailing-edge call fires once at the end of the window
 * if there were further invocations.
 */
export function throttle<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number
): WrThrottledFn<TArgs> {
  let lastInvoke = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  const throttled = (...args: TArgs): void => {
    const now = Date.now();
    const remaining = waitMs - (now - lastInvoke);

    if (remaining <= 0) {
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastInvoke = now;
      fn(...args);
    } else {
      pendingArgs = args;
      trailingTimer ??= setTimeout(() => {
        lastInvoke = Date.now();
        trailingTimer = null;
        if (pendingArgs) fn(...pendingArgs);
        pendingArgs = null;
      }, remaining);
    }
  };

  throttled.cancel = (): void => {
    if (trailingTimer !== null) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
    }
    pendingArgs = null;
    lastInvoke = 0;
  };

  return throttled;
}
