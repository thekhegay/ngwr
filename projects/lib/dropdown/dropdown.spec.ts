import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDropdown } from './dropdown';
import { WrDropdownItem } from './dropdown-item';
import { WrDropdownMenu } from './dropdown-menu';
import type { WrDropdownTrigger } from './interfaces';

/**
 * The menu is a CDK overlay rendered from a template portal, so it lands in the
 * overlay container rather than in the fixture — every query for an item goes
 * through the document. `provideWrOverlay()` keeps that container out of the next
 * spec file's.
 */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" id="account-actions" [wrDropdown]="menu" [trigger]="how()">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item (click)="picked.push('copy')">Copy</wr-dropdown-item>
      <wr-dropdown-item [disabled]="true" (click)="picked.push('delete')">Delete</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('rename')">Rename</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class Host {
  readonly how = signal<WrDropdownTrigger>('click');
  readonly picked: string[] = [];
}

/** Same menu, on a trigger the consumer gave no `id` of their own. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="menu">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Copy</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class UnnamedHost {}

describe('WrDropdown', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const menu = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dropdown-menu');
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-dropdown-item')];

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
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('advertises a menu button before anything is open', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
    expect(trigger().classList.contains('wr-dropdown-trigger')).toBe(true);
    expect(menu()).toBeNull();
  });

  it("leaves the consumer's own id on their own element", () => {
    // The trigger belongs to the consumer. Overwriting its `id` broke `<label for>`,
    // `getElementById` and any `aria-labelledby` aimed at that button — and the id
    // exists only so the menu has something to name itself after, which the
    // consumer's own value does just as well.
    expect(trigger().getAttribute('id')).toBe('account-actions');

    click(trigger());
    expect(menu()!.getAttribute('aria-labelledby')).toBe('account-actions');
  });

  it('generates an id only when the trigger has none', () => {
    const bare = TestBed.createComponent(UnnamedHost);
    bare.detectChanges();
    const button = (bare.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('id')).toMatch(/^wr-dropdown-trigger-\d+$/);
    bare.destroy();
  });

  it('opens on click and wires the menu to the trigger', () => {
    click(trigger());

    expect(menu()).not.toBeNull();
    expect(menu()!.getAttribute('role')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(menu()!.getAttribute('id'));
  });

  it('closes again on a second click', () => {
    click(trigger());
    click(trigger());
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens from the keyboard the way a menu button should', () => {
    for (const name of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      const event = key(trigger(), name);
      expect(event.defaultPrevented, name).toBe(true);
      expect(menu(), name).not.toBeNull();
      click(trigger());
    }
  });

  it('leaves other keys to the page', () => {
    const event = key(trigger(), 'a');
    expect(event.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it('renders every item as a menuitem outside the tab order', () => {
    click(trigger());
    expect(items().length).toBe(3);
    for (const item of items()) {
      expect(item.getAttribute('role')).toBe('menuitem');
      expect(item.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('activates an item from the keyboard as well as the pointer', () => {
    click(trigger());
    click(items()[0]);
    expect(fixture.componentInstance.picked).toEqual(['copy']);

    // Picking does NOT close the menu — there is no close-on-select anywhere in the
    // item or the menu, so a consumer who wants one calls `close()` themselves.
    expect(menu()).not.toBeNull();

    key(items()[2], 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['copy', 'rename']);
  });

  it('announces a disabled item and refuses to activate it by keyboard', () => {
    click(trigger());
    const disabled = items()[1];

    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.classList.contains('wr-dropdown-item--disabled')).toBe(true);

    key(disabled, 'Enter');
    key(disabled, ' ');
    expect(fixture.componentInstance.picked).toEqual([]);
  });

  it('moves focus onto the first item once the menu has rendered', async () => {
    // The initial focus is queued in a microtask, so it lands after the synchronous
    // `detectChanges` an event triggers — worth pinning, because every arrow key
    // measures its next target from `document.activeElement`.
    click(trigger());
    expect(document.activeElement).not.toBe(items()[0]);

    await Promise.resolve();
    expect(document.activeElement).toBe(items()[0]);
  });

  it('skips a disabled item when the arrows walk the menu', async () => {
    click(trigger());
    await Promise.resolve();

    // Focus starts on the first item; ArrowDown must land on 'Rename', not 'Delete'.
    key(menu()!, 'ArrowDown');
    expect(document.activeElement).toBe(items()[2]);

    key(menu()!, 'End');
    expect(document.activeElement).toBe(items()[2]);
    key(menu()!, 'Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    click(trigger());
    key(menu()!, 'Escape');

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Tab so focus can leave', () => {
    click(trigger());
    key(menu()!, 'Tab');
    expect(menu()).toBeNull();
  });

  it('opens on hover when asked to', () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    // A click must not toggle it shut in hover mode.
    click(trigger());
    expect(menu()).not.toBeNull();
  });

  /**
   * Hover SHOWS a menu; it does not take the keyboard with it.
   *
   * The first-item focus was unconditional, so sweeping a cursor over a
   * `trigger="hover"` menu pulled the caret out of whatever the user was
   * typing — and moving the cursor away disposed the pane with focus still
   * inside it, dropping focus on `<body>` so the next Tab restarted from the
   * top of the document.
   */
  it('does not take the keyboard when the pointer opens it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    try {
      trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();

      expect(menu()).not.toBeNull();
      expect(document.activeElement, 'the menu stole the caret').toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it('gives focus back to the trigger when a hover menu closes under it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    // The user tabbed into the menu, then the pointer left.
    items()[0].focus();
    trigger().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
    expect(document.activeElement, 'focus was stranded on <body>').toBe(trigger());
  });

  it('still focuses the first item when the KEYBOARD opens it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    key(trigger(), 'ArrowDown');
    await Promise.resolve();
    fixture.detectChanges();

    expect(document.activeElement).toBe(items()[0]);
  });

  it('takes the menu with it when the trigger is destroyed', () => {
    // The overlay lives in the CDK container, not in the destroyed view, so nothing
    // else would remove it.
    click(trigger());
    expect(menu()).not.toBeNull();

    fixture.destroy();
    expect(menu()).toBeNull();
  });
});

/** The same menu on a trigger that asks for the sheet presentation explicitly. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="menu" [responsive]="responsive()">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Copy</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class SheetHost {
  readonly responsive = signal<boolean | undefined>(true);
}

/**
 * The mobile presentation, which is a different overlay rather than a restyled one:
 * pinned to the bottom edge, full width, with a backdrop that blocks the page and
 * dismisses on a tap. Nothing about it is CSS — every one of those is an option
 * passed to `overlay.create()` — so a unit test can see all of it.
 *
 * The viewport is what decides, so it is moved here and put back afterwards: jsdom
 * shares one window across the whole file.
 */
describe('WrDropdown as a bottom sheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SheetHost>>;
  const width = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  const trigger = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dropdown-overlay');

  const mount = (viewport: number): void => {
    Object.defineProperty(window, 'innerWidth', { value: viewport, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
    if (width) Object.defineProperty(window, 'innerWidth', width);
  });

  it('slides up from the bottom on a narrow viewport', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(true);
    // The floating form carries a per-position modifier; the sheet has no position
    // to carry, which is the tell that it detached from the trigger.
    expect(pane()!.className).not.toContain('wr-dropdown-overlay--');
  });

  it('dims the page behind it, with the shared class that has the styles', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop!.classList.contains('wr-overlay-backdrop')).toBe(true);
  });

  it('closes when that backdrop is tapped', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    fixture.detectChanges();

    expect(pane()).toBeNull();
  });

  it('stays a floating menu on a wide viewport, backdrop and all', () => {
    mount(1280);
    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
    expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
  });

  it('never becomes a sheet when the trigger opted out', () => {
    mount(390);
    fixture.componentInstance.responsive.set(false);
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * A disabled item's own `disabled` guards the KEYBOARD path only; a real pointer
 * click lands on the host element, which is exactly where the consumer bound
 * `(click)`, so nothing stopped `remove()` firing on a disabled Delete. The fix is
 * `pointer-events: none` — the same answer `wr-btn` and `wr-checkbox` give — and
 * jsdom loads no stylesheets, so a spec here that clicked a disabled item would
 * pass identically before and after.
 *
 * Verified instead in headless Chromium against CSS compiled from this folder:
 * a click at the centre of the disabled item reached `.wr-dropdown-item--disabled`
 * before the fix and the item's `<wr-dropdown-menu>` ancestor after it, so the
 * item's own handler is never reached.
 */
describe('the dropdown item stylesheet', () => {
  const source = readFileSync(join(process.cwd(), 'projects/lib/dropdown/styles/_index.scss'), 'utf8');
  const code = source
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('stops a pointer reaching a disabled item at all', () => {
    const rule = /&--disabled\s*\{([\s\S]*?)\n {2}\}/.exec(code)?.[1] ?? '';
    expect(rule).toMatch(/pointer-events:\s*none/);
  });
});
