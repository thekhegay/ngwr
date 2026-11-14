import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';
import type { WrSelectMode } from './types';

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Fruit" [mode]="mode()" [searchable]="searchable()" [(value)]="picked">
      <wr-option value="apple">Apple</wr-option>
      <wr-option value="banana">Banana</wr-option>
      <wr-option value="blackcurrant" [disabled]="true">Blackcurrant</wr-option>
      <wr-option value="blueberry">Blueberry</wr-option>
      <wr-option value="cherry">Cherry</wr-option>
      <wr-option value="red">Red apple</wr-option>
      <wr-option value="redc">Red currant</wr-option>
    </wr-select>
  `,
})
class Host {
  readonly mode = signal<WrSelectMode>('single');
  readonly searchable = signal(false);
  readonly picked = signal<unknown>(null);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select ariaLabel="Fruit" [options]="options" [virtualScroll]="virtual()" [(value)]="picked" />`,
})
class OptionsHost {
  readonly options = ['Apple', 'Banana', 'Blueberry', 'Cherry'];
  readonly virtual = signal(false);
  readonly picked = signal<string | null>(null);
}

/** Type-to-jump on the button trigger: the cursor is `aria-activedescendant`. */
describe('WrSelect typeahead', () => {
  let fixture: ComponentFixture<Host | OptionsHost>;

  afterEach(() => {
    fixture?.destroy();
  });

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;
  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    trigger().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  /** The text of the row the trigger names as active. */
  const active = (): string | null => {
    const id = trigger().getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
  };
  const isOpen = (): boolean => trigger().getAttribute('aria-expanded') === 'true';
  const open = async (): Promise<void> => {
    press('ArrowDown');
    await fixture.whenStable();
  };

  describe('projected options', () => {
    let host: Host;

    beforeEach(async () => {
      fixture = TestBed.createComponent(Host);
      host = fixture.componentInstance as Host;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('moves the cursor to the next option that starts with the letter', async () => {
      await open();
      expect(active()).toBe('Apple');

      const event = press('c');
      expect(event.defaultPrevented).toBe(true);
      expect(active()).toBe('Cherry');
      expect(host.picked()).toBeNull();
    });

    it('cycles through one letter, past a disabled option, and wraps', async () => {
      await open();
      press('b');
      expect(active()).toBe('Banana');
      press('b');
      expect(active()).toBe('Blueberry');
      press('b');
      expect(active()).toBe('Banana');
    });

    it('spells a run of letters', async () => {
      await open();
      press('b');
      press('l');
      expect(active()).toBe('Blueberry');
    });

    it('takes a capital typed with Shift, and leaves a chord alone', async () => {
      await open();
      press('C', { shiftKey: true });
      expect(active()).toBe('Cherry');

      const chord = press('a', { ctrlKey: true });
      expect(chord.defaultPrevented).toBe(false);
      expect(active()).toBe('Cherry');
    });

    it('leaves the cursor where it is on a letter nothing starts with', async () => {
      await open();
      press('z');
      expect(active()).toBe('Apple');
      expect(isOpen()).toBe(true);
    });

    it('opens the closed select on the match, and commits nothing', async () => {
      const event = press('c');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(true);
      expect(isOpen()).toBe(true);
      expect(active()).toBe('Cherry');
      expect(host.picked()).toBeNull();
    });

    it('Space joins a run that has started, and is the commit otherwise', async () => {
      await open();
      press('r');
      press('e');
      press('d');
      expect(active()).toBe('Red apple');
      press(' ');
      press('c');
      expect(active()).toBe('Red currant');
      expect(host.picked()).toBeNull();
      fixture.destroy();

      fixture = TestBed.createComponent(Host);
      host = fixture.componentInstance as Host;
      fixture.detectChanges();
      await open();
      press('ArrowDown');
      press(' ');
      await fixture.whenStable();
      expect(host.picked()).toBe('banana');
    });

    it('Space on the closed trigger still opens the list', async () => {
      press(' ');
      await fixture.whenStable();
      expect(isOpen()).toBe(true);
      expect(active()).toBe('Apple');
    });

    it('Space still toggles in a multi select', async () => {
      host.mode.set('multi');
      host.picked.set([]);
      fixture.detectChanges();
      await open();
      press('ArrowDown');
      press(' ');
      await fixture.whenStable();
      expect(host.picked()).toEqual(['banana']);
      expect(isOpen()).toBe(true);
    });

    it('leaves a search select to its own typing', async () => {
      host.searchable.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[role="combobox"]')!;
      const event = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(false);
      expect(input.getAttribute('aria-expanded')).not.toBe('true');
    });
  });

  describe('[options] rows', () => {
    let host: OptionsHost;

    beforeEach(async () => {
      fixture = TestBed.createComponent(OptionsHost);
      host = fixture.componentInstance as OptionsHost;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('opens the closed select on the match', async () => {
      press('c');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(isOpen()).toBe(true);
      expect(active()).toBe('Cherry');
      expect(host.picked()).toBeNull();
    });

    it('moves the cursor of a virtual list', async () => {
      host.virtual.set(true);
      fixture.detectChanges();
      press('b');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(document.querySelector('.wr-select-panel--virtual')).not.toBeNull();
      expect(active()).toBe('Banana');
      press('b');
      expect(active()).toBe('Blueberry');
    });
  });
});
