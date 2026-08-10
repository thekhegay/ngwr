import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSortableReorderEvent } from './interfaces';
import { WrSortableList } from './sortable-list';

interface Row {
  readonly id: number;
  readonly label: string;
}

const ROWS: Row[] = [
  { id: 1, label: 'One' },
  { id: 2, label: 'Two' },
  { id: 3, label: 'Three' },
];

@Component({
  imports: [WrSortableList],
  template: `
    <wr-sortable-list
      [(items)]="items"
      [orientation]="orientation()"
      [disabled]="disabled()"
      (reorder)="events.push($event)"
    >
      <ng-template let-row let-i="index">
        <span class="row">{{ i + 1 }}. {{ row.label }}</span>
      </ng-template>
    </wr-sortable-list>
  `,
})
class Host {
  readonly items = signal<Row[]>([...ROWS]);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly disabled = signal(false);
  readonly events: WrSortableReorderEvent<Row>[] = [];
}

/**
 * A real drag needs layout, which jsdom has none of — so the gesture is not what
 * is tested here. What IS testable, and is where this component's own code lives,
 * is the wiring: the CDK's `dropped` output is emitted through the directive
 * instance the template binds to, exactly as the CDK would emit it, and the
 * assertions are on what the component does with it.
 */
describe('WrSortableList', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): string[] => [...root().querySelectorAll('.row')].map(el => el.textContent.trim());
  const dropList = (): CdkDropList => fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

  /** Emit a drop the way the CDK does when a gesture finishes. */
  const drop = (previousIndex: number, currentIndex: number): void => {
    dropList().dropped.emit({ previousIndex, currentIndex } as CdkDragDrop<Row[]>);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the projected template once per item, with its index', () => {
    expect(rows()).toEqual(['1. One', '2. Two', '3. Three']);
  });

  it('moves the dropped item and writes the new order back to the host', () => {
    drop(0, 2);

    expect(fixture.componentInstance.items().map(r => r.label)).toEqual(['Two', 'Three', 'One']);
    expect(rows()).toEqual(['1. Two', '2. Three', '3. One']);
  });

  it('reports the move with both indices and the item that moved', () => {
    drop(2, 0);

    expect(fixture.componentInstance.events).toEqual([
      {
        items: fixture.componentInstance.items(),
        previousIndex: 2,
        currentIndex: 0,
        item: { id: 3, label: 'Three' },
      },
    ]);
  });

  it('does not touch the array it was given', () => {
    // `items` is a model, and a consumer holding the original array must not see
    // it reordered underneath them.
    const original = fixture.componentInstance.items();
    drop(0, 1);

    expect(original.map(r => r.label)).toEqual(['One', 'Two', 'Three']);
    expect(fixture.componentInstance.items()).not.toBe(original);
  });

  it('says nothing when the item lands where it started', () => {
    drop(1, 1);

    expect(fixture.componentInstance.events).toEqual([]);
    expect(fixture.componentInstance.items().map(r => r.label)).toEqual(['One', 'Two', 'Three']);
  });

  it('follows the host when the array is replaced from outside', () => {
    fixture.componentInstance.items.set([{ id: 9, label: 'Nine' }]);
    fixture.detectChanges();

    expect(rows()).toEqual(['1. Nine']);
  });

  it('passes the orientation and the disabled state to the CDK', () => {
    expect(dropList().orientation).toBe('vertical');
    expect(dropList().disabled).toBe(false);

    fixture.componentInstance.orientation.set('horizontal');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(dropList().orientation).toBe('horizontal');
    expect(dropList().disabled).toBe(true);
  });
});

@Component({
  imports: [WrSortableList],
  template: `
    <wr-sortable-list [(items)]="items">
      <ng-template let-row>{{ row }}</ng-template>
    </wr-sortable-list>
  `,
})
class PrimitiveHost {
  readonly items = signal<string[]>(['a', 'b', 'a']);
}

describe('WrSortableList over repeated primitives', () => {
  it('renders a list whose values repeat', () => {
    // The default `trackBy` is identity, which for objects is exactly right and
    // for repeated primitives is a duplicate key. Angular is loud about that, so
    // this pins which way it goes rather than leaving it to be discovered.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(PrimitiveHost);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).textContent.replace(/\s+/g, '')).toBe('aba');

    fixture.destroy();
  });
});
