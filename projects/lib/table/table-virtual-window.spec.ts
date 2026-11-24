/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

const rowClass = vi.fn((): string => '');

@Component({
  imports: [WrTable],
  template: `<wr-table
    [columns]="columns"
    [items]="items()"
    rowKey="id"
    virtualScroll
    [viewportHeight]="200"
    [rowClass]="rowClass"
  />`,
})
class Host {
  readonly columns: WrTableColumns = { name: { title: 'Name' } };
  readonly items = signal(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` })));
  readonly rowClass = rowClass;
}

describe('WrTable virtual window', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let offsetHeight: PropertyDescriptor | undefined;

  const scrollTo = async (top: number): Promise<void> => {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-table__scroll')!;
    el.scrollTop = top;
    el.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const labels = (): (string | undefined)[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.wr-table__tr')].map(row =>
      row.textContent?.trim()
    );

  beforeEach(async () => {
    offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 56 });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
    rowClass.mockClear();
  });

  it('does not re-render while a scroll stays inside one row, and does on a new row', async () => {
    await scrollTo(10);
    rowClass.mockClear();

    await scrollTo(20);
    expect(rowClass).not.toHaveBeenCalled();
    expect(labels()[0]).toBe('Row 1');

    await scrollTo(56 * 30);
    expect(rowClass).toHaveBeenCalled();
    expect(labels()).toContain('Row 31');
    expect(labels()).not.toContain('Row 1');
  });
});
