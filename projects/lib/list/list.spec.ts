import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrList } from './list';
import { WrListItem } from './list-item';

@Component({
  imports: [WrList, WrListItem],
  template: `
    <wr-list [ariaLabel]="ariaLabel()">
      <wr-list-item>Plain row</wr-list-item>
      <wr-list-item interactive [disabled]="disabled()" (click)="picks.set(picks() + 1)">Interactive row</wr-list-item>
    </wr-list>
  `,
})
class Host {
  readonly ariaLabel = signal('Recent files');
  readonly disabled = signal(false);
  readonly picks = signal(0);
}

/**
 * The list is a `list` / `listitem` structure, and `interactive` layers a click
 * target onto a row without changing that. What has to hold is that the row is
 * reachable AND operable: focusable, activated by Enter and Space, and silent
 * when disabled. A row that takes a tab stop it cannot act on is worse than one
 * that takes none.
 */
describe('WrList', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-list-item')];
  const plain = (): HTMLElement => items()[0];
  const interactive = (): HTMLElement => items()[1];
  const picks = (): number => fixture.componentInstance.picks();

  const press = (el: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a named list of list items', () => {
    const ul = root().querySelector('ul')!;
    expect(ul.getAttribute('role')).toBe('list');
    expect(items().every(i => i.getAttribute('role') === 'listitem')).toBe(true);
    expect(root().querySelector('wr-list')!.getAttribute('aria-label')).toBe('Recent files');
  });

  it('gives a tab stop only to the interactive row', () => {
    // A plain row is content. A tab stop on it is a stop that does nothing.
    expect(plain().getAttribute('tabindex')).toBeNull();
    expect(interactive().getAttribute('tabindex')).toBe('0');
  });

  it('activates on Enter and on Space', () => {
    press(interactive(), 'Enter');
    expect(picks()).toBe(1);

    press(interactive(), ' ');
    expect(picks()).toBe(2);
  });

  it('swallows Space so the page does not scroll under the user', () => {
    expect(press(interactive(), ' ').defaultPrevented).toBe(true);
  });

  it('does not activate a plain row', () => {
    press(plain(), 'Enter');
    expect(picks()).toBe(0);
  });

  it('goes quiet and says so while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(interactive().getAttribute('aria-disabled')).toBe('true');

    press(interactive(), 'Enter');
    expect(picks()).toBe(0);
  });

  it('carries the public BEM classes, including the interactive modifier', () => {
    expect(plain().className).toContain('wr-list__item');
    expect(plain().className).not.toContain('wr-list__item--interactive');
    expect(interactive().className).toContain('wr-list__item--interactive');
  });
});
