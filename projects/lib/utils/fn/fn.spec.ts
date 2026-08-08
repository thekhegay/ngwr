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
});
