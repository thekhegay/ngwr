import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

const COLUMNS: WrTableColumns = {
  name: { title: 'Name' },
  role: { title: 'Role' },
  city: { title: 'City' },
};

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="[]" rowKey="id" reorderable [(columnOrder)]="order" />`,
})
class Host {
  readonly order = signal<readonly string[]>([]);
  readonly columns = COLUMNS;
}

const html = document.documentElement;
const dragging = (): boolean => html.classList.contains('wr-table-dragging');

describe('WrTable Escape cancels a column drag', () => {
  let fixture: ComponentFixture<Host>;
  let ends: Event[];
  const onEnd = (e: Event): void => void ends.push(e);

  const drags = (): CdkDrag[] => fixture.debugElement.queryAll(By.directive(CdkDrag)).map(d => d.injector.get(CdkDrag));
  const list = (): CdkDropList => fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
  const source = (i: number): CdkDrag =>
    ({
      element: drags()[i].element,
      getPlaceholderElement: () => drags()[i].element.nativeElement,
      dropContainer: list(),
    }) as unknown as CdkDrag;

  const start = (i: number, event: Event = new MouseEvent('mousemove')): void =>
    drags()[i].started.emit({ source: source(i), event: event as MouseEvent });
  const end = (i: number): void =>
    drags()[i].ended.emit({
      source: source(i),
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
  const drop = (previousIndex: number, currentIndex: number): void =>
    list().dropped.emit({ previousIndex, currentIndex } as never);
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
    html.classList.remove('wr-table-dragging', 'wr-table-dragging--allowed', 'wr-table-dragging--blocked');
  });

  it('ends the drag with a mouseup, prevents the key and clears the cursor at once', () => {
    start(1);
    expect(dragging()).toBe(true);

    const event = escape();

    expect(event.defaultPrevented).toBe(true);
    expect(ends.map(e => e.type)).toEqual(['mouseup']);
    expect(dragging()).toBe(false);
  });

  it('ends a touch drag with a touchend', () => {
    start(1, new Event('touchmove'));

    escape();

    expect(ends.map(e => e.type)).toEqual(['touchend']);
  });

  it('stops the key before a dialog around the table sees it', () => {
    const seen = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', seen);
    start(1);

    escape();

    expect(seen).not.toHaveBeenCalled();
  });

  it('ignores the drop that follows, and the next drop reorders', () => {
    start(1);
    escape();
    end(1);
    drop(1, 2);
    expect(fixture.componentInstance.order()).toEqual([]);

    start(1);
    end(1);
    drop(1, 2);
    expect(fixture.componentInstance.order()).toEqual(['name', 'city', 'role']);
  });

  it('leaves Escape alone when no drag is active', () => {
    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });

  it('removes the listener when the drag ends', () => {
    start(1);
    end(1);

    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });

  it('removes the listener when the table is destroyed mid-drag', () => {
    start(1);
    fixture.destroy();

    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toEqual([]);
  });

  it('listens once: a second Escape in the same drag is not swallowed', () => {
    start(1);
    escape();

    expect(escape().defaultPrevented).toBe(false);
    expect(ends).toHaveLength(1);
  });
});
