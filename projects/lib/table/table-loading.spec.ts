import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns, WrTableLoadingMode } from './types';

const COLUMNS: WrTableColumns = { name: { title: 'Name' }, role: { title: 'Role' } };
const ROWS = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Linus', role: 'user' },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      [columns]="columns"
      [items]="items()"
      [loading]="loading()"
      [loadingMode]="mode()"
      loadingLabel="Refreshing"
    />
  `,
})
class Host {
  protected readonly columns = COLUMNS;
  readonly items = signal<readonly Record<string, unknown>[] | null>([]);
  readonly loading = signal(true);
  readonly mode = signal<WrTableLoadingMode>('auto');
}

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" loading />`,
})
class DefaultHost {
  protected readonly columns = COLUMNS;
  protected readonly items = ROWS;
}

describe('WrTable loading modes', () => {
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const overlay = (): HTMLElement | null => host().querySelector('.wr-table__loading');
  const bar = (): HTMLElement | null => host().querySelector('.wr-table__loading-bar');

  /** Which of the two forms is drawn, for one mode over empty or filled items. */
  function drawn(mode: WrTableLoadingMode, rows: readonly Record<string, unknown>[] | null): string {
    fixture.componentInstance.mode.set(mode);
    fixture.componentInstance.items.set(rows);
    fixture.detectChanges();
    return [overlay() ? 'overlay' : '', bar() ? 'bar' : ''].filter(Boolean).join('+');
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each<[WrTableLoadingMode, 'empty' | 'null' | 'filled', string]>([
    ['auto', 'empty', 'overlay'],
    ['auto', 'null', 'overlay'],
    ['auto', 'filled', 'bar'],
    ['overlay', 'empty', 'overlay'],
    ['overlay', 'filled', 'overlay'],
    ['bar', 'empty', 'bar'],
    ['bar', 'filled', 'bar'],
  ])('%s over %s items draws the %s', (mode, items, form) => {
    expect(drawn(mode, items === 'filled' ? ROWS : items === 'null' ? null : [])).toBe(form);
  });

  it('is auto by default', () => {
    const other = TestBed.createComponent(DefaultHost);
    other.detectChanges();
    const el = other.nativeElement as HTMLElement;

    expect(el.querySelector('.wr-table__loading')).toBeNull();
    expect(el.querySelector('.wr-table__loading-bar')).not.toBeNull();
  });

  it('moves from the overlay to the bar when the first rows arrive', () => {
    expect(drawn('auto', [])).toBe('overlay');
    expect(drawn('auto', ROWS)).toBe('bar');
  });

  it('draws neither once loading ends', () => {
    fixture.componentInstance.loading.set(false);

    expect(drawn('auto', ROWS)).toBe('');
    expect(drawn('overlay', ROWS)).toBe('');
    expect(drawn('bar', [])).toBe('');
  });

  it('leaves nothing over the rows in bar form, so a row click lands on the row', () => {
    drawn('bar', ROWS);
    const cell = host().querySelector<HTMLElement>('tbody td')!;
    let landed: EventTarget | null = null;
    host().addEventListener('click', event => (landed = event.target));
    cell.click();

    expect(overlay()).toBeNull();
    expect(landed).toBe(cell);
    // The bar is a sibling of the scroll area, not an ancestor of any row.
    expect(bar()!.contains(cell)).toBe(false);
    expect(bar()!.childElementCount).toBe(0);
  });

  it.each<WrTableLoadingMode>(['auto', 'overlay', 'bar'])('marks the table busy in %s mode', mode => {
    drawn(mode, ROWS);
    expect(host().getAttribute('aria-busy')).toBe('true');

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    expect(host().getAttribute('aria-busy')).toBeNull();
  });

  it('names both forms with the loading label', () => {
    drawn('overlay', ROWS);
    expect(overlay()!.getAttribute('role')).toBe('status');
    expect(overlay()!.getAttribute('aria-label')).toBe('Refreshing');

    drawn('bar', ROWS);
    expect(bar()!.getAttribute('role')).toBe('status');
    expect(bar()!.getAttribute('aria-label')).toBe('Refreshing');
  });

  it('keeps the "no data" row out while a bar runs over an empty table', () => {
    drawn('bar', []);
    expect(host().querySelector('.wr-table__empty')).toBeNull();
  });
});

/**
 * What jsdom cannot show, held against the compiled CSS as `stylesheet.spec.ts`
 * does: that the bar takes no pointer, sits on its hooks and is slowed, not
 * stopped, under reduced motion by the theme's shared block.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const css = sass
  .compileString(`@use 'table/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
  .css.replace(/\/\*[\s\S]*?\*\//g, '');

function rule(selector: string, from = css): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...from.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
    .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
    .map(([, , body]) => body)
    .join('\n');
}

describe('the loading bar in the compiled sheet', () => {
  it('takes no pointer and sits above the sticky header cells', () => {
    const body = rule('.wr-table__loading-bar');
    expect(body).toMatch(/pointer-events: none/);
    expect(body).toMatch(/z-index: 4/);
    expect(body).toMatch(/inset-block-start: 0/);
    expect(body).toMatch(/height: var\(--wr-table-loading-bar-height\)/);
    expect(body).toMatch(/background: var\(--wr-table-loading-bar-track\)/);
  });

  it('paints and times the sweep through its hooks', () => {
    const body = rule('.wr-table__loading-bar::after');
    expect(body).toMatch(/background: var\(--wr-table-loading-bar-color\)/);
    expect(body).toMatch(/animation: wr-table-loading-bar var\(--wr-table-loading-bar-duration\)/);
    expect(css).toMatch(/@keyframes wr-table-loading-bar\b/);
  });

  it.each([
    ['--wr-table-loading-bar-color', 'var(--wr-color-primary)'],
    ['--wr-table-loading-bar-height', '0.125rem'],
    ['--wr-table-loading-bar-duration', '1.4s'],
  ])('declares %s on the block', (hook, value) => {
    expect(rule('.wr-table')).toContain(`${hook}: ${value};`);
  });

  it('slows the sweep under reduced motion instead of stopping it', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const body = rule('.wr-table__loading-bar::after', reduced);
    expect(body).toMatch(/animation-duration: 4s !important/);
    expect(body).not.toMatch(/animation: none/);
  });
});
