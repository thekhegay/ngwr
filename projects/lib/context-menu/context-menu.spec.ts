import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrContextMenu } from './context-menu';
import { WrContextMenuDivider } from './context-menu-divider';
import { WrContextMenuItem } from './context-menu-item';
import { WrContextMenuPanel } from './context-menu-panel';

@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrContextMenuDivider],
  template: `
    <!-- A plain div with no tabindex, which is the shape the directive's own
         example and every showcase demo ship: jsdom refuses focus() on one,
         exactly as a browser does, so the close has to make it focusable itself.
         The button is the control a Shift+F10 open comes from. -->
    <div class="target" [wrContextMenu]="menu">
      Right-click me
      <button class="child" type="button">Open</button>
    </div>

    <wr-context-menu #menu>
      <wr-context-menu-item (click)="picked.set('cut')">Cut</wr-context-menu-item>
      <wr-context-menu-item [disabled]="copyDisabled()" (click)="picked.set('copy')">Copy</wr-context-menu-item>
      <wr-context-menu-divider />
      <wr-context-menu-item [submenu]="more">More</wr-context-menu-item>
    </wr-context-menu>

    <wr-context-menu #more>
      <wr-context-menu-item (click)="picked.set('nested')">Nested</wr-context-menu-item>
    </wr-context-menu>
  `,
})
class Host {
  readonly picked = signal<string | null>(null);
  readonly copyDisabled = signal(false);
}

/**
 * A context menu is the APG menu pattern delivered through an overlay, so what
 * has to hold is the ARIA shape (`role="menu"` owning `role="menuitem"`
 * children, each out of the tab order because the menu roves focus itself) and
 * the submenu contract: an item that opens one advertises `aria-haspopup` and
 * tracks `aria-expanded`, and Enter on it must OPEN rather than activate.
 *
 * Every panel lands in the CDK overlay container, so nothing is queried from
 * the fixture; `provideWrOverlay()` keeps this file's container private.
 */
describe('WrContextMenu', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const target = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.target')!;
  const menus = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="menu"]')];
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const itemFor = (label: string): HTMLElement | undefined =>
    items().find(i => (i.textContent ?? '').trim().includes(label));
  const picked = (): string | null => fixture.componentInstance.picked();

  const rightClick = (): void => {
    target().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  const press = (el: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  /**
   * Closing is deliberately deferred twice: a microtask so the consumer's own
   * `(click)` runs first, then 220 ms of exit animation during which the
   * directive holds the pane alive. Both have to be flushed before the DOM
   * reflects the close — `whenStable()` alone only covers the microtask.
   */
  const settle = async (): Promise<void> => {
    // Microtasks by hand, NOT `whenStable()`: under fake timers that call waits
    // on a timer the fake clock has frozen and the test simply hangs. Flushing
    // the queue and then advancing the clock does the same job without the
    // deadlock.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  /**
   * One handle cannot hold two closings.
   *
   * `closeOverlay()` keeps a pane alive for its 220ms exit animation, and
   * `onContextMenu` closes then immediately re-opens — so right-clicking faster
   * than the animation used to clear the PREVIOUS pane's dispose timer and
   * replace it with its own. Every pane but the last was then orphaned: an
   * `opacity: 0`, `pointer-events: auto` box with a live document scroll
   * listener and an undetached ref still registered with CDK's keyboard
   * dispatcher, which swallowed Escape for the whole page.
   */
  it('disposes every pane when re-opened faster than the exit animation', () => {
    for (let i = 0; i < 4; i++) {
      rightClick();
      vi.advanceTimersByTime(50);
    }
    // Close the last one and let every pending animation finish.
    press(menus()[0], 'Escape');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(document.querySelectorAll('.wr-context-menu-overlay')).toHaveLength(0);
  });

  /**
   * A pane on its way out must stop hit-testing the moment it is dismissed.
   *
   * `opacity: 0` does not stop pointer events and `.cdk-overlay-pane` sets
   * `pointer-events: auto`, so for the whole 220 ms exit animation an invisible
   * menu used to swallow the next click — and a second click on the item just
   * picked re-ran the consumer's action.
   *
   * Asserted on the inline style the directive writes, not by clicking through
   * it: jsdom has no layout and no hit-testing, so a dispatched click reaches a
   * `pointer-events: none` element exactly as it reaches a live one.
   */
  it('stops the dismissed pane hit-testing while it fades out', () => {
    rightClick();
    const pane = document.querySelector<HTMLElement>('.wr-context-menu-overlay')!;
    expect(pane.style.pointerEvents).toBe('');

    press(menus()[0], 'Escape');
    // Mid-animation: still in the DOM, already inert.
    vi.advanceTimersByTime(50);
    fixture.detectChanges();

    expect(pane.isConnected).toBe(true);
    expect(pane.style.pointerEvents).toBe('none');
  });

  it('takes its still-closing panes with it when the directive is destroyed', () => {
    rightClick();
    press(menus()[0], 'Escape');
    // Destroyed mid-animation: the timer that would have disposed the pane
    // belongs to a directive that is about to stop existing.
    fixture.destroy();
    vi.advanceTimersByTime(1000);

    expect(document.querySelectorAll('.wr-context-menu-overlay')).toHaveLength(0);
  });

  it('renders nothing until the target is right-clicked', () => {
    expect(menus()).toHaveLength(0);

    rightClick();
    expect(menus()).toHaveLength(1);
  });

  it('suppresses the browser menu so its own can show', () => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    target().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
  });

  it('builds a menu that owns menuitems', () => {
    rightClick();

    expect(menus()[0].getAttribute('role')).toBe('menu');
    expect(items().length).toBeGreaterThanOrEqual(3);
    expect(items().every(i => i.closest('[role="menu"]') !== null)).toBe(true);
  });

  it('points the target at the menu it opened, and lets go on close', async () => {
    rightClick();

    // The pane is portalled into the overlay container, so nothing nests the
    // menu under the target — this reference is the only link between them.
    expect(target().getAttribute('aria-controls')).toBe(menus()[0].id);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(target().hasAttribute('aria-controls')).toBe(false);
  });

  it('keeps every item out of the tab order, since the menu roves focus', () => {
    rightClick();

    // A menu that is also a row of tab stops makes Tab walk the items instead
    // of leaving the menu, which is the opposite of the pattern.
    expect(items().every(i => i.getAttribute('tabindex') === '-1')).toBe(true);
  });

  it('activates an item and closes', async () => {
    rightClick();
    itemFor('Cut')!.click();
    await settle();

    expect(picked()).toBe('cut');
    expect(menus()).toHaveLength(0);
  });

  it('activates from the keyboard too', async () => {
    rightClick();
    press(itemFor('Cut')!, 'Enter');
    await settle();

    expect(picked()).toBe('cut');
  });

  it('says a disabled item is disabled, and refuses the keyboard', async () => {
    fixture.componentInstance.copyDisabled.set(true);
    fixture.detectChanges();
    rightClick();

    const copy = itemFor('Copy')!;
    expect(copy.getAttribute('aria-disabled')).toBe('true');

    // Keyboard activation is refused in code. The POINTER path is refused by
    // `pointer-events: none` on the disabled modifier, which a dispatched
    // `.click()` bypasses by definition — so asserting it here would be
    // asserting jsdom, not the component.
    press(copy, 'Enter');
    await settle();

    expect(picked()).toBeNull();
  });

  it('marks a divider as presentation, not as an item', () => {
    rightClick();

    const divider = document.querySelector('wr-context-menu-divider')!;
    // Counted as a menuitem it becomes "4 of 5" in every announcement and a
    // stop the roving cursor has to skip.
    expect(divider.getAttribute('role')).not.toBe('menuitem');
  });

  /**
   * The rows are `tabindex="-1"` and the pane is not a tab stop, so if the menu
   * does not move the keyboard in, nothing else can: a keyboard user saw a
   * `role="menu"` they could not enter, navigate or activate, and only Escape
   * answered — the dispatcher routes that one regardless of focus.
   *
   * The keys go to `document.body` rather than to an item, which is the honest
   * shape: CDK's keyboard dispatcher is a single body-level listener that hands
   * the event to the topmost overlay, and dispatching AT a row would prove
   * nothing about where the cursor was.
   */
  describe('keyboard', () => {
    const focused = (): string => (document.activeElement?.textContent ?? '').trim();
    const type = (key: string): void => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };

    it('moves the cursor onto the first item as the menu opens', () => {
      expect(document.activeElement).toBe(document.body);

      rightClick();

      expect(document.activeElement).toBe(itemFor('Cut'));
    });

    it('roves the cursor with the arrows, Home and End', () => {
      rightClick();

      type('ArrowDown');
      expect(focused()).toBe('Copy');

      type('End');
      expect(focused()).toBe('More');

      // Both ends wrap, the way a menu cursor does.
      type('ArrowDown');
      expect(focused()).toBe('Cut');

      type('ArrowUp');
      expect(focused()).toBe('More');

      type('Home');
      expect(focused()).toBe('Cut');
    });

    it('steps over a disabled row rather than parking on it', () => {
      fixture.componentInstance.copyDisabled.set(true);
      fixture.detectChanges();
      rightClick();

      type('ArrowDown');

      // Copy sits between them and cannot be activated, so it is not a stop.
      expect(focused()).toBe('More');
    });

    /**
     * The target is a plain `<div>` — the shape the docs ship — and `focus()` on
     * an element that is not a focusable area does nothing at all, so the
     * handback used to miss silently: the caret stayed in the disposing pane and
     * then fell to `<body>`, which is the outcome it exists to prevent. The
     * trigger is lent a `tabindex="-1"` for the call.
     */
    it('hands the keyboard back to the target when the menu closes', async () => {
      rightClick();
      expect(document.activeElement).toBe(itemFor('Cut'));

      type('Escape');
      await settle();

      // Otherwise the caret is stranded on `<body>` once the pane is disposed and
      // the next Tab restarts at the top of the document.
      expect(document.activeElement).toBe(target());
    });

    it('gives the borrowed tabindex back when the target loses focus', async () => {
      rightClick();
      type('Escape');
      await settle();
      expect(target().getAttribute('tabindex')).toBe('-1');

      // A permanent one would make every right-clickable region a tab stop,
      // which is the consumer's call to make and not the library's.
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      expect(target().hasAttribute('tabindex')).toBe(false);
      elsewhere.remove();
    });

    /**
     * A context menu hangs on a REGION, and Shift+F10 / the Menu key fires
     * `contextmenu` at whatever control inside it the user was on — so that
     * control, not the wrapper, is where their place in the page is.
     */
    it('returns the caret to the control the menu was opened from', async () => {
      const child = target().querySelector<HTMLElement>('.child')!;
      child.focus();

      child.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(document.activeElement).toBe(itemFor('Cut'));

      type('Escape');
      await settle();

      expect(document.activeElement).toBe(child);
      // The wrapper was focusable all along through its child, so nothing had to
      // be lent to it.
      expect(target().hasAttribute('tabindex')).toBe(false);
    });

    /**
     * CDK removes an overlay from its keyboard dispatcher on `detach()` /
     * `dispose()`, and the dispose is 220 ms of exit animation away — while the
     * dispatcher stops at the topmost overlay that still has a keydown
     * subscriber. So a dismissed menu went on eating every key on the page.
     */
    it('lets go of the page keyboard the moment it is dismissed', () => {
      rightClick();
      const pane = document.querySelector<HTMLElement>('.wr-context-menu-overlay')!;

      type('Escape');
      vi.advanceTimersByTime(50);
      fixture.detectChanges();
      // Mid-animation: still in the DOM, and no longer listening.
      expect(pane.isConnected).toBe(true);

      const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      document.body.dispatchEvent(arrow);

      // Unhandled, so the page scrolls as the user asked…
      expect(arrow.defaultPrevented).toBe(false);
      // …and the caret is not yanked onto a row of an invisible menu.
      expect(pane.contains(document.activeElement)).toBe(false);
    });

    it('leaves the caret alone when the menu never had it', async () => {
      rightClick();
      // Escape reaches this overlay from anywhere on the page — the dispatcher
      // routes by stacking order, not by focus — so a menu nobody is in must not
      // pull the caret out of the field they are.
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      type('Escape');
      await settle();

      expect(document.activeElement).toBe(elsewhere);
      elsewhere.remove();
    });
  });

  it('closes on Escape', async () => {
    rightClick();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(menus()).toHaveLength(0);
  });

  describe('submenus', () => {
    it('advertises the submenu on the item that owns it', () => {
      rightClick();
      const more = itemFor('More')!;

      expect(more.getAttribute('aria-haspopup')).toBe('menu');
      expect(more.getAttribute('aria-expanded')).toBe('false');
      // A plain item must not claim one.
      expect(itemFor('Cut')!.getAttribute('aria-haspopup')).toBeNull();
    });

    it('opens on the right arrow and reports itself expanded', async () => {
      rightClick();
      press(itemFor('More')!, 'ArrowRight');
      await settle();

      expect(menus().length).toBeGreaterThanOrEqual(2);
      expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('true');
    });

    it('opens on Enter rather than activating the parent item', async () => {
      rightClick();
      press(itemFor('More')!, 'Enter');
      await settle();

      // Enter on a parent has to mean "go in". Activating it would close the
      // whole menu and the submenu would be unreachable from the keyboard.
      expect(menus().length).toBeGreaterThanOrEqual(2);
      expect(picked()).toBeNull();
    });

    it('closes the submenu on the left arrow', async () => {
      rightClick();
      press(itemFor('More')!, 'ArrowRight');
      await settle();
      expect(menus().length).toBeGreaterThanOrEqual(2);

      press(itemFor('More')!, 'ArrowLeft');
      await settle();

      expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('walks the cursor into the submenu, and the back arrow walks it out', async () => {
      rightClick();
      press(itemFor('More')!, 'ArrowRight');
      await settle();

      // A submenu whose pane is up but whose rows nothing can reach is the same
      // dead end the root menu used to be.
      expect(document.activeElement).toBe(itemFor('Nested'));

      // Sent at the body, so it is the submenu's own overlay that answers — the
      // dispatcher hands the key to the topmost pane, which is the level the
      // user is on.
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(document.activeElement).toBe(itemFor('More'));
      expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes only the submenu on Escape, leaving the root menu up', async () => {
      rightClick();
      press(itemFor('More')!, 'ArrowRight');
      await settle();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      // One level per press, the APG rule for a submenu.
      expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('false');
      expect(target().getAttribute('aria-controls')).not.toBeNull();
      expect(document.activeElement).toBe(itemFor('More'));
    });

    it('leaves the cursor where it was when hover opens the submenu', async () => {
      rightClick();
      expect(document.activeElement).toBe(itemFor('Cut'));

      itemFor('More')!.dispatchEvent(new MouseEvent('mouseenter'));
      await settle();

      // Sweeping the pointer across a row shows its submenu; it must not yank the
      // keyboard out of wherever the user had it.
      expect(menus().length).toBeGreaterThanOrEqual(2);
      expect(document.activeElement).toBe(itemFor('Cut'));
    });

    /**
     * CDK's dispatcher routes a key by stacking order, not by focus, so a
     * hover-opened submenu is handed every keydown while the caret is still on
     * the root row the pointer swept off. Aimed at its own pane, the navigation
     * saw an `activeElement` it does not own (index -1) and opened at its first
     * row — the arrows silently changed level under a keyboard user.
     */
    it('walks the level the caret is on while a hover-opened submenu is up', async () => {
      rightClick();
      itemFor('More')!.dispatchEvent(new MouseEvent('mouseenter'));
      await settle();
      expect(menus().length).toBeGreaterThanOrEqual(2);
      expect(document.activeElement).toBe(itemFor('Cut'));

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      // 'Copy', the next ROOT row — not 'Nested', the submenu's first.
      expect(document.activeElement).toBe(itemFor('Copy'));
    });

    it('closes a hover-opened submenu on Escape without moving the caret', async () => {
      rightClick();
      itemFor('More')!.dispatchEvent(new MouseEvent('mouseenter'));
      await settle();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('false');
      // The row that owns a pointer-opened submenu is not where the keyboard is.
      expect(document.activeElement).toBe(itemFor('Cut'));
    });

    it('activating a nested item closes everything', async () => {
      rightClick();
      press(itemFor('More')!, 'ArrowRight');
      await settle();

      itemFor('Nested')!.click();
      await settle();

      expect(picked()).toBe('nested');
      expect(menus()).toHaveLength(0);
    });
  });
});

/**
 * Submenu panes mirror with the reading direction — the CDK flips their placement
 * — so the arrow that walks INTO a submenu is the one pointing the way the menu
 * cascades. Under `dir="rtl"` that is ArrowLeft, and the LTR twins of these two
 * cases are 'opens on the right arrow' and 'closes the submenu on the left arrow'
 * above.
 */
describe('WrContextMenu under dir="rtl"', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const target = (): HTMLElement => root().querySelector<HTMLElement>('.wr-context-menu-host')!;
  const menus = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-context-menu')];
  const itemFor = (label: string): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('.wr-context-menu-item')].find(i => i.textContent?.trim() === label);

  const rightClick = (): void => {
    target().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    fixture.detectChanges();
  };
  const press = (el: HTMLElement, key: string): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const settle = async (): Promise<void> => {
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        { provide: Directionality, useValue: { value: 'rtl', change: new Subject<Direction>() } },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('opens the submenu on the left arrow, which is the way it cascades', async () => {
    rightClick();
    press(itemFor('More')!, 'ArrowLeft');
    await settle();

    expect(menus().length).toBeGreaterThanOrEqual(2);
    expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes it again on the right arrow', async () => {
    rightClick();
    press(itemFor('More')!, 'ArrowLeft');
    await settle();
    expect(menus().length).toBeGreaterThanOrEqual(2);

    press(itemFor('More')!, 'ArrowRight');
    await settle();

    expect(itemFor('More')!.getAttribute('aria-expanded')).toBe('false');
  });
});
