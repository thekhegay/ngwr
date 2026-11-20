import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns, WrTableSize } from './types';

/**
 * `size` is a host modifier and nothing else: the padding it stands for is the
 * stylesheet's (`stylesheet.spec.ts` reads it off the compiled CSS).
 */
describe('WrTable size', () => {
  @Component({
    imports: [WrTable],
    template: `
      <wr-table class="bound" [columns]="columns" [items]="items" [size]="size()" />
      <wr-table class="plain" [columns]="columns" [items]="items" />
      <wr-table class="static" size="sm" [columns]="columns" [items]="items" />
    `,
  })
  class SizeHost {
    protected readonly items = [{ id: 1, name: 'Ada' }];
    protected readonly columns: WrTableColumns = { name: { title: 'Name' } };
    readonly size = signal<WrTableSize>('md');
  }

  let fixture: ComponentFixture<SizeHost>;
  const table = (cls: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`wr-table.${cls}`)!;

  beforeEach(() => {
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('wears no size modifier by default, nor at md', () => {
    expect(table('plain').className).not.toMatch(/wr-table--(sm|md)/);
    expect(table('bound').className).not.toMatch(/wr-table--(sm|md)/);
  });

  it('wears wr-table--sm at sm and drops it again', () => {
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();
    expect(table('bound').classList).toContain('wr-table--sm');

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(table('bound').classList).not.toContain('wr-table--sm');
  });

  it('reads a static size attribute', () => {
    expect(table('static').classList).toContain('wr-table--sm');
    expect(table('static').getAttribute('size')).toBe('sm');
  });

  it('writes no padding inline: the hooks stay the stylesheet’s and the consumer’s', () => {
    expect(table('static').getAttribute('style') ?? '').not.toContain('--wr-table-cell-padding');
    expect(table('static').querySelector<HTMLElement>('.wr-table__td')!.getAttribute('style') ?? '').not.toContain(
      'padding'
    );
  });
});
