import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSpeedDialAction, WrSpeedDialDirection } from './interfaces';
import { WrSpeedDial } from './speed-dial';

const ACTIONS: readonly WrSpeedDialAction[] = [
  { id: 'note', label: 'New note', icon: 'plus' },
  { id: 'task', label: 'New task' },
];

@Component({
  imports: [WrSpeedDial],
  template: `
    <wr-speed-dial
      [(open)]="open"
      [actions]="actions()"
      [direction]="direction()"
      [disabled]="disabled()"
      (pick)="picked.push($event.id)"
    />
  `,
})
class Host {
  readonly open = signal(false);
  readonly actions = signal<readonly WrSpeedDialAction[]>(ACTIONS);
  readonly direction = signal<WrSpeedDialDirection>('up');
  readonly disabled = signal(false);
  readonly picked: string[] = [];
}

/**
 * The dial declares `role="menu"` over `role="menuitem"` buttons, and that role is a
 * promise: a way in, a way out, and a name for each item. The collapsed actions are
 * hidden with `visibility` rather than `opacity` — deliberately, per the stylesheet —
 * so they leave the tab order and the accessibility tree together, which is the one
 * part of the pattern jsdom cannot check and the stylesheet has to be trusted for.
 */
describe('WrSpeedDial', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-speed-dial')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-speed-dial__trigger')!;
  const menu = (): HTMLElement => root().querySelector<HTMLElement>('[role="menu"]')!;
  const items = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const key = (el: EventTarget, name: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
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

  it('presents a named menu button, collapsed', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Actions');
    expect(host().classList.contains('wr-speed-dial--open')).toBe(false);
  });

  it('points the trigger at the menu it opens', () => {
    // Without `aria-controls` the relationship exists only visually — `wr-dropdown`
    // wires the same pair.
    expect(trigger().getAttribute('aria-controls')).toBe(menu().getAttribute('id'));
    expect(menu().getAttribute('id')).toBeTruthy();
  });

  it('keeps every action a named menuitem under the menu', () => {
    // `role="none"` on the `<li>` is load-bearing: `role="menu"` strips the list's
    // implicit semantics, so an unroled wrapper would break menu → menuitem parentage.
    expect(items().length).toBe(2);
    expect(items().map(el => el.getAttribute('aria-label'))).toEqual(['New note', 'New task']);
    for (const li of root().querySelectorAll('.wr-speed-dial__action-wrap')) {
      expect(li.getAttribute('role')).toBe('none');
    }
  });

  it('opens and closes from the trigger', () => {
    click(trigger());
    expect(fixture.componentInstance.open()).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(host().classList.contains('wr-speed-dial--open')).toBe(true);

    click(trigger());
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    // The role promises a way out. Without it a keyboard user who opened the dial had
    // to tab through every action to leave it.
    click(trigger());
    const event = key(items()[0], 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('leaves keys it does not own to the page', () => {
    click(trigger());
    expect(key(items()[0], 'a').defaultPrevented).toBe(false);
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('reports the picked action and closes', () => {
    click(trigger());
    click(items()[1]);

    expect(fixture.componentInstance.picked).toEqual(['task']);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('carries the direction into the class list', () => {
    expect(host().classList.contains('wr-speed-dial--up')).toBe(true);

    fixture.componentInstance.direction.set('left');
    fixture.detectChanges();
    expect(host().classList.contains('wr-speed-dial--left')).toBe(true);
    expect(host().classList.contains('wr-speed-dial--up')).toBe(false);
  });

  it('goes inert when disabled, trigger and actions alike', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(host().classList.contains('wr-speed-dial--disabled')).toBe(true);
    expect(trigger().disabled).toBe(true);
    // The actions used to stay enabled, so a click on one landed on a handler that
    // silently refused — a control that looks live and does nothing.
    expect(items().every(item => item.disabled)).toBe(true);
  });

  it('closes itself when it is disabled while open', () => {
    // The trigger is the only way to close it, and a disabled trigger cannot be
    // pressed — so the dial stayed fanned out with no way back.
    click(trigger());
    expect(fixture.componentInstance.open()).toBe(true);

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(host().classList.contains('wr-speed-dial--open')).toBe(false);
  });

  it('keeps a whole glyph as the iconless fallback', () => {
    // `charAt(0)` returns one UTF-16 code unit, so an astral glyph comes back as a
    // lone high surrogate and renders as a replacement character. A BMP emoji like
    // ⭐ survives `charAt` and proves nothing — this one has to be outside it.
    fixture.componentInstance.actions.set([{ id: 'launch', label: '🚀 Launch' }]);
    fixture.detectChanges();

    expect(items()[0].textContent.trim()).toBe('🚀');
  });

  it('renders nothing to pick when there are no actions', () => {
    fixture.componentInstance.actions.set([]);
    fixture.detectChanges();
    expect(items()).toEqual([]);
    expect(menu()).not.toBeNull();
  });
});
