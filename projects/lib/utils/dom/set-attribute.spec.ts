import { describe, expect, it, vi } from 'vitest';

import { wrSetAttribute } from './set-attribute';

describe('wrSetAttribute', () => {
  it('writes only when the value differs', () => {
    const el = document.createElement('div');
    const set = vi.spyOn(el, 'setAttribute');
    const remove = vi.spyOn(el, 'removeAttribute');

    wrSetAttribute(el, 'aria-labelledby', 'a');
    wrSetAttribute(el, 'aria-labelledby', 'a');
    expect(set).toHaveBeenCalledTimes(1);
    expect(el.getAttribute('aria-labelledby')).toBe('a');

    wrSetAttribute(el, 'aria-labelledby', null);
    wrSetAttribute(el, 'aria-labelledby', null);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(el.hasAttribute('aria-labelledby')).toBe(false);
  });
});
