import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce';
import { throttle } from './throttle';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('debounce', () => {
  it('runs once, after the quiet period, with the last arguments', () => {
    const spy = vi.fn();
    const fn = debounce(spy, 100);

    fn('a');
    fn('b');
    fn('c');
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledExactlyOnceWith('c');
  });

  it('restarts the wait on every call', () => {
    const spy = vi.fn();
    const fn = debounce(spy, 100);

    fn();
    vi.advanceTimersByTime(90);
    fn();
    vi.advanceTimersByTime(90);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('cancel drops the pending call', () => {
    const spy = vi.fn();
    const fn = debounce(spy, 100);

    fn();
    fn.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  it('runs the first call immediately', () => {
    const spy = vi.fn();
    throttle(spy, 100)('a');
    expect(spy).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('collapses calls inside the window into one trailing call', () => {
    const spy = vi.fn();
    const fn = throttle(spy, 100);

    fn('a');
    fn('b');
    fn('c');
    expect(spy).toHaveBeenCalledExactlyOnceWith('a');

    vi.advanceTimersByTime(100);
    // The trailing edge fires with the LAST arguments, not the first one it
    // swallowed — a scroll handler wants where you ended up.
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('c');
  });

  it('runs immediately again once the window has passed', () => {
    const spy = vi.fn();
    const fn = throttle(spy, 100);

    fn('a');
    vi.advanceTimersByTime(200);
    fn('b');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('b');
  });

  it('cancel drops the trailing call', () => {
    const spy = vi.fn();
    const fn = throttle(spy, 100);

    fn('a');
    fn('b');
    fn.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('drops a pending trailing call when the clock jumped past its window', () => {
    // The case a busy main thread produces: a trailing call is scheduled, the
    // thread is blocked past the deadline, and the next call arrives on the
    // leading edge with that timer still queued. Without the clear, the trailing
    // one fires immediately afterwards and the handler runs twice back to back —
    // which for a resize or scroll listener is the double work throttling exists
    // to prevent.
    //
    // The clock moves without the timer queue moving, which is exactly what
    // `setSystemTime` does and `advanceTimersByTime` does not.
    const spy = vi.fn();
    const fn = throttle(spy, 100);

    fn('a');
    fn('b');
    expect(spy).toHaveBeenCalledExactlyOnceWith('a');

    vi.setSystemTime(Date.now() + 500);
    fn('c');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('c');

    // And the swallowed trailing call stays swallowed rather than arriving late.
    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
