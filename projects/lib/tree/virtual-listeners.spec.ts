import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { WrTree } from './tree';
import type { WrTreeNode } from './types';

const folders = (): WrTreeNode[] =>
  Array.from({ length: 50 }, (_, i) => ({
    id: `f${i}`,
    label: `Folder ${i}`,
    children: [{ id: `f${i}-a`, label: `File ${i}` }],
  }));

@Component({
  imports: [WrTree],
  template: `<wr-tree
    virtualScroll
    [rowHeight]="20"
    [viewportHeight]="200"
    [nodes]="nodes()"
    [(expanded)]="expanded"
  />`,
})
class Host {
  readonly nodes = signal<WrTreeNode[]>(folders());
  readonly expanded = signal<readonly string[]>([]);
}

describe('WrTree virtual scroll wiring', () => {
  let fixture: ComponentFixture<Host>;
  let listeners: MockInstance<HTMLElement['addEventListener']>;

  const scrolls = (): number => listeners.mock.calls.filter(([type]) => type === 'scroll').length;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await Promise.resolve();
    listeners = vi.spyOn(HTMLElement.prototype, 'addEventListener');
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('keeps its scroll listener while branches expand and collapse', async () => {
    fixture.componentInstance.expanded.set(['f0', 'f1']);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.componentInstance.expanded.set([]);
    fixture.detectChanges();
    await Promise.resolve();

    expect(scrolls()).toBe(0);
  });

  it('attaches once the empty list gets rows', async () => {
    fixture.componentInstance.nodes.set([]);
    fixture.detectChanges();
    await Promise.resolve();
    listeners.mockClear();

    fixture.componentInstance.nodes.set(folders());
    fixture.detectChanges();
    await Promise.resolve();

    expect(scrolls()).toBe(1);
  });
});
