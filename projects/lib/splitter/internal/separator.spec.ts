import { describe, expect, it } from 'vitest';

import { wrBeginSeparatorDrag, wrEndSeparatorDrag, wrSeparatorKeyMove } from './separator';

const key = (name: string): KeyboardEvent => new KeyboardEvent('keydown', { key: name });

describe('wrSeparatorKeyMove', () => {
  it('reads the arrows of its own axis and leaves the other pair alone', () => {
    expect(wrSeparatorKeyMove(key('ArrowRight'), 'inline', false)).toBe(1);
    expect(wrSeparatorKeyMove(key('ArrowLeft'), 'inline', false)).toBe(-1);
    expect(wrSeparatorKeyMove(key('ArrowDown'), 'inline', false)).toBeNull();
    expect(wrSeparatorKeyMove(key('ArrowDown'), 'block', false)).toBe(1);
    expect(wrSeparatorKeyMove(key('ArrowUp'), 'block', false)).toBe(-1);
    expect(wrSeparatorKeyMove(key('ArrowRight'), 'block', false)).toBeNull();
  });

  it('mirrors the inline arrows under RTL and never the block ones', () => {
    expect(wrSeparatorKeyMove(key('ArrowRight'), 'inline', true)).toBe(-1);
    expect(wrSeparatorKeyMove(key('ArrowLeft'), 'inline', true)).toBe(1);
    expect(wrSeparatorKeyMove(key('ArrowDown'), 'block', true)).toBe(1);
  });

  it('sends Home and End to the bounds in both directions', () => {
    for (const rtl of [false, true]) {
      expect(wrSeparatorKeyMove(key('Home'), 'inline', rtl)).toBe('min');
      expect(wrSeparatorKeyMove(key('End'), 'block', rtl)).toBe('max');
    }
  });

  it('answers null for a key that moves nothing', () => {
    expect(wrSeparatorKeyMove(key('Enter'), 'inline', false)).toBeNull();
  });
});

describe('wrBeginSeparatorDrag', () => {
  // jsdom has neither `PointerEvent` nor pointer capture: a `MouseEvent` carries
  // the properties the helper reads, and the element records the capture calls.
  interface Press {
    readonly el: HTMLElement;
    readonly event: MouseEvent;
    readonly calls: string[];
    readonly started: () => boolean;
  }

  const press = (init: { button?: number; isPrimary?: boolean } = {}): Press => {
    const el = document.createElement('div');
    el.tabIndex = 0;
    document.body.append(el);
    const calls: string[] = [];
    el.setPointerCapture = id => void calls.push(`capture:${id}`);
    el.releasePointerCapture = id => void calls.push(`release:${id}`);
    const event = new MouseEvent('pointerdown', { cancelable: true, button: init.button ?? 0 });
    Object.defineProperty(event, 'isPrimary', { value: init.isPrimary ?? true });
    Object.defineProperty(event, 'pointerId', { value: 7 });
    let started = false;
    el.addEventListener('pointerdown', e => (started = wrBeginSeparatorDrag(e)));
    el.addEventListener('pointerup', e => wrEndSeparatorDrag(e));
    el.dispatchEvent(event);
    return { el, event, calls, started: () => started };
  };

  it('captures the pointer, focuses the separator and cancels the press', () => {
    const { el, event, calls, started } = press();
    expect(started()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(calls).toEqual(['capture:7']);
    expect(document.activeElement).toBe(el);

    const up = new MouseEvent('pointerup');
    Object.defineProperty(up, 'pointerId', { value: 7 });
    el.dispatchEvent(up);
    expect(calls).toEqual(['capture:7', 'release:7']);
    el.remove();
  });

  it('refuses a secondary button and a secondary pointer', () => {
    for (const init of [{ button: 2 }, { isPrimary: false }]) {
      const { el, event, calls, started } = press(init);
      expect(started()).toBe(false);
      expect(event.defaultPrevented).toBe(false);
      expect(calls).toEqual([]);
      el.remove();
    }
  });
});
