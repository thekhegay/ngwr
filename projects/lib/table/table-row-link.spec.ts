import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import { WrTableEditCell } from './table-edit-cell';
import { WrTableExpand } from './table-expand';
import type { WrTableColumns, WrTableRowClick, WrTableRowLink } from './types';

interface User {
  id: number;
  name: string;
  role: string;
  reports?: User[];
}

const ROWS: User[] = [
  { id: 1, name: 'Ada', role: 'admin', reports: [{ id: 11, name: 'Tim', role: 'user' }] },
  { id: 2, name: 'Linus', role: 'user' },
  { id: 3, name: 'Grace', role: 'admin' },
];

@Component({
  imports: [WrTable, WrTableCell, WrTableEditCell, WrTableExpand],
  template: `
    <wr-table
      [columns]="columns()"
      [items]="items()"
      rowKey="id"
      [rowLink]="rowLink()"
      [rowSelection]="selection()"
      [childrenKey]="childrenKey()"
      [virtualScroll]="virtual()"
      [viewportHeight]="200"
      [truncate]="truncate()"
      (rowClick)="clicks.push($event)"
    >
      <ng-template wrTableCell="tools">
        <button type="button" class="t-button">Edit</button>
        <a class="t-link" href="#profile">Profile</a>
      </ng-template>
      @if (editor()) {
        <ng-template wrTableEditCell="role" let-value>
          <input class="t-editor" [value]="value" />
        </ng-template>
      }
      @if (detail()) {
        <ng-template wrTableExpand let-row>
          <p class="t-detail">{{ row.name }}</p>
        </ng-template>
      }
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns<User>>({
    name: { title: 'Name' },
    role: { title: 'Role' },
    tools: { title: '', actions: true },
  });
  readonly items = signal<readonly User[]>(ROWS);
  readonly rowLink = signal<WrTableRowLink<User> | null>(user => `/users/${user.id}`);
  readonly selection = signal<'multiple' | null>(null);
  readonly childrenKey = signal<string | null>(null);
  readonly virtual = signal(false);
  readonly truncate = signal<'tooltip' | null>(null);
  readonly editor = signal(false);
  readonly detail = signal(false);
  readonly clicks: WrTableRowClick<User>[] = [];
}

/** A table nobody listens to: no `rowClick`, and a link only where asked. */
@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" [rowLink]="rowLink()" />`,
})
class QuietHost {
  protected readonly columns: WrTableColumns<User> = { name: { title: 'Name' }, role: { title: 'Role' } };
  protected readonly items = ROWS;
  readonly rowLink = signal<WrTableRowLink<User> | null>(null);
}

const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of every rule whose selector list contains `selector`, joined. */
function declarations(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
    .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
    .map(([, , body]) => body)
    .join('\n');
}

describe('WrTable rowLink', () => {
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const rows = (): HTMLElement[] => [...host().querySelectorAll<HTMLElement>('tbody tr.wr-table__tr')];
  const links = (): HTMLAnchorElement[] => [...host().querySelectorAll<HTMLAnchorElement>('.wr-table__row-link')];
  const set = (change: (host: Host) => void): void => {
    change(fixture.componentInstance);
    fixture.detectChanges();
  };
  function click(el: Element, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // jsdom cannot navigate: stop the default of a click on a row link, and of no other.
    host().addEventListener('click', event => {
      if ((event.target as Element).closest('.wr-table__row-link')) event.preventDefault();
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders one real link per row, with the href the function gave', () => {
    expect(links().map(a => a.getAttribute('href'))).toEqual(['/users/1', '/users/2', '/users/3']);
    for (const row of rows()) {
      expect(row.querySelectorAll('.wr-table__row-link')).toHaveLength(1);
      expect(row.classList).toContain('wr-table__tr--link');
    }
  });

  it('is reachable from the keyboard: a native anchor in the tab order', () => {
    const link = links()[0];

    expect(link.tagName).toBe('A');
    expect(link.hasAttribute('tabindex')).toBe(false);
    expect(link.closest('[aria-hidden], [inert]')).toBeNull();
    link.focus();
    expect(document.activeElement).toBe(link);
  });

  it('names the link by the row label cell', () => {
    const link = links()[1];
    const label = document.getElementById(link.getAttribute('aria-labelledby')!)!;

    expect(label.tagName).toBe('TD');
    expect(label.parentElement).toBe(rows()[1]);
    expect(label.textContent.trim()).toBe('Linus');
  });

  it('keeps the link empty, so it wraps no control of a cell template', () => {
    expect(links()[0].childNodes).toHaveLength(0);
    expect(rows()[0].querySelector('.t-button')!.closest('a')).toBeNull();
  });

  it('gives no link, no class and no tint to a row the function returns null for', () => {
    set(h => h.rowLink.set(user => (user.id === 2 ? null : `/users/${user.id}`)));

    expect(links().map(a => a.getAttribute('href'))).toEqual(['/users/1', '/users/3']);
    expect(rows().map(row => row.classList.contains('wr-table__tr--link'))).toEqual([true, false, true]);
  });

  it('follows a change of the function', () => {
    set(h => h.rowLink.set(user => `/people/${user.name}`));

    expect(links()[0].getAttribute('href')).toBe('/people/Ada');
  });

  it('renders no link for router commands without the adapter, and says so', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    set(h => h.rowLink.set(user => ['/users', user.id]));

    expect(links()).toEqual([]);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('ngwr/table/router'));
    error.mockRestore();
  });

  it('does not fire rowClick for a click that follows the link', () => {
    click(links()[0]);
    expect(fixture.componentInstance.clicks).toEqual([]);

    // A row without a link in the same table still clicks.
    set(h => h.rowLink.set(user => (user.id === 2 ? null : `/users/${user.id}`)));
    click(rows()[1].querySelector('td')!);
    expect(fixture.componentInstance.clicks.map(c => c.row)).toEqual([ROWS[1]]);
  });

  it('puts the selection checkbox, the tree toggle and the detail button beside the link, each working', () => {
    set(h => h.selection.set('multiple'));
    click(rows()[0].querySelector('.wr-table__td--select input')!);
    fixture.detectChanges();
    expect(rows()[0].classList).toContain('wr-table__tr--selected');
    expect(rows()[0].querySelector('.wr-table__td--select .wr-table__row-link')).toBeNull();

    set(h => h.detail.set(true));
    click(rows()[0].querySelector('.wr-table__expand-btn')!);
    fixture.detectChanges();
    expect(host().querySelector('.t-detail')!.textContent).toBe('Ada');
    // The detail row is a row of its own and carries no link.
    expect(host().querySelector('.wr-table__detail-row .wr-table__row-link')).toBeNull();
    expect(links()).toHaveLength(3);
  });

  it('leaves an editable cell its own double click', () => {
    set(h => h.editor.set(true));
    const cell = rows()[0].querySelector<HTMLElement>('.wr-table__td--editable')!;
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();

    expect(cell.querySelector('.t-editor')).not.toBeNull();
    expect(cell.querySelector('.wr-table__row-link')).toBeNull();
    expect(links()).toHaveLength(3);
  });

  it('links child rows in tree mode, and names each by the tree column', () => {
    set(h => h.childrenKey.set('reports'));
    click(rows()[0].querySelector('button.wr-table__tree-toggle')!);
    fixture.detectChanges();

    expect(links().map(a => a.getAttribute('href'))).toEqual(['/users/1', '/users/11', '/users/2', '/users/3']);
    expect(document.getElementById(links()[1].getAttribute('aria-labelledby')!)!.textContent.trim()).toBe('Tim');
  });

  it('makes the tree row the only tab stop, and Enter on it follows the link', () => {
    set(h => h.childrenKey.set('reports'));
    expect(links().every(a => a.getAttribute('tabindex') === '-1')).toBe(true);

    const seen: string[] = [];
    host().addEventListener('click', event => {
      const a = (event.target as Element).closest('.wr-table__row-link');
      if (a) seen.push(a.getAttribute('href')!);
    });
    const press = (key: string): void => {
      rows()[1].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };
    press('Enter');
    expect(seen).toEqual(['/users/2']);
    press(' ');
    expect(seen).toEqual(['/users/2']);
  });

  it('logs the missing routing adapter once per table, not once per row', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      set(h => h.rowLink.set(user => ['/users', user.id]));
      set(h => h.items.set([...ROWS]));
      expect(error).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
    }
  });

  it('keeps the link out of a pinned cell, which would hold it inside its own box', () => {
    set(h =>
      h.columns.set({
        name: { title: 'Name', pin: 'left', width: 120 },
        role: { title: 'Role' },
        tools: { title: '', actions: true, pin: 'right', width: 120 },
      })
    );
    const link = links()[0];

    expect(link.closest('td')!.classList).not.toContain('wr-table__td--pin-left');
    expect(link.closest('td')!.getAttribute('data-label')).toBe('Role');
    // Still named by the label cell, the pinned one.
    expect(document.getElementById(link.getAttribute('aria-labelledby')!)!.textContent.trim()).toBe('Ada');
  });

  it('hands a click on a cut cell down to the link, with its modifier keys', () => {
    set(h => h.truncate.set('tooltip'));
    const seen: MouseEvent[] = [];
    links()[0].addEventListener('click', event => seen.push(event));
    const cell = rows()[0].querySelector('.wr-table__td--truncate')!;
    click(cell, { metaKey: true });

    expect(seen).toHaveLength(1);
    expect(seen[0].metaKey).toBe(true);
    expect(fixture.componentInstance.clicks).toEqual([]);
  });

  it('renders links for the rendered rows of a virtualized body only', () => {
    let calls = 0;
    set(h => {
      h.items.set(Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, role: 'user' })));
      h.virtual.set(true);
      h.rowLink.set(user => {
        calls++;
        return `/users/${user.id}`;
      });
    });

    expect(host().classList).toContain('wr-table--virtual');
    expect(rows().length).toBeLessThan(500);
    expect(links()).toHaveLength(rows().length);
    expect(calls).toBeLessThan(500);
    expect(links()[0].getAttribute('href')).toBe('/users/1');
  });
});

describe('WrTable row tint', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('marks no row of a table that links nowhere and listens to no click', () => {
    const fixture = TestBed.createComponent(QuietHost);
    fixture.detectChanges();
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.wr-table__tr')];

    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.className).toBe('wr-table__tr');
  });

  it('marks linked rows, and only those', () => {
    const fixture = TestBed.createComponent(QuietHost);
    fixture.componentInstance.rowLink.set(user => (user.id === 1 ? '/users/1' : null));
    fixture.detectChanges();
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.wr-table__tr')];

    expect(rows.map(row => row.className)).toEqual(['wr-table__tr wr-table__tr--link', 'wr-table__tr', 'wr-table__tr']);
  });

  it('marks every row while rowClick is bound', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rowLink.set(null);
    fixture.detectChanges();
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.wr-table__tr')];

    for (const row of rows) expect(row.className).toBe('wr-table__tr wr-table__tr--clickable');
  });

  it('tints on hover through the two marks, never a bare row', () => {
    expect(declarations('.wr-table__tr--link:hover')).toMatch(/background: var\(--wr-table-row-hover\)/);
    expect(declarations('.wr-table__tr--clickable:hover')).toMatch(/background: var\(--wr-table-row-hover\)/);
    expect(declarations('.wr-table__tr:hover')).toBe('');
    expect(css).not.toMatch(/\.wr-table__tr:hover \.wr-table__td--pin/);
  });
});

describe('the row link stylesheet', () => {
  it('stretches the link under the cells of its own row', () => {
    expect(declarations('.wr-table__tr--link')).toMatch(/position: relative/);
    // The row is a stacking context, so `-1` stays inside it.
    expect(declarations('.wr-table__tr--link')).toMatch(/z-index: 0/);
    const link = declarations('.wr-table__row-link');
    expect(link).toMatch(/position: absolute/);
    expect(link).toMatch(/inset: 0/);
    expect(link).toMatch(/z-index: -1/);
  });

  it('lets the pointer through plain cells and gives it back to controls', () => {
    expect(declarations('.wr-table__tr--link > .wr-table__td')).toMatch(/pointer-events: none/);
    for (const cell of ['select', 'expand', 'editable', 'editing', 'truncate']) {
      expect(declarations(`.wr-table__tr--link > .wr-table__td--${cell}`)).toMatch(/pointer-events: auto/);
    }
    const controls = /:where\(\.wr-table__tr--link\) > :where\(\.wr-table__td\) :where\(([^{]*)\)\s*\{([^}]*)\}/.exec(
      css
    );
    expect(controls?.[2]).toMatch(/pointer-events: auto/);
    for (const control of ['a[href]', 'button', 'input', 'label', '[wrTableIgnoreRowClick]', '.wr-table__actions']) {
      expect(controls?.[1]).toContain(control);
    }
  });

  it('draws the focus of the link as the ring of the row', () => {
    expect(declarations('.wr-table__row-link')).toMatch(/outline: none/);
    expect(declarations('.wr-table__tr:has(> td > .wr-table__row-link:focus-visible)')).toMatch(/outline/);
  });
});
