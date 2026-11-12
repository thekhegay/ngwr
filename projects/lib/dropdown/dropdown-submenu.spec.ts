import { Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDropdown } from './dropdown';
import { WrDropdownItem } from './dropdown-item';
import { WrDropdownMenu } from './dropdown-menu';
import { WrDropdownSubmenu } from './dropdown-submenu';
import type { WrDropdownTrigger } from './types';

/**
 * A File menu two levels deep. Every level is its own overlay pane in the
 * container, so a level is found by the id its item publishes, never by order.
 */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem, WrDropdownSubmenu],
  template: `
    <button
      type="button"
      [wrDropdown]="file"
      [trigger]="how()"
      (opened)="events.push('opened')"
      (closed)="events.push('closed')"
    >
      File
    </button>
    <button type="button" class="elsewhere">Elsewhere</button>

    <wr-dropdown-menu #file>
      <wr-dropdown-item (click)="picked.push('new')">New</wr-dropdown-item>
      <wr-dropdown-item [wrDropdownSubmenu]="exportAs">Export</wr-dropdown-item>
      <wr-dropdown-item [wrDropdownSubmenu]="share" [showDelay]="40" [hideDelay]="60">Share</wr-dropdown-item>
      <wr-dropdown-item disabled [wrDropdownSubmenu]="share">Archive</wr-dropdown-item>
    </wr-dropdown-menu>

    <wr-dropdown-menu #exportAs>
      <wr-dropdown-item (click)="picked.push('csv')">CSV</wr-dropdown-item>
      <wr-dropdown-item [wrDropdownSubmenu]="pdf">PDF</wr-dropdown-item>
    </wr-dropdown-menu>

    <wr-dropdown-menu #pdf>
      <wr-dropdown-item (click)="picked.push('a4')">A4</wr-dropdown-item>
      <wr-dropdown-item>Letter</wr-dropdown-item>
    </wr-dropdown-menu>

    <wr-dropdown-menu #share>
      <wr-dropdown-item>Link</wr-dropdown-item>
      <wr-dropdown-item>Email</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class Host {
  readonly how = signal<WrDropdownTrigger>('click');
  readonly picked: string[] = [];
  readonly events: string[] = [];
}

describe('WrDropdownSubmenu', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const panes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-dropdown-overlay')];
  const item = (label: string): HTMLElement =>
    [...document.querySelectorAll<HTMLElement>('.wr-dropdown-overlay .wr-dropdown-item')].find(
      el => el.textContent.trim() === label
    )!;
  /** The menu an item opened, by the id the item publishes while it is open. */
  const submenuOf = (label: string): HTMLElement | null => {
    const id = item(label).getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };
  const labels = (menu: HTMLElement | null): string[] =>
    [...(menu?.querySelectorAll('.wr-dropdown-item') ?? [])].map(el => el.textContent.trim());

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
  const pointer = (el: HTMLElement, type: 'mouseenter' | 'mouseleave', related: Element | null = null): void => {
    el.dispatchEvent(new MouseEvent(type, { relatedTarget: related }));
    fixture.detectChanges();
  };
  const wait = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  /** Open the root from the keyboard, so focus is on its first item. */
  const openRoot = async (): Promise<void> => {
    key(trigger(), 'ArrowDown');
    await Promise.resolve();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('marks the item as a closed menu button, and keeps the chevron out of its name', async () => {
    await openRoot();
    const exportItem = item('Export');

    expect(exportItem.classList).toContain('wr-dropdown-submenu-trigger');
    expect(exportItem.getAttribute('role')).toBe('menuitem');
    expect(exportItem.getAttribute('aria-haspopup')).toBe('menu');
    expect(exportItem.getAttribute('aria-expanded')).toBe('false');
    expect(exportItem.hasAttribute('aria-controls')).toBe(false);
    // The chevron is generated content: nothing in the DOM for a name to pick up.
    expect(exportItem.textContent.trim()).toBe('Export');
    expect(item('New').hasAttribute('aria-haspopup')).toBe(false);
  });

  it('opens on click, in a pane of its own, as a menu named after the item', async () => {
    await openRoot();
    click(item('Export'));

    const menu = submenuOf('Export')!;
    expect(item('Export').getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-labelledby')).toBe(item('Export').id);
    expect(labels(menu)).toEqual(['CSV', 'PDF']);

    expect(panes()).toHaveLength(2);
    expect(panes()[1].classList).toContain('wr-dropdown-overlay--submenu');
    expect(panes()[1].classList).not.toContain('wr-dropdown-overlay--arrow');
    expect(panes()[1].contains(menu)).toBe(true);
  });

  it('leaves the caret where it was when a pointer opens it', async () => {
    await openRoot();
    item('Export').focus();
    click(item('Export'));

    expect(document.activeElement).toBe(item('Export'));
  });

  it('opens once the pointer has rested on the item for the delay', async () => {
    await openRoot();
    pointer(item('Export'), 'mouseenter');

    wait(149);
    expect(submenuOf('Export')).toBeNull();
    wait(1);
    expect(labels(submenuOf('Export'))).toEqual(['CSV', 'PDF']);
    // A hover shows the submenu and does not walk into it.
    expect(document.activeElement).toBe(item('New'));
  });

  it('opens nothing when the pointer leaves for another item first', async () => {
    await openRoot();
    pointer(item('Export'), 'mouseenter');
    wait(100);
    pointer(item('Export'), 'mouseleave', item('New'));
    wait(500);

    expect(panes()).toHaveLength(1);
    expect(item('Export').getAttribute('aria-expanded')).toBe('false');
  });

  it('reads its delays from the item', async () => {
    await openRoot();
    pointer(item('Share'), 'mouseenter');
    wait(40);
    expect(labels(submenuOf('Share'))).toEqual(['Link', 'Email']);

    pointer(item('Share'), 'mouseleave', item('New'));
    wait(59);
    expect(submenuOf('Share')).not.toBeNull();
    wait(1);
    expect(panes()).toHaveLength(1);
  });

  it('stays open while the pointer crosses into the submenu, and closes once it has left both', async () => {
    await openRoot();
    click(item('Export'));
    const pane = panes()[1];

    // Over a neighbour on the way in, then into the pane before the delay runs out.
    pointer(item('Export'), 'mouseleave', item('Share'));
    wait(100);
    pointer(pane, 'mouseenter');
    wait(500);
    expect(submenuOf('Export')).not.toBeNull();

    // Back onto its own item is not leaving.
    pointer(pane, 'mouseleave', item('Export'));
    wait(500);
    expect(submenuOf('Export')).not.toBeNull();

    pointer(pane, 'mouseleave', item('New'));
    wait(150);
    expect(panes()).toHaveLength(1);
  });

  it('replaces an open sibling submenu', async () => {
    await openRoot();
    click(item('Export'));
    click(item('Share'));

    expect(item('Export').getAttribute('aria-expanded')).toBe('false');
    expect(labels(submenuOf('Share'))).toEqual(['Link', 'Email']);
    expect(panes()).toHaveLength(2);
  });

  it('opens on ArrowRight and focuses the first item', async () => {
    await openRoot();
    key(item('Export'), 'ArrowDown');
    item('Export').focus();

    const event = key(item('Export'), 'ArrowRight');

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item('CSV'));
  });

  it('opens on Enter and on Space, and focuses the first item', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'Enter');
    expect(document.activeElement).toBe(item('CSV'));

    key(item('CSV'), 'Escape');
    key(item('Export'), ' ');
    expect(document.activeElement).toBe(item('CSV'));
  });

  it('walks the submenu with the arrows, not the menu under it', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');

    key(item('CSV'), 'ArrowDown');
    expect(document.activeElement).toBe(item('PDF'));
    key(item('PDF'), 'ArrowDown');
    expect(document.activeElement).toBe(item('CSV'));
    key(item('CSV'), 'End');
    expect(document.activeElement).toBe(item('PDF'));
    key(item('PDF'), 'Home');
    expect(document.activeElement).toBe(item('CSV'));
  });

  it('keeps the arrows in the root menu while a hover-opened submenu sits on top', async () => {
    await openRoot();
    pointer(item('Export'), 'mouseenter');
    wait(150);

    key(item('New'), 'ArrowDown');
    expect(document.activeElement).toBe(item('Export'));
    expect(submenuOf('Export')).not.toBeNull();
  });

  it('closes on ArrowLeft and hands focus back to its item', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');

    const event = key(item('CSV'), 'ArrowLeft');

    expect(event.defaultPrevented).toBe(true);
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
    expect(item('Export').getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape one level at a time', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');

    key(item('CSV'), 'Escape');
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
    expect(fixture.componentInstance.events).toEqual(['opened']);

    key(item('Export'), 'Escape');
    expect(panes()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
    expect(fixture.componentInstance.events).toEqual(['opened', 'closed']);
  });

  it('leaves ArrowLeft alone in the root menu', async () => {
    await openRoot();

    expect(key(item('New'), 'ArrowLeft').defaultPrevented).toBe(false);
    expect(key(item('New'), 'ArrowRight').defaultPrevented).toBe(false);
    expect(panes()).toHaveLength(1);
  });

  it('swaps the two arrows under RTL', async () => {
    TestBed.inject(Directionality).valueSignal.set('rtl');
    await openRoot();
    item('Export').focus();

    key(item('Export'), 'ArrowRight');
    expect(panes()).toHaveLength(1);

    key(item('Export'), 'ArrowLeft');
    expect(document.activeElement).toBe(item('CSV'));
    expect(panes()[1].parentElement!.getAttribute('dir')).toBe('rtl');

    key(item('CSV'), 'ArrowLeft');
    expect(panes()).toHaveLength(2);

    key(item('CSV'), 'ArrowRight');
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
  });

  it('nests to a second level, and steps back out one level per key', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');
    key(item('CSV'), 'ArrowDown');
    key(item('PDF'), 'ArrowRight');

    expect(panes()).toHaveLength(3);
    expect(labels(submenuOf('PDF'))).toEqual(['A4', 'Letter']);
    expect(submenuOf('PDF')!.getAttribute('aria-labelledby')).toBe(item('PDF').id);
    expect(document.activeElement).toBe(item('A4'));

    key(item('A4'), 'ArrowLeft');
    expect(panes()).toHaveLength(2);
    expect(document.activeElement).toBe(item('PDF'));

    key(item('PDF'), 'ArrowLeft');
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
  });

  it('closes the levels below it when a parent submenu closes', async () => {
    await openRoot();
    click(item('Export'));
    click(item('PDF'));
    item('A4').focus();
    expect(panes()).toHaveLength(3);

    key(item('CSV'), 'Escape');

    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
  });

  it('closes every submenu when a leaf is chosen, and leaves the root menu to its own rule', async () => {
    await openRoot();
    click(item('Export'));
    click(item('PDF'));
    item('A4').focus();

    click(item('A4'));

    expect(fixture.componentInstance.picked).toEqual(['a4']);
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
    // The root menu has no close-on-select: it stays until `close()`.
    expect(fixture.componentInstance.events).toEqual(['opened']);
  });

  it('chooses a leaf from the keyboard the same way', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');

    key(item('CSV'), 'Enter');

    expect(fixture.componentInstance.picked).toEqual(['csv']);
    expect(panes()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Export'));
  });

  it('closes with the root menu, which reports itself once', async () => {
    await openRoot();
    click(item('Export'));
    click(item('PDF'));
    item('A4').focus();

    fixture.debugElement.children[0].injector.get(WrDropdown).close();
    fixture.detectChanges();

    expect(panes()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
    expect(fixture.componentInstance.events).toEqual(['opened', 'closed']);
  });

  it('closes the whole chain on a click outside', async () => {
    await openRoot();
    click(item('Export'));
    click(item('PDF'));

    click((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.elsewhere')!);

    expect(panes()).toHaveLength(0);
    expect(fixture.componentInstance.events).toEqual(['opened', 'closed']);
  });

  it('treats a click in a submenu as inside every menu under it', async () => {
    await openRoot();
    click(item('Export'));
    click(submenuOf('Export')!);

    expect(panes()).toHaveLength(2);

    // A click back in the root menu is outside the submenu only.
    click(item('New'));
    expect(panes()).toHaveLength(1);
    expect(fixture.componentInstance.events).toEqual(['opened']);
  });

  it('closes on Tab from inside a submenu, from the trigger', async () => {
    await openRoot();
    item('Export').focus();
    key(item('Export'), 'ArrowRight');

    key(item('CSV'), 'Tab');

    expect(panes()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
  });

  it('opens nothing from a disabled item', async () => {
    await openRoot();
    const archive = item('Archive');

    key(archive, 'ArrowRight');
    key(archive, 'Enter');
    pointer(archive, 'mouseenter');
    wait(500);

    expect(panes()).toHaveLength(1);
    expect(archive.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps a hover menu open while the pointer is in a submenu, and closes it once it has left them all', () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();
    pointer(trigger(), 'mouseenter');
    pointer(item('Export'), 'mouseenter');
    wait(150);
    const [root, submenu] = panes();

    pointer(root, 'mouseleave', item('CSV'));
    expect(panes()).toHaveLength(2);

    pointer(submenu, 'mouseleave', document.body);
    expect(panes()).toHaveLength(0);
    expect(fixture.componentInstance.events).toEqual(['opened', 'closed']);
  });

  it('takes its submenu with it when the view goes', async () => {
    await openRoot();
    click(item('Export'));

    fixture.destroy();

    expect(panes()).toHaveLength(0);
  });
});
