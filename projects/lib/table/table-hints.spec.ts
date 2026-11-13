import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import type { WrTableColumns, WrTableTruncate } from './types';

const LONG = 'A very long note that does not fit its column';

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', sortable: true, headerHint: 'Full name as in the passport' },
  role: {
    title: 'Role',
    headerHint: 'What the account may do',
    filterItems: [{ title: 'Admin', value: 'admin' }],
  },
  alarm: {
    title: '',
    headerHint: 'Alarm level',
    sortable: true,
    filterItems: [{ title: 'High', value: 'high' }],
  },
  note: { title: 'Note', sortable: true, width: 120 },
  link: { title: 'Link', width: 80 },
};

const ROWS = [
  { id: 1, name: 'Ada', role: 'admin', alarm: 'high', note: LONG, link: 'Profile of Ada Lovelace' },
  { id: 2, name: 'Linus', role: 'user', alarm: 'low', note: 'Short', link: 'Profile of Linus' },
];

@Component({
  imports: [WrTable, WrTableCell],
  template: `
    <wr-table [columns]="columns()" [items]="items()" [truncate]="truncate()">
      <ng-template wrTableCell="link" let-value>
        <a class="t-link" href="#profile">{{ value }}</a>
      </ng-template>
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>(COLUMNS);
  readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
  readonly truncate = signal<WrTableTruncate | null>(null);
}

describe('WrTable header hints and truncated cells', () => {
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const th = (index: number): HTMLElement => host().querySelectorAll<HTMLElement>('thead th')[index];
  const cell = (row: number, column: number): HTMLElement =>
    host().querySelectorAll<HTMLElement>('tbody tr')[row].querySelectorAll<HTMLElement>('td')[column];
  const tooltips = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')];
  const tooltipText = (): string | null => tooltips()[0]?.textContent?.trim() ?? null;

  /** Moves the clock past the tooltip's delays and draws what that changed. */
  function settle(): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
  }

  function hover(el: HTMLElement): void {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    settle();
  }

  function unhover(el: HTMLElement): void {
    el.dispatchEvent(new MouseEvent('mouseleave'));
    settle();
  }

  /** Focus as a Tab press moves it: the key first, which is what makes it a keyboard focus. */
  function tabTo(el: HTMLElement): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    settle();
  }

  /** jsdom lays nothing out, so a cut cell is one told it is narrower than its text. */
  function cut(el: HTMLElement, scrollWidth = 300, clientWidth = 120): void {
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  }

  function truncateAll(): void {
    fixture.componentInstance.truncate.set('tooltip');
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('headerHint', () => {
    it('shows the hint as a tooltip when the header is hovered', () => {
      expect(tooltips()).toEqual([]);

      hover(th(0));

      expect(tooltips()).toHaveLength(1);
      expect(tooltipText()).toBe('Full name as in the passport');
    });

    it('shows it for a hover that lands on something inside the header', () => {
      hover(th(1).querySelector<HTMLElement>('.wr-table__title')!);

      expect(tooltipText()).toBe('What the account may do');
    });

    it('hides it when the pointer leaves the header', () => {
      hover(th(0));
      unhover(th(0));

      expect(tooltips()).toEqual([]);
    });

    it('moves the one tooltip to the next header', () => {
      hover(th(0));
      hover(th(1));

      expect(tooltips()).toHaveLength(1);
      expect(tooltipText()).toBe('What the account may do');
    });

    it('shows nothing over a header with no hint', () => {
      hover(th(3));

      expect(tooltips()).toEqual([]);
    });

    it('shows it when the keyboard reaches the sort button, and hides it on blur', () => {
      const sort = th(0).querySelector<HTMLElement>('.wr-table__sort-btn')!;
      tabTo(sort);

      expect(tooltipText()).toBe('Full name as in the passport');

      sort.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      settle();

      expect(tooltips()).toEqual([]);
    });

    it('shows it when the keyboard reaches the filter trigger', () => {
      tabTo(th(1).querySelector<HTMLElement>('.wr-table-filter__trigger')!);

      expect(tooltipText()).toBe('What the account may do');
    });

    it('stays quiet for a focus the keyboard did not move', () => {
      // `buttons` and `detail` are what tell a real press from the synthetic one a
      // screen reader sends, which the CDK counts as keyboard.
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }));
      th(0)
        .querySelector<HTMLElement>('.wr-table__sort-btn')!
        .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      settle();

      expect(tooltips()).toEqual([]);
    });

    it('adds the hint to the names of the sort button and the filter trigger', () => {
      expect(th(0).querySelector('.wr-table__sort-btn')!.getAttribute('aria-label')).toBe(
        'Sort Name, Full name as in the passport'
      );
      expect(th(1).querySelector('.wr-table-filter__trigger')!.getAttribute('aria-label')).toBe(
        'Filter Role, What the account may do'
      );
    });

    it('leaves a column with no hint named by its title alone', () => {
      expect(th(3).querySelector('.wr-table__sort-btn')!.getAttribute('aria-label')).toBe('Sort Note');
      expect(th(3).getAttribute('aria-label')).toBeNull();
    });

    it('names an icon column, and its controls, by the hint', () => {
      expect(th(2).getAttribute('aria-label')).toBe('Alarm level');
      expect(th(2).querySelector('.wr-table__sort-btn')!.getAttribute('aria-label')).toBe('Sort Alarm level');
      expect(th(2).querySelector('.wr-table-filter__trigger')!.getAttribute('aria-label')).toBe('Filter Alarm level');
    });

    it('does not name a titled header a second time', () => {
      expect(th(0).getAttribute('aria-label')).toBeNull();
    });
  });

  describe('truncate', () => {
    it('marks every body cell when set on the table, and none by default', () => {
      expect(host().querySelector('.wr-table__td--truncate')).toBeNull();

      truncateAll();

      expect(host().querySelectorAll('tbody td.wr-table__td--truncate')).toHaveLength(10);
      expect(host().querySelector('thead .wr-table__td--truncate, tfoot .wr-table__td--truncate')).toBeNull();
    });

    it('lets the column win over the table, both ways', () => {
      fixture.componentInstance.columns.set({
        ...COLUMNS,
        name: { title: 'Name', truncate: 'tooltip' },
        note: { title: 'Note' },
      });
      fixture.detectChanges();

      expect(cell(0, 0).classList).toContain('wr-table__td--truncate');
      expect(cell(0, 3).classList).not.toContain('wr-table__td--truncate');

      fixture.componentInstance.columns.set({ ...COLUMNS, note: { title: 'Note', truncate: null } });
      truncateAll();

      expect(cell(0, 0).classList).toContain('wr-table__td--truncate');
      expect(cell(0, 3).classList).not.toContain('wr-table__td--truncate');

      cut(cell(0, 3));
      hover(cell(0, 3));

      expect(tooltips()).toEqual([]);
    });

    it('caps a truncated cell at its column width, so it can be cut in an auto layout', () => {
      truncateAll();

      expect(cell(0, 3).style.maxWidth).toBe('120px');
      expect(cell(0, 0).style.maxWidth).toBe('');
    });

    it('shows the full text of a cut cell on hover', () => {
      truncateAll();
      cut(cell(0, 3));
      hover(cell(0, 3));

      expect(tooltips()).toHaveLength(1);
      expect(tooltipText()).toBe(LONG);
    });

    it('shows nothing for a cell that fits', () => {
      truncateAll();
      cut(cell(1, 3), 100, 120);
      hover(cell(1, 3));
      cut(cell(1, 0), 120, 120);
      hover(cell(1, 0));

      expect(tooltips()).toEqual([]);
    });

    it('shows nothing for a cut cell that is not truncating', () => {
      cut(cell(0, 3));
      hover(cell(0, 3));

      expect(tooltips()).toEqual([]);
    });

    it('shows it when the keyboard reaches something in a cut cell', () => {
      truncateAll();
      cut(cell(0, 4));
      tabTo(cell(0, 4).querySelector<HTMLElement>('.t-link')!);

      expect(tooltipText()).toBe('Profile of Ada Lovelace');
    });

    it('hides it when the pointer leaves, and measures again on the way back', () => {
      truncateAll();
      cut(cell(0, 3));
      hover(cell(0, 3));
      unhover(cell(0, 3));
      expect(tooltips()).toEqual([]);

      // The column was widened in between: the same cell now fits.
      cut(cell(0, 3), 120, 120);
      hover(cell(0, 3));
      expect(tooltips()).toEqual([]);
    });

    it('moves from a cut cell to a header hint with one tooltip', () => {
      truncateAll();
      cut(cell(0, 3));
      hover(cell(0, 3));
      hover(th(0));

      expect(tooltips()).toHaveLength(1);
      expect(tooltipText()).toBe('Full name as in the passport');
    });

    it('closes the tooltip of a row that is removed under the pointer', () => {
      truncateAll();
      cut(cell(1, 3));
      hover(cell(1, 3));
      expect(tooltips()).toHaveLength(1);

      fixture.componentInstance.items.set([ROWS[0]]);
      settle();

      expect(tooltips()).toEqual([]);
    });
  });

  it('writes no title attribute, before or after a tooltip', () => {
    truncateAll();
    expect(host().querySelectorAll('[title]')).toHaveLength(0);

    cut(cell(0, 3));
    hover(cell(0, 3));
    hover(th(0));

    expect(host().querySelectorAll('[title]')).toHaveLength(0);
    expect(document.querySelectorAll('.wr-overlay-container [title]')).toHaveLength(0);
  });

  it('creates no tooltip in a large table until a cell is hovered, and then one', () => {
    fixture.componentInstance.items.set(
      Array.from({ length: 400 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        role: 'user',
        alarm: 'low',
        note: LONG,
        link: 'x',
      }))
    );
    truncateAll();
    settle();

    expect(host().querySelectorAll('tbody td.wr-table__td--truncate')).toHaveLength(2000);
    expect(host().querySelectorAll('.wr-popover-trigger')).toHaveLength(0);
    expect(tooltips()).toEqual([]);

    cut(cell(300, 3));
    hover(cell(300, 3));

    expect(host().querySelectorAll('.wr-popover-trigger')).toHaveLength(1);
    expect(tooltips()).toHaveLength(1);
  });
});

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" />`,
})
class PlainHost {
  protected readonly columns: WrTableColumns = { name: { title: 'Name' } };
  protected readonly items = ROWS;
}

describe('WrTable with no hint and no truncation', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('listens for no hover at all', () => {
    const fixture = TestBed.createComponent(PlainHost);
    const table = (fixture.nativeElement as HTMLElement).querySelector('wr-table')!;
    const added = vi.spyOn(table, 'addEventListener');
    fixture.detectChanges();

    expect(added.mock.calls.map(([type]) => type)).not.toContain('mouseover');
    fixture.destroy();
  });
});

const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

describe('a truncating cell in the compiled sheet', () => {
  it('stays on one line behind an ellipsis', () => {
    const body = /\.wr-table__td--truncate \{([^}]*)\}/.exec(css)?.[1] ?? '';

    expect(body).toMatch(/overflow: hidden/);
    expect(body).toMatch(/text-overflow: ellipsis/);
    expect(body).toMatch(/white-space: nowrap/);
  });

  it('brings the tooltip styles with the table entry', () => {
    expect(css).toMatch(/\.wr-tooltip-overlay/);
  });
});
