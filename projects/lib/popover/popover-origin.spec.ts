import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPopover } from './popover';

/**
 * One tooltip serving several elements through `wrPopoverOrigin`, the way
 * `wr-table` shares one between its header hints and truncated cells. Where the
 * panel lands is layout, which jsdom does not do: these hold which element
 * drives the tooltip and when.
 */
@Component({
  imports: [WrPopover],
  template: `
    <button type="button" class="a">A</button>
    <button type="button" class="b">B</button>
    <span hidden class="host" [wrPopover]="text()" [mode]="mode()" [wrPopoverOrigin]="origin()"></span>
  `,
})
class Host {
  readonly text = signal('About A');
  readonly mode = signal<'tooltip' | 'popover'>('tooltip');
  readonly origin = signal<HTMLElement | null>(null);
}

describe('WrPopover with wrPopoverOrigin', () => {
  let fixture: ComponentFixture<Host>;

  const el = (cls: 'a' | 'b' | 'host'): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`.${cls}`)!;
  const panes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-tooltip-overlay')];
  const text = (): string | null => panes()[0]?.textContent?.trim() ?? null;

  function settle(ms = 200): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  function point(cls: 'a' | 'b', about: string): void {
    fixture.componentInstance.text.set(about);
    fixture.componentInstance.origin.set(el(cls));
    settle();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('shows nothing while no element is named', () => {
    settle();

    expect(panes()).toEqual([]);
  });

  it('shows the tooltip once an element is named, after the show delay', () => {
    fixture.componentInstance.origin.set(el('a'));
    settle(50);
    expect(panes()).toEqual([]);

    settle(100);
    expect(text()).toBe('About A');
    expect(panes()[0].getAttribute('role')).toBe('tooltip');
  });

  it('hides when the pointer leaves the element, and shows again when it returns', () => {
    point('a', 'About A');
    el('a').dispatchEvent(new MouseEvent('mouseleave'));
    settle();
    expect(panes()).toEqual([]);

    el('a').dispatchEvent(new MouseEvent('mouseenter'));
    settle();
    expect(text()).toBe('About A');
  });

  it('stays open while the pointer crosses onto the tooltip', () => {
    point('a', 'About A');
    el('a').dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: panes()[0] }));
    settle();

    expect(panes()).toHaveLength(1);
  });

  it('hides when focus leaves the element', () => {
    point('a', 'About A');
    el('a').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    settle();

    expect(panes()).toEqual([]);
  });

  it('follows to another element with the same pane and the new text', () => {
    point('a', 'About A');
    const pane = panes()[0];
    point('b', 'About B');

    expect(panes()).toEqual([pane]);
    expect(text()).toBe('About B');

    // The first element no longer drives it.
    el('a').dispatchEvent(new MouseEvent('mouseleave'));
    settle();
    expect(panes()).toHaveLength(1);
  });

  it('hides when the element is unset', () => {
    point('a', 'About A');
    fixture.componentInstance.origin.set(null);
    settle();

    expect(panes()).toEqual([]);
  });

  it('keeps the tooltip through a click on the element', () => {
    point('a', 'About A');
    el('a').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el('a').dispatchEvent(new MouseEvent('auxclick', { bubbles: true }));
    settle();

    expect(panes()).toHaveLength(1);
  });

  it('shows nothing for an empty text', () => {
    point('a', '');

    expect(panes()).toEqual([]);
  });

  it('is a tooltip matter only: a popover ignores it', () => {
    fixture.componentInstance.mode.set('popover');
    fixture.componentInstance.origin.set(el('a'));
    settle();

    expect(document.querySelector('.wr-popover-overlay, .wr-tooltip-overlay')).toBeNull();
  });

  it('leaves nothing behind when destroyed with a tooltip open', () => {
    point('a', 'About A');
    fixture.destroy();
    vi.advanceTimersByTime(200);

    expect(panes()).toEqual([]);
  });
});
