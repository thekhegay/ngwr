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
    <div class="target" [wrContextMenu]="menu">Right-click me</div>

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
