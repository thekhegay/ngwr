import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDropdown } from './dropdown';
import { WrDropdownItem } from './dropdown-item';
import { WrDropdownMenu } from './dropdown-menu';
import { WrDropdownSubmenu } from './dropdown-submenu';

@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem, WrDropdownSubmenu],
  template: `
    <button type="button" [wrDropdown]="file">File</button>

    <wr-dropdown-menu #file>
      <wr-dropdown-item (click)="picked.push('new')">New</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('open')">Open</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('save')">Save</wr-dropdown-item>
      <wr-dropdown-item disabled>Save a copy</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('save all')">Save all</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('save as')">Save as</wr-dropdown-item>
      <wr-dropdown-item [wrDropdownSubmenu]="exportAs">Export</wr-dropdown-item>
      <input class="rename" aria-label="Rename" />
    </wr-dropdown-menu>

    <wr-dropdown-menu #exportAs>
      <wr-dropdown-item>CSV</wr-dropdown-item>
      <wr-dropdown-item>PDF</wr-dropdown-item>
      <wr-dropdown-item>Spreadsheet</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class Host {
  readonly picked: string[] = [];
}

/** Type-to-jump in a dropdown: the cursor is real focus on a `menuitem`. */
describe('WrDropdown typeahead', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const item = (label: string): HTMLElement =>
    [...document.querySelectorAll<HTMLElement>('.wr-dropdown-overlay .wr-dropdown-item')].find(
      el => el.textContent.trim() === label
    )!;
  const key = (el: EventTarget, name: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  /** Type on whatever holds focus, as a keyboard does. */
  const type = (name: string, init: KeyboardEventInit = {}): KeyboardEvent => key(document.activeElement!, name, init);
  const focused = (): string => document.activeElement?.textContent.trim() ?? '';

  const openRoot = async (): Promise<void> => {
    key(trigger(), 'ArrowDown');
    await Promise.resolve();
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

  it('moves focus to the next item that starts with the letter', async () => {
    await openRoot();
    expect(focused()).toBe('New');

    const event = type('o');
    expect(event.defaultPrevented).toBe(true);
    expect(focused()).toBe('Open');
  });

  it('cycles through one letter, past a disabled item, and wraps', async () => {
    await openRoot();
    type('s');
    expect(focused()).toBe('Save');
    type('s');
    expect(focused()).toBe('Save all');
    type('s');
    expect(focused()).toBe('Save as');
    type('s');
    expect(focused()).toBe('Save');
  });

  it('starts a new run after a pause', async () => {
    await openRoot();
    type('s');
    vi.advanceTimersByTime(600);
    type('e');
    expect(focused()).toBe('Export');
  });

  it('leaves a chord and a letter nothing starts with alone', async () => {
    await openRoot();
    expect(type('o', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(focused()).toBe('New');
    type('z');
    expect(focused()).toBe('New');
  });

  it('Space joins a run that has started, and activates the item otherwise', async () => {
    await openRoot();
    for (const letter of 'save') type(letter);
    expect(focused()).toBe('Save');
    const space = type(' ');
    expect(space.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.picked).toEqual([]);
    type('a');
    type('s');
    expect(focused()).toBe('Save as');

    vi.advanceTimersByTime(600);
    type(' ');
    expect(fixture.componentInstance.picked).toEqual(['save as']);
  });

  it('Enter still activates the item', async () => {
    await openRoot();
    type('o');
    type('Enter');
    expect(fixture.componentInstance.picked).toEqual(['open']);
  });

  it('searches the submenu the keyboard is in, not the menu under it', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');
    expect(focused()).toBe('CSV');

    // The root has "Save" and "Open"; this level has "Spreadsheet" and "PDF".
    type('s');
    expect(focused()).toBe('Spreadsheet');
    vi.advanceTimersByTime(600);
    type('p');
    expect(focused()).toBe('PDF');
    vi.advanceTimersByTime(600);
    type('o');
    expect(focused()).toBe('PDF');
  });

  it('leaves a text field inside the menu to its own typing', async () => {
    await openRoot();
    const input = document.querySelector<HTMLInputElement>('.wr-dropdown-overlay .rename')!;
    input.focus();
    const event = type('o');
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });
});
