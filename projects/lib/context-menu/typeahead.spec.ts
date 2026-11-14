import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrContextMenu } from './context-menu';
import { WrContextMenuItem } from './context-menu-item';
import { WrContextMenuPanel } from './context-menu-panel';

@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem],
  template: `
    <div class="target" [wrContextMenu]="menu">Right-click me</div>

    <wr-context-menu #menu>
      <wr-context-menu-item (click)="picked.set('cut')">Cut</wr-context-menu-item>
      <wr-context-menu-item (click)="picked.set('copy')">Copy</wr-context-menu-item>
      <wr-context-menu-item disabled>Copy link</wr-context-menu-item>
      <wr-context-menu-item (click)="picked.set('copy as')">Copy as text</wr-context-menu-item>
      <wr-context-menu-item (click)="picked.set('paste')">Paste</wr-context-menu-item>
      <wr-context-menu-item [submenu]="more">More</wr-context-menu-item>
    </wr-context-menu>

    <wr-context-menu #more>
      <wr-context-menu-item>Print</wr-context-menu-item>
      <wr-context-menu-item>Move</wr-context-menu-item>
      <wr-context-menu-item>Properties</wr-context-menu-item>
    </wr-context-menu>
  `,
})
class Host {
  readonly picked = signal<string | null>(null);
}

/** Type-to-jump in a context menu: the cursor is real focus on a `menuitem`. */
describe('WrContextMenu typeahead', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const target = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.target')!;
  const itemFor = (label: string): HTMLElement =>
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(i => i.textContent.trim() === label)!;
  const focused = (): string => (document.activeElement?.textContent ?? '').trim();
  const picked = (): string | null => fixture.componentInstance.picked();

  const rightClick = (): void => {
    target().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  /** Type on whatever holds focus, as a keyboard does. */
  const type = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    document.activeElement!.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('moves focus to the next item that starts with the letter', () => {
    rightClick();
    expect(focused()).toBe('Cut');

    const event = type('p');
    expect(event.defaultPrevented).toBe(true);
    expect(focused()).toBe('Paste');
  });

  it('cycles through one letter, past a disabled item, and wraps', () => {
    rightClick();
    type('c');
    expect(focused()).toBe('Copy');
    type('c');
    expect(focused()).toBe('Copy as text');
    type('c');
    expect(focused()).toBe('Cut');
  });

  it('starts a new run after a pause', () => {
    rightClick();
    type('c');
    vi.advanceTimersByTime(600);
    type('m');
    expect(focused()).toBe('More');
  });

  it('leaves a chord and a letter nothing starts with alone', () => {
    rightClick();
    expect(type('p', { metaKey: true }).defaultPrevented).toBe(false);
    expect(focused()).toBe('Cut');
    type('z');
    expect(focused()).toBe('Cut');
  });

  it('Space joins a run that has started, and activates the item otherwise', async () => {
    rightClick();
    for (const letter of 'copy') type(letter);
    expect(focused()).toBe('Copy');
    expect(type(' ').defaultPrevented).toBe(true);
    type('a');
    expect(focused()).toBe('Copy as text');
    expect(picked()).toBeNull();

    vi.advanceTimersByTime(600);
    type(' ');
    await settle();
    expect(picked()).toBe('copy as');
  });

  it('Enter still activates the item', async () => {
    rightClick();
    type('p');
    type('Enter');
    await settle();
    expect(picked()).toBe('paste');
  });

  it('searches the submenu the keyboard is in, not the menu under it', async () => {
    rightClick();
    itemFor('More').focus();
    type('ArrowRight');
    await settle();
    expect(focused()).toBe('Print');

    // The root has "Paste" and "More" too: the run stays in this pane.
    type('p');
    expect(focused()).toBe('Properties');
    vi.advanceTimersByTime(600);
    type('m');
    expect(focused()).toBe('Move');
    vi.advanceTimersByTime(600);
    type('c');
    expect(focused()).toBe('Move');
  });
});
