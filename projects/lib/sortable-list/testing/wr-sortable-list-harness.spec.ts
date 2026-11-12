import type { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  WrSortableItem,
  WrSortableList,
  type WrSortableCanEnter,
  type WrSortableMoveEvent,
  type WrSortableReorderEvent,
} from 'ngwr/sortable-list';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSortableListHarness } from './wr-sortable-list-harness';

@Component({
  imports: [WrSortableList, WrSortableItem],
  template: `
    <wr-sortable-list
      id="todo"
      group="board"
      ariaLabel="To do"
      [(items)]="todo"
      [disabled]="disabled()"
      (reorder)="reorders.push($event)"
    >
      @for (task of todo(); track task) {
        <wr-sortable-item>{{ task }}</wr-sortable-item>
      }
    </wr-sortable-list>
    <wr-sortable-list group="board" ariaLabel="Doing" [(items)]="doing" [canEnter]="rule()">
      @for (task of doing(); track task) {
        <wr-sortable-item>{{ task }}</wr-sortable-item>
      }
    </wr-sortable-list>
    <wr-sortable-list group="board" ariaLabel="Done" [(items)]="done" (move)="moves.push($event)">
      @for (task of done(); track task) {
        <wr-sortable-item>{{ task }}</wr-sortable-item>
      }
      <span wrSortableListEmpty>Nothing done yet</span>
    </wr-sortable-list>
    <wr-sortable-list ariaLabel="Backlog" [(items)]="backlog">
      @for (task of backlog(); track task) {
        <wr-sortable-item>{{ task }}</wr-sortable-item>
      }
    </wr-sortable-list>
  `,
})
class Host {
  readonly todo = signal(['Spec', 'Build', 'Ship']);
  readonly doing = signal(['Review']);
  readonly done = signal<string[]>([]);
  readonly backlog = signal(['Later']);
  readonly disabled = signal(false);
  readonly rule = signal<WrSortableCanEnter<string> | null>(null);
  readonly reorders: WrSortableReorderEvent<string>[] = [];
  readonly moves: WrSortableMoveEvent<string>[] = [];
}

describe('WrSortableListHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: HarnessLoader;

  const list = (ariaLabel: string): Promise<WrSortableListHarness> =>
    loader.getHarness(WrSortableListHarness.with({ ariaLabel }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds a list by its label or by a row it holds', async () => {
    expect(await (await list('Doing')).getItems()).toEqual(['Review']);
    expect(await (await loader.getHarness(WrSortableListHarness.with({ item: /^Lat/ }))).getAriaLabel()).toBe(
      'Backlog'
    );
    expect(await loader.getAllHarnesses(WrSortableListHarness)).toHaveLength(4);
  });

  it('reads the id, the group membership and the empty state', async () => {
    const todo = await list('To do');
    const done = await list('Done');
    const backlog = await list('Backlog');

    expect(await todo.getId()).toBe('todo');
    expect(await backlog.getId()).toMatch(/^wr-sortable-list-\d+$/);
    expect(await todo.isConnected()).toBe(true);
    expect(await backlog.isConnected()).toBe(false);
    expect(await done.isEmpty()).toBe(true);
    expect(await done.getEmptyText()).toBe('Nothing done yet');
    expect(await todo.isEmpty()).toBe(false);
    expect(await todo.getEmptyText()).toBeNull();
  });

  it('moves a row inside its list and reports one reorder', async () => {
    const todo = await list('To do');
    await todo.moveItem(0, 2);

    expect(await todo.getItems()).toEqual(['Build', 'Ship', 'Spec']);
    expect(fixture.componentInstance.todo()).toEqual(['Build', 'Ship', 'Spec']);
    expect(fixture.componentInstance.reorders.map(e => [e.previousIndex, e.currentIndex])).toEqual([[0, 2]]);
    expect(await todo.getAnnouncement()).toBe('Dropped. 3 of 3.');
    expect(await todo.getHeldIndex()).toBeNull();
  });

  it('moves a row into another list of the group, past the one between them', async () => {
    const todo = await list('To do');
    const done = await list('Done');
    await todo.moveItemTo(1, done, 0);

    expect(await todo.getItems()).toEqual(['Spec', 'Ship']);
    expect(await done.getItems()).toEqual(['Build']);
    expect(await done.isEmpty()).toBe(false);
    expect(fixture.componentInstance.moves.map(e => [e.item, e.from.index, e.to.index])).toEqual([['Build', 1, 0]]);
    expect(fixture.componentInstance.reorders).toEqual([]);
  });

  it('walks the group the other way when the target sits before the source', async () => {
    const doing = await list('Doing');
    const todo = await list('To do');
    await doing.moveItemTo(0, todo, 3);

    expect(await todo.getItems()).toEqual(['Spec', 'Build', 'Ship', 'Review']);
    expect(await doing.getItems()).toEqual([]);
  });

  it('throws, with the row back in place, when the target refuses it', async () => {
    fixture.componentInstance.rule.set(() => false);
    const todo = await list('To do');
    const doing = await list('Doing');

    await expect(todo.moveItemTo(0, doing, 0)).rejects.toThrow(/never reached the target list/);
    expect(await todo.getItems()).toEqual(['Spec', 'Build', 'Ship']);
    expect(await doing.getItems()).toEqual(['Review']);
  });

  it('throws for a list outside the group', async () => {
    const todo = await list('To do');
    await expect(todo.moveItemTo(0, await list('Backlog'), 0)).rejects.toThrow(/share no group/);
    expect(await todo.getItems()).toEqual(['Spec', 'Build', 'Ship']);
  });

  it('throws on an index out of range, and on a list that cannot be driven', async () => {
    const todo = await list('To do');
    await expect(todo.moveItem(7, 0)).rejects.toThrow(/index 7 is out of range/);
    await expect(todo.moveItem(0, 5)).rejects.toThrow(/target index 5 is out of range/);
    expect(await todo.getItems()).toEqual(['Spec', 'Build', 'Ship']);

    fixture.componentInstance.disabled.set(true);
    await expect(todo.moveItem(0, 1)).rejects.toThrow(/was not picked up/);
  });
});
