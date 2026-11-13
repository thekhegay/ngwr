import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrTree, type WrTreeChildrenLoader, type WrTreeNode } from 'ngwr/tree';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTreeHarness } from './wr-tree-harness';

const NODES: readonly WrTreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'main', label: 'main.ts' },
      { id: 'styles', label: 'styles.css' },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'remote', label: 'Remote', hasChildren: true },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      selectionMode="multi"
      cascade
      [nodes]="nodes"
      [expanded]="['src']"
      [loadChildren]="loader"
      [(selected)]="picked"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly picked = signal<readonly string[]>([]);
  fail = false;
  readonly loader: WrTreeChildrenLoader = vi.fn(
    () =>
      // A real wait, so a harness that did not wait would read the loading row.
      new Promise<readonly WrTreeNode[]>((resolve, reject) =>
        setTimeout(() => (this.fail ? reject(new Error('offline')) : resolve([{ id: 'r1', label: 'One' }])), 5)
      )
  );
}

describe('WrTreeHarness: lazy children and cascade', () => {
  let fixture: ComponentFixture<Host>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    tree = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('waits for a lazy branch: `expand()` resolves with the children rendered', async () => {
    const remote = await tree.getNode({ label: 'Remote' });
    await remote.expand();

    expect(await remote.isLoading()).toBe(false);
    expect(await tree.getNodeLabels()).toEqual(['src', 'main.ts', 'styles.css', 'README.md', 'Remote', 'One']);
  });

  it('resolves `expand()` on a failed load too, with the branch open and nothing under it', async () => {
    fixture.componentInstance.fail = true;
    const remote = await tree.getNode({ label: 'Remote' });
    await remote.expand();

    expect(await remote.isExpanded()).toBe(true);
    expect(await remote.isLoading()).toBe(false);
    expect(await tree.getNodeLabels()).toEqual(['src', 'main.ts', 'styles.css', 'README.md', 'Remote']);
  });

  it('reads a partly checked parent as mixed, and neither selected nor unselectable', async () => {
    await (await tree.getNode({ label: 'main.ts' })).click();

    expect(await tree.isMixed('src')).toBe(true);
    expect(await tree.isMixed('main.ts')).toBe(false);
    const src = await tree.getNode({ label: 'src' });
    expect(await src.isSelected()).toBe(false);
    expect(await src.isSelectable()).toBe(true);
    expect(await tree.getSelectedLabels()).toEqual(['main.ts']);

    await (await tree.getNode({ label: 'styles.css' })).click();
    expect(await tree.isMixed('src')).toBe(false);
    expect(await src.isSelected()).toBe(true);
  });
});
