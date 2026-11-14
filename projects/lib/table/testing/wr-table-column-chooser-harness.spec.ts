import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrPopover } from 'ngwr/popover';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from '../table';
import { WrTableColumnChooser } from '../table-column-chooser';
import type { WrTableColumns } from '../types';

import { WrTableColumnChooserHarness } from './wr-table-column-chooser-harness';
import { WrTableHarness } from './wr-table-harness';

@Component({
  imports: [WrTable, WrTableColumnChooser, WrPopover],
  template: `
    <button type="button" class="menu-btn" [wrPopover]="menu">Columns</button>
    <ng-template #menu>
      <wr-table-column-chooser [table]="table" />
    </ng-template>
    <wr-table #table [columns]="columns()" [items]="[]" [columnChooser]="builtIn()" [(hiddenColumns)]="hidden" />
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>({
    name: { title: 'Name', hideable: false },
    role: { title: 'Role' },
    city: { title: 'City' },
  });
  readonly builtIn = signal(false);
  readonly hidden = signal<readonly string[]>(['city']);
}

describe('WrTableColumnChooserHarness', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('drives a chooser inside the consumer popover, from the document root', async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.menu-btn')!.click();
    fixture.detectChanges();
    const chooser = await TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(WrTableColumnChooserHarness);

    expect(await chooser.getColumns()).toEqual(['Name', 'Role', 'City']);
    expect(await chooser.isChecked('City')).toBe(false);
    expect(await chooser.isLocked('Name')).toBe(true);
    expect(await chooser.getShowAllState()).toBe('some');

    await chooser.toggle('City');
    expect(fixture.componentInstance.hidden()).toEqual([]);
    expect(await chooser.getShowAllState()).toBe('all');

    await chooser.showAll();
    expect(fixture.componentInstance.hidden()).toEqual(['role', 'city']);
    expect(await chooser.getShowAllState()).toBe('none');
  });

  it('names what it lists when asked for a column it does not have', async () => {
    fixture.componentInstance.builtIn.set(true);
    fixture.detectChanges();
    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);
    const chooser = await table.getColumnChooser();

    await expect(chooser.toggle('Age')).rejects.toThrow(/lists no "Age" — it lists \[Name, Role, City\]/);
    await expect(chooser.toggle('Name')).rejects.toThrow(/cannot be toggled/);
  });

  it('refuses a table without the built-in chooser', async () => {
    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);

    await expect(table.getColumnChooser()).rejects.toThrow(/no column chooser/);
  });
});
