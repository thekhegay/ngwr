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
      (pick)="onPick($event)"
    />
  `,
})
class Host {
  readonly open = signal(false);
  readonly actions = signal<readonly WrSpeedDialAction[]>(ACTIONS);
  readonly direction = signal<WrSpeedDialDirection>('up');
  readonly disabled = signal(false);
  readonly picked: string[] = [];
  /** Where the caret was each time `pick` fired — a handler that navigates needs it settled. */
  readonly focusAtPick: (Element | null)[] = [];

  onPick(action: WrSpeedDialAction): void {
    this.picked.push(action.id);
    this.focusAtPick.push(document.activeElement);
  }
}

/**
 * The dial is a DISCLOSURE over a list of buttons, not a menu: `role="menu"` promises
 * arrow navigation, Home/End and one tab stop, and this component has never had any of
 * them. What it does have is pinned here — the expanded/collapsed state, a named button
 * per action, Escape out, and the caret handed back on both ways out. The collapsed
 * actions are hidden with `visibility` rather than `opacity` — deliberately, per the
 * stylesheet — so they leave the tab order and the accessibility tree together, which is
 * the one part jsdom cannot check and the stylesheet has to be trusted for.
 */
describe('WrSpeedDial', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-speed-dial')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-speed-dial__trigger')!;
  const menu = (): HTMLElement => root().querySelector<HTMLElement>('.wr-speed-dial__actions')!;
  const items = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-speed-dial__action')];

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

  it('presents a named disclosure button, collapsed', () => {
    // NOT aria-haspopup="menu": that announced a menu whose keys — arrows, Home/End,
    // focus moving in on open — the component never implemented, and it flips a screen
    // reader into focus mode where the arrows it promised stop reading the page.
    expect(trigger().getAttribute('aria-haspopup')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Actions');
    expect(host().classList.contains('wr-speed-dial--open')).toBe(false);
  });

  it('points the trigger at the list it opens', () => {
    // Without `aria-controls` the relationship exists only visually — `wr-dropdown`
    // wires the same pair.
    expect(trigger().getAttribute('aria-controls')).toBe(menu().getAttribute('id'));
    expect(menu().getAttribute('id')).toBeTruthy();
  });

  it('keeps every action a named button in a real list', () => {
    // `role="list"` is written out because `list-style: none` drops the implicit list
    // semantics in Safari; the `<li>`s carry no role of their own, so each one stays a
    // listitem and the buttons announce as buttons — which is what they are.
    expect(menu().getAttribute('role')).toBe('list');
    expect(items().length).toBe(2);
    expect(items().map(el => el.getAttribute('aria-label'))).toEqual(['New note', 'New task']);
    for (const li of root().querySelectorAll('.wr-speed-dial__action-wrap')) {
      expect(li.getAttribute('role')).toBeNull();
    }
    expect(items().map(el => el.getAttribute('role'))).toEqual([null, null]);
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

  it('hands focus back to the trigger when an action is picked', () => {
    // The collapsing wrapper turns `visibility: hidden`, and a browser blurs what it
    // hides — so picking from the keyboard used to drop the caret on `<body>` and the
    // next Tab restarted at the top of the document. Escape was covered; the success
    // path was not. jsdom applies no stylesheet, so it cannot show the `<body>`
    // landing; what it can pin is the return, which is the half the component owns.
    click(trigger());
    items()[1].focus();
    click(items()[1]);

    expect(document.activeElement).toBe(trigger());
  });

  it('emits the pick AFTER taking the focus back, so a handler can move it on', () => {
    // `pick` is where a consumer opens a dialog or navigates, and such a handler moves
    // focus itself — focusing after the emit would yank the caret back onto the trigger.
    click(trigger());
    items()[0].focus();
    click(items()[0]);

    expect(fixture.componentInstance.focusAtPick).toEqual([trigger()]);
  });

  it('does not steal the caret when the pick came from somewhere else', () => {
    // Safari does not focus a button on mouse-down, so focus can be anywhere when the
    // click lands — pulling it onto the trigger would take it from the user.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    click(trigger());
    outside.focus();

    click(items()[0]);
    const landed = document.activeElement;
    outside.remove();

    expect(landed).toBe(outside);
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
