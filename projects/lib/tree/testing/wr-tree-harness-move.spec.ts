import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrTree, type WrTreeMoveEvent, type WrTreeNode } from 'ngwr/tree';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  { id: 'license', label: 'LICENSE' },
];

@Component({
  imports: [WrTree],
  template: `
    <wr-tree
      ariaLabel="Files"
      [draggable]="draggable()"
      [nodes]="nodes"
      [expanded]="['src']"
      (nodeMove)="moves.push($event)"
    />
  `,
})
class Host {
  readonly nodes = NODES;
  readonly draggable = signal(true);
  readonly moves: WrTreeMoveEvent[] = [];
}

describe('WrTreeHarness: the keyboard move', () => {
  let fixture: ComponentFixture<Host>;
  let tree: WrTreeHarness;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    tree = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTreeHarness);
  });

  afterEach(() => fixture.destroy());

  it('drives the keyboard move and reads what it announced', async () => {
    await tree.focusNext();
    await tree.focusNext();
    await tree.focusNext();
    expect(await tree.getActiveNodeLabel()).toBe('README.md');
    expect(await tree.getAnnouncement()).toBe('');

    await tree.grabActive();
    expect(await tree.getHeldLabel()).toBe('README.md');
    expect(await tree.getAnnouncement()).toBe('Grabbed. 2 of 3.');

    await tree.moveHeld('up');
    expect(await tree.getDropMark()).toEqual({ label: 'src', position: 'before' });
    await tree.moveHeld('down');
    await tree.moveHeld('in');
    expect(await tree.getDropMark()).toEqual({ label: 'styles.css', position: 'after' });
    expect(await tree.getAnnouncement()).toBe('src. 3 of 3.');

    await tree.dropHeld();
    expect(await tree.getHeldLabel()).toBeNull();
    expect(await tree.getDropMark()).toBeNull();
    expect(fixture.componentInstance.moves).toEqual([
      { node: NODES[1], from: { parentId: null, index: 1 }, to: { parentId: 'src', index: 2 } },
    ]);
  });

  it('cancels a held row', async () => {
    await tree.grabActive();
    await tree.moveHeld('down');
    await tree.cancelHeld();

    expect(await tree.getHeldLabel()).toBeNull();
    expect(await tree.getAnnouncement()).toBe('Move cancelled.');
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('says which rows can be dragged, and throws when the cursor row cannot be picked up', async () => {
    expect(await (await tree.getNode({ label: 'src' })).isDraggable()).toBe(true);

    fixture.componentInstance.draggable.set(false);
    expect(await (await tree.getNode({ label: 'src' })).isDraggable()).toBe(false);
    await expect(tree.grabActive()).rejects.toThrow(/was not picked up/);
  });
});
