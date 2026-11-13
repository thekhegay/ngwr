import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSortableItem } from './sortable-item';
import { WrSortableList } from './sortable-list';
import type { WrSortableReorderEvent } from './types';

@Component({
  imports: [WrSortableList, WrSortableItem],
  template: `
    <wr-sortable-list [(items)]="items" (reorder)="events.push($event)">
      @for (row of items(); track row) {
        <wr-sortable-item>{{ row }}</wr-sortable-item>
      }
    </wr-sortable-list>
  `,
})
class Host {
  readonly items = signal<string[]>(['One', 'Two', 'Three']);
  readonly events: WrSortableReorderEvent<string>[] = [];
}

describe('WrSortableList Escape cancels a pointer drag', () => {
  let fixture: ComponentFixture<Host>;
  let ends: Event[];
  const onEnd = (e: Event): void => void ends.push(e);

  const drags = (): CdkDrag[] => fixture.debugElement.queryAll(By.directive(CdkDrag)).map(d => d.injector.get(CdkDrag));
  const list = (): CdkDropList => fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

  const start = (i: number, event: Event = new MouseEvent('mousemove')): void =>
    drags()[i].started.emit({ source: drags()[i], event: event as MouseEvent });
  const end = (i: number): void =>
    drags()[i].ended.emit({
      source: drags()[i],
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
  const drop = (i: number, previousIndex: number, currentIndex: number): void =>
    list().dropped.emit({
      item: drags()[i],
      previousIndex,
      currentIndex,
      previousContainer: list(),
      container: list(),
    } as never);
  const escape = (): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    (fixture.nativeElement as HTMLElement).dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    ends = [];
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);
    fixture.destroy();
  });

  it('ends the drag with a mouseup and prevents the key', () => {
    start(0);

    const event = escape();

    expect(event.defaultPrevented).toBe(true);
    expect(ends.map(e => e.type)).toEqual(['mouseup']);
  });

  it('ends a touch drag with a touchend', () => {
    start(0, new Event('touchmove'));

    escape();

    expect(ends.map(e => e.type)).toEqual(['touchend']);
  });

  it('stops the key before a dialog around the list sees it', () => {
    const seen = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', seen);
    start(0);

    escape();

    expect(seen).not.toHaveBeenCalled();
  });

  it('changes nothing and emits nothing for the drop that follows', () => {
    start(0);
    escape();
    end(0);
    drop(0, 0, 2);
    fixture.detectChanges();

    expect(fixture.componentInstance.items()).toEqual(['One', 'Two', 'Three']);
    expect(fixture.componentInstance.events).toEqual([]);
  });

  it('still reorders on a normal drop, also after a cancelled drag', () => {
    start(0);
    escape();
    end(0);
    drop(0, 0, 2);

    start(0);
    end(0);
    drop(0, 0, 2);
    fixture.detectChanges();

    expect(fixture.componentInstance.items()).toEqual(['Two', 'Three', 'One']);
    expect(fixture.componentInstance.events).toHaveLength(1);
  });

  it('leaves Escape alone when no drag is active', () => {
    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });

  it('removes the listener when the drag ends', () => {
    start(0);
    end(0);

    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });

  it('removes the listener when the list is destroyed mid-drag', () => {
    start(0);
    fixture.destroy();

    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });
});
