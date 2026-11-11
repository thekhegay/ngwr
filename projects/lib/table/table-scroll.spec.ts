import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', pin: 'left' },
  role: { title: 'Role' },
  seats: { title: 'Seats', summary: 'sum' },
};

const ROWS = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, role: 'user', seats: 1 }));

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      [columns]="columns"
      [items]="items()"
      rowKey="id"
      [stickyHeader]="sticky()"
      [virtualScroll]="virtual()"
      [viewportHeight]="height()"
      [pageSize]="pageSize()"
      [groupBy]="groupBy()"
      [rowSelection]="selection()"
    />
  `,
})
class ScrollHost {
  protected readonly columns = COLUMNS;
  readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
  readonly sticky = signal(true);
  readonly virtual = signal(false);
  readonly height = signal<number | string>(320);
  readonly pageSize = signal(0);
  readonly groupBy = signal<string | null>(null);
  readonly selection = signal<'multiple' | null>(null);
}

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" rowKey="id" [pageSize]="10" />`,
})
class DefaultHost {
  protected readonly columns = COLUMNS;
  protected readonly items = ROWS;
}

describe('WrTable with its own scroll area', () => {
  let fixture: ComponentFixture<ScrollHost>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const scroll = (): HTMLElement => host().querySelector<HTMLElement>('.wr-table__scroll')!;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ScrollHost);
    fixture.detectChanges();
  });

  it('marks the host, and makes the scroll area a tab stop', () => {
    expect(host().classList.contains('wr-table--sticky-head')).toBe(true);
    expect(host().classList.contains('wr-table--virtual')).toBe(false);
    expect(scroll().getAttribute('tabindex')).toBe('0');
    expect(scroll().querySelector('thead th')).not.toBeNull();
  });

  it('renders every row, since nothing is windowed', () => {
    expect(host().querySelectorAll('.wr-table__tr')).toHaveLength(ROWS.length);
    expect(host().querySelector('.wr-table__spacer')).toBeNull();
  });

  it('hands a numeric height to the hook in px, and a CSS length as written', () => {
    expect(scroll().style.getPropertyValue('--wr-table-scroll-height')).toBe('320px');

    fixture.componentInstance.height.set('60vh');
    fixture.detectChanges();
    expect(scroll().style.getPropertyValue('--wr-table-scroll-height')).toBe('60vh');
    expect(host().classList.contains('wr-table--fill')).toBe(false);
  });

  it('fills the parent on `fill`, and leaves the height to the stylesheet', () => {
    fixture.componentInstance.height.set('fill');
    fixture.detectChanges();

    expect(host().classList.contains('wr-table--fill')).toBe(true);
    expect(scroll().style.getPropertyValue('--wr-table-scroll-height')).toBe('');
  });

  it('keeps the scroll area on a paged table, with the pager below it', () => {
    fixture.componentInstance.pageSize.set(10);
    fixture.detectChanges();

    const pager = host().querySelector<HTMLElement>('.wr-table__pager')!;
    expect(host().classList.contains('wr-table--sticky-head')).toBe(true);
    expect(host().querySelectorAll('.wr-table__tr')).toHaveLength(10);
    expect(scroll().contains(pager)).toBe(false);
    expect(scroll().nextElementSibling).toBe(pager);
  });

  it('keeps it when grouped and with selection, where virtualization gives up', () => {
    fixture.componentInstance.virtual.set(true);
    fixture.componentInstance.groupBy.set('role');
    fixture.componentInstance.selection.set('multiple');
    fixture.detectChanges();

    expect(host().classList.contains('wr-table--virtual')).toBe(false);
    expect(host().classList.contains('wr-table--sticky-head')).toBe(true);
    expect(host().querySelector('.wr-table__group-row')).not.toBeNull();
    expect(host().querySelector('.wr-table__th--select')).not.toBeNull();
  });

  it('is what a virtualized table scrolls in too', () => {
    fixture.componentInstance.sticky.set(false);
    fixture.componentInstance.virtual.set(true);
    fixture.detectChanges();

    expect(host().classList.contains('wr-table--virtual')).toBe(true);
    expect(host().classList.contains('wr-table--sticky-head')).toBe(true);
    expect(scroll().style.getPropertyValue('--wr-table-scroll-height')).toBe('320px');
    expect(scroll().style.maxHeight).toBe('');
  });

  it('drops all of it when the input goes off', () => {
    fixture.componentInstance.sticky.set(false);
    fixture.detectChanges();

    expect(host().className).toBe('wr-table');
    expect(scroll().hasAttribute('tabindex')).toBe(false);
    expect(scroll().getAttribute('style') ?? '').toBe('');
  });
});

describe('WrTable measuring its sticky edges', () => {
  let fixture: ComponentFixture<ScrollHost>;
  let offsetHeight: PropertyDescriptor | undefined;
  const observers: { targets: Element[]; disconnected: boolean }[] = [];

  const scroll = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-table__scroll')!;

  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record = { targets: [] as Element[], disconnected: false };
        constructor() {
          observers.push(this.record);
        }
        observe(target: Element): void {
          this.record.targets.push(target);
        }
        disconnect(): void {
          this.record.disconnected = true;
        }
      }
    );
    // jsdom lays nothing out: the header is 44px tall and the footer 36px.
    offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.tagName === 'THEAD' ? 44 : this.tagName === 'TFOOT' ? 36 : 0;
      },
    });

    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ScrollHost);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
  });

  it('publishes the header and footer heights the scroll padding reads', () => {
    expect(scroll().style.getPropertyValue('--wr-table-head-height')).toBe('44px');
    expect(scroll().style.getPropertyValue('--wr-table-foot-height')).toBe('36px');
  });

  it('stops observing when the table is destroyed', () => {
    const live = observers.filter(o => o.targets.some(t => t.tagName === 'THEAD'));
    expect(live.length).toBeGreaterThan(0);

    fixture.destroy();
    expect(live.every(o => o.disconnected)).toBe(true);
  });

  it('measures nothing while the table does not scroll', () => {
    fixture.componentInstance.sticky.set(false);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(scroll().style.getPropertyValue('--wr-table-head-height')).toBe('');
    expect(observers.filter(o => o.targets.some(t => t.tagName === 'THEAD')).every(o => o.disconnected)).toBe(true);
  });
});

describe('WrTable without `stickyHeader`', () => {
  it('renders no scroll-area class, tab stop or inline hook', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(DefaultHost);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
    const scroll = host.querySelector<HTMLElement>('.wr-table__scroll')!;

    expect(host.className).toBe('wr-table');
    expect(scroll.hasAttribute('tabindex')).toBe(false);
    expect(scroll.hasAttribute('style')).toBe(false);
    expect(host.querySelector('.wr-table__pager')).not.toBeNull();
  });
});

/**
 * What only the compiled sheet can show, as `stylesheet.spec.ts` holds it: jsdom
 * has no layout and no stacking.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const css = sass
  .compileString(`@use 'table/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
  .css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of every rule whose selector list contains `selector`, joined. */
function declarations(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
    .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
    .map(([, , body]) => body)
    .join('\n');
}

const zIndex = (body: string): number => Number(/z-index: (\d+)/.exec(body)![1]);

describe('the scroll area in the compiled stylesheet', () => {
  const OPAQUE_HEAD = [
    /background-color: var\(--wr-table-bg\)/,
    /background-image: linear-gradient\(var\(--wr-table-head-bg\), var\(--wr-table-head-bg\)\)/,
  ];

  it('scrolls the rows inside the height hook', () => {
    const body = declarations('.wr-table--sticky-head .wr-table__scroll');
    expect(body).toMatch(/overflow-y: auto/);
    expect(body).toMatch(/max-height: var\(--wr-table-scroll-height\)/);
  });

  it('keeps a focused row clear of the sticky header and footer', () => {
    const body = declarations('.wr-table--sticky-head .wr-table__scroll');
    expect(body).toMatch(/scroll-padding-block-start: var\(--wr-table-head-height\)/);
    expect(body).toMatch(/scroll-padding-block-end: var\(--wr-table-foot-height\)/);
  });

  it('sticks every header cell to the top, over an opaque base', () => {
    const body = declarations('.wr-table--sticky-head thead th');
    expect(body).toMatch(/position: sticky/);
    expect(body).toMatch(/top: 0/);

    const plain = declarations(
      '.wr-table--sticky-head thead th:not(.wr-table__th--pin-left):not(.wr-table__th--pin-right)'
    );
    for (const rule of OPAQUE_HEAD) {
      expect(plain).toMatch(rule);
      expect(declarations('.wr-table__th--pin-left')).toMatch(rule);
    }
  });

  it('stacks the header above pinned body cells, and its pinned corner above the rest of it', () => {
    const pinnedBody = zIndex(declarations('.wr-table__td--pin-left'));
    const head = zIndex(declarations('.wr-table--sticky-head thead th'));
    const corner = zIndex(declarations('.wr-table--sticky-head .wr-table__th--pin-left'));
    const veil = zIndex(declarations('.wr-table--sticky-head .wr-table__loading'));

    expect(head).toBeGreaterThan(pinnedBody);
    expect(corner).toBeGreaterThan(head);
    expect(veil).toBeGreaterThan(corner);
  });

  it('sticks the summary footer to the bottom', () => {
    const body = declarations('.wr-table--sticky-head tfoot .wr-table__foot-cell');
    expect(body).toMatch(/position: sticky/);
    expect(body).toMatch(/bottom: 0/);
  });

  it('lets a filling table shrink to its parent, down to the floor', () => {
    const host = declarations('.wr-table--fill');
    expect(host).toMatch(/display: flex/);
    expect(host).toMatch(/flex-direction: column/);
    expect(host).toMatch(/max-height: 100%/);
    expect(host).toMatch(/min-height: var\(--wr-table-scroll-min-height\)/);

    const area = declarations('.wr-table--fill .wr-table__scroll');
    expect(area).toMatch(/min-height: 0/);
    expect(area).toMatch(/max-height: none/);
  });

  it('gives the hooks a value before the component writes one', () => {
    const root = declarations('.wr-table');
    for (const hook of ['scroll-height', 'scroll-min-height', 'head-height', 'foot-height']) {
      expect(root).toMatch(new RegExp(`--wr-table-${hook}: \\S+`));
    }
  });

  it('paints no sticky rule on a table that has not asked for one', () => {
    expect(declarations('.wr-table__scroll')).not.toMatch(/overflow-y|max-height|scroll-padding/);
    expect(declarations('.wr-table__th')).not.toMatch(/position: sticky/);
  });
});
