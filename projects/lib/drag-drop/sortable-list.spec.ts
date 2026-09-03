import { type Direction, Directionality } from '@angular/cdk/bidi';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

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

  /**
   * The keyboard path is the only reorder path a keyboard has — `cdkDrag` ships
   * none — so unlike the gesture above it is entirely this component's code and
   * fully testable in jsdom. The one half that is not: moving a focused DOM node
   * blurs it in a browser and jsdom keeps focus across the move, so the
   * re-focus in `relocate` cannot be asserted here.
   */
  describe('keyboard reordering', () => {
    const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-sortable-list__item')];
    const status = (): string => root().querySelector('[role="status"]')!.textContent.trim();

    const key = (index: number, k: string, target?: HTMLElement): boolean => {
      const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      (target ?? items()[index]).dispatchEvent(event);
      fixture.detectChanges();
      return event.defaultPrevented;
    };

    const labels = (): string[] => fixture.componentInstance.items().map(r => r.label);

    it('makes every row a tab stop inside a real list', () => {
      expect(root().querySelector('.wr-sortable-list__list')!.getAttribute('role')).toBe('list');
      for (const item of items()) {
        expect(item.getAttribute('role')).toBe('listitem');
        expect(item.getAttribute('tabindex')).toBe('0');
        // The key model has to be reachable from the row focus lands on.
        const help = root().querySelector(`#${item.getAttribute('aria-describedby')}`);
        expect(help?.textContent).toContain('arrow keys');
      }
    });

    it('leaves the rows alone while the list is disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(items()[0].getAttribute('tabindex')).toBeNull();
      key(0, ' ');
      key(0, 'ArrowDown');
      expect(labels()).toEqual(['One', 'Two', 'Three']);
    });

    it('does nothing on an arrow until the row has been picked up', () => {
      expect(key(0, 'ArrowDown')).toBe(false);
      expect(labels()).toEqual(['One', 'Two', 'Three']);
      expect(status()).toBe('');
    });

    it('picks up, moves and drops — one reorder for the whole gesture', async () => {
      key(0, ' ');
      expect(status()).toBe('Grabbed. 1 of 3.');

      key(0, 'ArrowDown');
      await fixture.whenStable();
      expect(labels()).toEqual(['Two', 'One', 'Three']);
      expect(status()).toBe('2 of 3.');
      // The array moved, but the gesture is not over yet.
      expect(fixture.componentInstance.events).toEqual([]);

      key(1, 'ArrowDown');
      await fixture.whenStable();
      expect(labels()).toEqual(['Two', 'Three', 'One']);

      key(2, ' ');
      expect(status()).toBe('Dropped. 3 of 3.');
      expect(fixture.componentInstance.events).toEqual([
        {
          items: fixture.componentInstance.items(),
          previousIndex: 0,
          currentIndex: 2,
          item: { id: 1, label: 'One' },
        },
      ]);
    });

    it('stops at the ends of the list', async () => {
      key(0, ' ');
      key(0, 'ArrowUp');
      await fixture.whenStable();

      expect(labels()).toEqual(['One', 'Two', 'Three']);
      expect(status()).toBe('Grabbed. 1 of 3.');
    });

    it('puts the row back on Escape and reports nothing', async () => {
      key(1, ' ');
      key(1, 'ArrowUp');
      await fixture.whenStable();
      expect(labels()).toEqual(['Two', 'One', 'Three']);

      key(0, 'Escape');
      await fixture.whenStable();

      expect(labels()).toEqual(['One', 'Two', 'Three']);
      expect(status()).toBe('Move cancelled.');
      expect(fixture.componentInstance.events).toEqual([]);
    });

    it('claims the keys it acts on, and only those', () => {
      expect(key(0, ' ')).toBe(true);
      expect(key(0, 'ArrowDown')).toBe(true);
      // Escape is swallowed only while a row is held, so an Escape typed
      // anywhere else still reaches the dialog the list may be sitting in.
      expect(key(1, 'Escape')).toBe(true);
      expect(key(1, 'Escape')).toBe(false);
      expect(key(0, 'a')).toBe(false);
    });

    it('leaves keys pressed inside the row template alone', () => {
      const projected = items()[0].querySelector<HTMLElement>('.row')!;
      key(0, ' ', projected);

      expect(status()).toBe('');
      expect(labels()).toEqual(['One', 'Two', 'Three']);
    });

    it('ends the gesture when focus leaves a held row', async () => {
      key(0, ' ');
      key(0, 'ArrowDown');
      await fixture.whenStable();

      items()[1].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      fixture.detectChanges();

      // `[(items)]` had already been written, so releasing silently would leave
      // the move unreported.
      expect(fixture.componentInstance.events).toHaveLength(1);
      expect(fixture.componentInstance.events[0].currentIndex).toBe(1);
    });

    it('moves left and right when the list is horizontal', async () => {
      fixture.componentInstance.orientation.set('horizontal');
      fixture.detectChanges();

      key(0, ' ');
      key(0, 'ArrowDown');
      await fixture.whenStable();
      expect(labels()).toEqual(['One', 'Two', 'Three']);

      key(0, 'ArrowRight');
      await fixture.whenStable();
      expect(labels()).toEqual(['Two', 'One', 'Three']);
    });
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

/**
 * Reading direction, for the horizontal keyboard path.
 *
 * `Directionality` resolves the document's direction when it is constructed, so
 * the honest way to test the other one is to provide a fake — writing
 * `document.dir` mid-file would leak into whatever runs after it.
 *
 * Every case is a PAIR. On its own an RTL assertion cannot tell "mirrors
 * correctly" from "always moves the same way", so each direction states the
 * outcome the other one contradicts — and the vertical case is here for the
 * opposite reason, to pin that a column does NOT mirror.
 */
describe('WrSortableList under a reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rowEls = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-sortable-list__item')];
  const labels = (): string[] => fixture.componentInstance.items().map(r => r.label);

  const mount = (dir: Direction, orientation: 'vertical' | 'horizontal'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.orientation.set(orientation);
    fixture.detectChanges();
  };

  const key = (index: number, k: string): void => {
    rowEls()[index].dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('moves the held row toward the higher index on ArrowRight in LTR', async () => {
    mount('ltr', 'horizontal');
    key(0, ' ');
    key(0, 'ArrowRight');
    await fixture.whenStable();

    expect(labels()).toEqual(['Two', 'One', 'Three']);
  });

  it('moves it toward the higher index on ArrowLeft in RTL, because index 0 paints on the right', async () => {
    // The visual order under `dir="rtl"` is Three Two One, so the key that walks
    // the row toward the RIGHT of the screen is the one that LOWERS the index.
    // Raising it on ArrowRight regardless — which is what this used to do — sent
    // the item away from the arrow the user pressed.
    mount('rtl', 'horizontal');
    key(0, ' ');
    key(0, 'ArrowLeft');
    await fixture.whenStable();

    expect(labels()).toEqual(['Two', 'One', 'Three']);
  });

  it('leaves the row where it is on the mirrored arrow at the end of the list', async () => {
    // The contradicting half of the pair above: in RTL, ArrowRight on the item at
    // index 0 now asks for index −1, which the move refuses. Under the old code
    // this same press reordered the list.
    mount('rtl', 'horizontal');
    key(0, ' ');
    key(0, 'ArrowRight');
    await fixture.whenStable();

    expect(labels()).toEqual(['One', 'Two', 'Three']);
  });

  it('does not mirror a vertical list — a column has no reading direction', async () => {
    mount('rtl', 'vertical');
    key(0, ' ');
    key(0, 'ArrowDown');
    await fixture.whenStable();

    expect(labels()).toEqual(['Two', 'One', 'Three']);
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
    // Scoped to the list: the component also renders the screen-reader-only key
    // model and its live region, and both are text on the host.
    const list = (fixture.nativeElement as HTMLElement).querySelector('.wr-sortable-list__list')!;
    expect(list.textContent.replace(/\s+/g, '')).toBe('aba');

    fixture.destroy();
  });
});
