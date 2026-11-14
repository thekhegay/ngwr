import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeChildrenLoader, WrTreeNode } from './types';

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'app', label: 'app', children: [{ id: 'main', label: 'main.ts' }] },
      { id: 'styles', label: 'styles.css' },
    ],
  },
  { id: 'scripts', label: 'Scripts', children: [{ id: 'setup', label: 'setup.sh' }] },
  { id: 'remote', label: 'remote', hasChildren: true },
  { id: 'readme', label: 'README.md' },
  { id: 'license', label: 'LICENSE' },
  { id: 'locked', label: 'node_modules', disabled: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      draggable="true"
      [nodes]="nodes"
      [virtualScroll]="virtual()"
      [loadChildren]="loader"
      [(expanded)]="expanded"
      [(selected)]="selected"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly virtual = signal(false);
  readonly expanded = signal<readonly string[]>(['src']);
  readonly selected = signal<readonly string[]>([]);
  /** Never settles, so the branch keeps its loading row. */
  readonly loader: WrTreeChildrenLoader = () => new Promise(() => undefined);
}

/** Type-to-jump in a tree: the cursor is the row holding `tabindex="0"`. */
describe('WrTree typeahead', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let clock = 10_000;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('.wr-tree__list')!;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-tree__row'));
  const label = (el: HTMLElement): string => el.querySelector('.wr-tree__label')!.textContent.trim();
  const cursor = (): string => label(rows().find(row => row.getAttribute('tabindex') === '0')!);
  const render = (): void => {
    fixture.detectChanges();
    fixture.detectChanges();
  };
  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    list().dispatchEvent(event);
    render();
    return event;
  };
  /** Longer than the pause that ends a run. */
  const pause = (): void => {
    clock += 1_000;
  };

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    render();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('moves the cursor to the next visible row that starts with the letter', async () => {
    expect(cursor()).toBe('src');

    const event = press('l');
    expect(event.defaultPrevented).toBe(true);
    expect(cursor()).toBe('LICENSE');
    // Real focus follows the tab stop a render later.
    await fixture.whenStable();
    expect(document.activeElement).toBe(rows().find(row => label(row) === 'LICENSE'));
    expect(host.selected()).toEqual([]);
  });

  it('cycles through one letter over the visible rows only, and opens nothing', () => {
    press('s');
    expect(cursor()).toBe('styles.css');
    press('s');
    // "setup.sh" sits in a closed branch.
    expect(cursor()).toBe('Scripts');
    press('s');
    expect(cursor()).toBe('src');
    expect(host.expanded()).toEqual(['src']);
  });

  it('spells a run of letters, and starts over after a pause', () => {
    press('r');
    expect(cursor()).toBe('remote');
    press('e');
    press('a');
    expect(cursor()).toBe('README.md');

    pause();
    press('a');
    expect(cursor()).toBe('app');
  });

  it('stops on a disabled node, as the arrows do', () => {
    press('n');
    expect(cursor()).toBe('node_modules');
  });

  it('skips the loading row of a branch', () => {
    press('r');
    expect(cursor()).toBe('remote');
    press('ArrowRight');
    expect(root().querySelector('.wr-tree__status')).not.toBeNull();

    pause();
    press('r');
    expect(cursor()).toBe('README.md');
  });

  it('leaves a chord and a letter nothing starts with alone', () => {
    expect(press('l', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(cursor()).toBe('src');
    press('z');
    expect(cursor()).toBe('src');
  });

  it('Space joins a run that has started, and selects otherwise', () => {
    press('l');
    expect(press(' ').defaultPrevented).toBe(true);
    expect(host.selected()).toEqual([]);

    pause();
    press(' ');
    expect(host.selected()).toEqual(['license']);
  });

  it('Enter still selects', () => {
    press('l');
    press('Enter');
    expect(host.selected()).toEqual(['license']);
  });

  it('does not move the cursor while a keyboard move holds a row', () => {
    press('l');
    press('Enter', { altKey: true });
    const held = (): string | null => {
      const el = root().querySelector<HTMLElement>('.wr-tree__row--dragging');
      return el ? label(el) : null;
    };
    expect(held()).toBe('LICENSE');

    pause();
    press('s');
    expect(cursor()).toBe('LICENSE');
    expect(held()).toBe('LICENSE');
  });

  it('moves the active row of a windowed tree', () => {
    host.virtual.set(true);
    render();
    press('l');
    const id = list().getAttribute('aria-activedescendant')!;
    expect(label(root().querySelector<HTMLElement>(`#${id}`)!)).toBe('LICENSE');
  });
});
