import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrOption } from './option';
import { WrSelectFooter, WrSelectHeader } from './panel-slots';
import { WrSelect } from './select';
import type { WrSelectMode } from './types';

@Component({
  imports: [WrSelect, WrOption, WrSelectHeader, WrSelectFooter],
  template: `
    <wr-select #select ariaLabel="Owner" [mode]="mode()" [(value)]="owner" (closed)="closed.set(closed() + 1)">
      @if (header()) {
        <div class="t-header" wrSelectHeader>People</div>
      }
      <wr-option value="ada">Ada</wr-option>
      <wr-option value="bob">Bob</wr-option>
      @if (footer()) {
        <div class="t-footer" wrSelectFooter>
          <button class="t-add" type="button" (click)="added.set(added() + 1)">Add</button>
          <button class="t-close" type="button" (click)="select.close()">Close</button>
        </div>
      }
    </wr-select>
  `,
})
class Host {
  readonly mode = signal<WrSelectMode>('single');
  readonly header = signal(true);
  readonly footer = signal(true);
  readonly owner = signal<unknown>(null);
  readonly added = signal(0);
  readonly closed = signal(0);
}

@Component({
  imports: [WrSelect, WrSelectFooter],
  template: `
    <wr-select ariaLabel="Numbers" virtualScroll [options]="options" [(value)]="picked">
      <div class="t-footer" wrSelectFooter>Footer</div>
    </wr-select>
  `,
})
class VirtualHost {
  readonly options = Array.from({ length: 200 }, (_, i) => `Item ${i}`);
  readonly picked = signal<unknown>(null);
}

const key = (name: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });

describe('WrSelect header and footer slots', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__trigger')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-overlay');
  const frame = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-frame');
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-panel');
  const q = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    // jsdom lays nothing out, and a control with no box is not a tab stop.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('draws nothing of the slots while the panel is closed', () => {
    expect(q('.t-header')).toBeNull();
    expect(q('.t-footer')).toBeNull();
    expect(root().querySelector('.t-header, .t-footer')).toBeNull();
  });

  it('draws the header above the listbox and the footer below it, both outside it', () => {
    open();

    const children = [...frame()!.children];
    expect(children.map(el => el.className)).toEqual([
      'wr-select-frame__header',
      'wr-select-panel',
      'wr-select-frame__footer',
    ]);
    expect(children[0].contains(q('.t-header'))).toBe(true);
    expect(children[2].contains(q('.t-footer'))).toBe(true);
    expect(panel()!.getAttribute('role')).toBe('listbox');
    expect(panel()!.querySelector('.t-header, .t-footer')).toBeNull();
    expect(panel()!.querySelectorAll('.wr-option')).toHaveLength(2);
  });

  it('keeps the slots out of the virtual window', () => {
    fixture.destroy();
    const virtual = TestBed.createComponent(VirtualHost);
    virtual.detectChanges();
    (virtual.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-select__trigger')!.click();
    virtual.detectChanges();

    expect(q('.wr-select-panel__vlist')).not.toBeNull();
    expect(q('.wr-select-panel')!.contains(q('.t-footer'))).toBe(false);
    expect(frame()!.lastElementChild!.contains(q('.t-footer'))).toBe(true);
    virtual.destroy();
  });

  it('renders the panel alone, straight in the pane, when no slot is projected', () => {
    fixture.componentInstance.header.set(false);
    fixture.componentInstance.footer.set(false);
    fixture.detectChanges();
    open();

    expect(frame()).toBeNull();
    expect(q('.wr-select-frame__header, .wr-select-frame__footer')).toBeNull();
    expect(panel()!.parentElement).toBe(pane());
    expect(pane()!.children).toHaveLength(1);
  });

  it('renders only the slot that is projected', () => {
    fixture.componentInstance.header.set(false);
    fixture.detectChanges();
    open();

    expect(q('.wr-select-frame__header')).toBeNull();
    expect(q('.wr-select-frame__footer')).not.toBeNull();
  });

  it('keeps the panel open on a click in the footer, and picks nothing', () => {
    open();
    const add = q('.t-add')!;
    add.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    add.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    add.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.added()).toBe(1);
    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.owner()).toBeNull();
  });

  it('keeps the panel open on a click in the header', () => {
    open();
    q('.t-header')!.click();
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(fixture.componentInstance.owner()).toBeNull();
  });

  it('still picks an option beside the slots', () => {
    open();
    panel()!.querySelectorAll<HTMLElement>('.wr-option')[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.owner()).toBe('bob');
    expect(panel()).toBeNull();
  });

  it('still walks the options from the trigger', () => {
    trigger().dispatchEvent(key('ArrowDown'));
    fixture.detectChanges();
    trigger().dispatchEvent(key('ArrowDown'));
    fixture.detectChanges();

    const active = panel()!.querySelector('.wr-option--active')!;
    expect(active.textContent?.trim()).toBe('Bob');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(active.id);
  });

  it('closes through close() from a footer control and hands focus back to the trigger', () => {
    open();
    q('.t-close')!.focus();
    q('.t-close')!.click();
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(fixture.componentInstance.closed()).toBe(1);
    expect(document.activeElement).toBe(trigger());
  });

  it('moves Tab from the open trigger into the first slot control', () => {
    open();
    trigger().focus();
    const event = key('Tab');
    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(q('.t-add'));
    expect(panel()).not.toBeNull();
  });

  it('returns to the trigger on Shift+Tab from the first slot control, panel still open', () => {
    open();
    q('.t-add')!.focus();
    const event = key('Tab', { shiftKey: true });
    q('.t-add')!.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(panel()).not.toBeNull();
  });

  it('closes on Tab past the last slot control and lands on the trigger', () => {
    open();
    q('.t-close')!.focus();
    const event = key('Tab');
    q('.t-close')!.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('leaves Tab between two slot controls to the browser', () => {
    open();
    q('.t-add')!.focus();
    const event = key('Tab');
    q('.t-add')!.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(panel()).not.toBeNull();
  });

  it('closes on Shift+Tab from the trigger, as without slots', () => {
    open();
    const event = key('Tab', { shiftKey: true });
    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(panel()).toBeNull();
  });

  it('closes on Tab when the slots hold no control', () => {
    fixture.componentInstance.footer.set(false);
    fixture.detectChanges();
    open();
    const event = key('Tab');
    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(panel()).toBeNull();
  });

  it('closes on Escape pressed in a footer control and hands focus back', () => {
    open();
    q('.t-add')!.focus();
    q('.t-add')!.dispatchEvent(key('Escape'));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('draws the slots in search mode too', () => {
    fixture.componentInstance.mode.set('search');
    fixture.detectChanges();
    root().querySelector<HTMLInputElement>('.wr-select__search-input')!.focus();
    fixture.detectChanges();

    expect(frame()!.firstElementChild!.contains(q('.t-header'))).toBe(true);
    expect(frame()!.lastElementChild!.contains(q('.t-footer'))).toBe(true);
  });
});
