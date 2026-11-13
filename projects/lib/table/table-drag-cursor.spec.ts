import { type Direction, Directionality } from '@angular/cdk/bidi';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, type EventEmitter, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { afterEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', pin: 'left' },
  role: { title: 'Role' },
  city: { title: 'City' },
};

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="[]" rowKey="id" [reorderable]="reorderable()" />`,
})
class Host {
  readonly reorderable = signal(true);
  readonly columns = COLUMNS;
}

const html = document.documentElement;
const state = (): string => ['allowed', 'blocked'].find(m => html.classList.contains(`wr-table-dragging--${m}`)) ?? '';

describe('WrTable column drag cursor', () => {
  let fixture: ComponentFixture<Host>;

  /**
   * Header cells laid out in a row of three 100px slots. Under RTL the first
   * column in DOM order sits at the far right, so the rects are mirrored.
   */
  const mount = (direction: Direction, reorderable = true): void => {
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.reorderable.set(reorderable);
    fixture.detectChanges();
    const cells = fixture.debugElement.queryAll(By.css('th.wr-table__th')).map(d => d.nativeElement as HTMLElement);
    cells.forEach((cell, i) => {
      const left = direction === 'rtl' ? (2 - i) * 100 : i * 100;
      cell.getBoundingClientRect = () => ({ left, right: left + 100, top: 0, bottom: 30 }) as DOMRect;
    });
  };

  const drags = (): CdkDrag[] => fixture.debugElement.queryAll(By.directive(CdkDrag)).map(d => d.injector.get(CdkDrag));
  const list = (): CdkDropList => fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

  /** The source the CDK hands over, with the placeholder standing where the cell was. */
  const source = (index: number): CdkDrag => {
    const drag = drags()[index];
    return {
      element: drag.element,
      getPlaceholderElement: () => drag.element.nativeElement,
      dropContainer: list(),
    } as unknown as CdkDrag;
  };

  const start = (index: number): void =>
    drags()[index].started.emit({
      source: source(index),
      event: new MouseEvent('mousemove'),
    });
  // `moved` is a cold stream over the drag ref, so it is fed from the ref.
  const move = (index: number, x: number): void =>
    (drags()[index] as unknown as { _dragRef: { moved: Subject<unknown> } })._dragRef.moved.next({
      source: drags()[index],
      pointerPosition: { x, y: 10 },
      event: new MouseEvent('mousemove'),
      delta: { x: 0, y: 0 },
      distance: { x: 0, y: 0 },
    });
  const end = (index: number): void =>
    drags()[index].ended.emit({
      source: source(index),
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });

  afterEach(() => {
    fixture.destroy();
    html.classList.remove('wr-table-dragging', 'wr-table-dragging--allowed', 'wr-table-dragging--blocked');
  });

  it('puts the class on the document on drag start and takes it off on drag end', () => {
    mount('ltr');

    start(1);
    expect(html.classList.contains('wr-table-dragging')).toBe(true);

    end(1);
    expect(html.classList.contains('wr-table-dragging')).toBe(false);
    expect(state()).toBe('');
  });

  it('clears the cursor on a cancelled drag, which ends without moving', () => {
    mount('ltr');

    start(1);
    move(1, 250);
    expect(html.classList.contains('wr-table-dragging')).toBe(true);
    end(1);

    expect(html.className).not.toContain('wr-table-dragging');
  });

  it('allows a free slot', () => {
    mount('ltr');
    start(1);

    move(1, 250);

    expect(state()).toBe('allowed');
  });

  it('blocks a pinned column slot', () => {
    mount('ltr');
    start(1);

    move(1, 50);

    expect(state()).toBe('blocked');
  });

  it("blocks the column's own slot", () => {
    mount('ltr');
    start(1);
    move(1, 250);

    move(1, 150);

    expect(state()).toBe('blocked');
  });

  it('blocks once the pointer leaves the header row, and allows again on re-entry', () => {
    mount('ltr');
    start(1);
    move(1, 250);

    (list().exited as EventEmitter<unknown>).emit({ item: drags()[1], container: list() });
    move(1, 250);
    expect(state()).toBe('blocked');

    (list().entered as EventEmitter<unknown>).emit({ item: drags()[1], container: list(), currentIndex: 2 });
    move(1, 250);
    expect(state()).toBe('allowed');
  });

  it('removes the class when the table is destroyed mid-drag', () => {
    mount('ltr');
    start(1);
    move(1, 250);
    expect(html.classList.contains('wr-table-dragging')).toBe(true);

    fixture.destroy();

    expect(html.className).not.toContain('wr-table-dragging');
  });

  it('gives the same answers for mirrored slots in RTL', () => {
    mount('rtl');
    start(1);

    // Slots run left to right: city, role, name. Role is the dragged column.
    move(1, 50);
    expect(state()).toBe('allowed');
    move(1, 150);
    expect(state()).toBe('blocked');
    move(1, 250);
    expect(state()).toBe('blocked');
  });

  it('adds nothing when reorderable is off', () => {
    mount('ltr', false);

    start(1);
    move(1, 250);

    expect(html.className).not.toContain('wr-table-dragging');
  });
});

describe('the drag cursor stylesheet', () => {
  const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

  it.each([
    ['allowed', 'grabbing'],
    ['blocked', 'not-allowed'],
  ])('paints html.wr-table-dragging--%s with %s over every descendant', (mod, cursor) => {
    const rule = new RegExp(
      `html\\.wr-table-dragging--${mod},\\s*html\\.wr-table-dragging--${mod} \\*\\s*\\{[^}]*cursor: ${cursor} !important`
    );
    expect(css).toMatch(rule);
  });

  it('keeps grab on the draggable header class, which a pinned header never gets', () => {
    expect(css).toMatch(/\.wr-table__th--draggable\s*\{[^}]*cursor: grab/);
  });
});
