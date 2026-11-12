import { type Direction, Directionality } from '@angular/cdk/bidi';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSortableItem } from './sortable-item';
import { WrSortableList } from './sortable-list';
import type { WrSortableCanEnter, WrSortableMoveEvent, WrSortableReorderEvent } from './types';

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
  imports: [WrSortableList, WrSortableItem],
  template: `
    <wr-sortable-list
      [(items)]="items"
      [orientation]="orientation()"
      [disabled]="disabled()"
      (reorder)="events.push($event)"
    >
      @for (row of items(); track row.id) {
        <wr-sortable-item>
          <span class="row">{{ $index + 1 }}. {{ row.label }}</span>
        </wr-sortable-item>
      }
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

    it('follows a row the consumer loop moved without changing the length', async () => {
      key(1, ' ');
      key(1, 'ArrowDown');
      await fixture.whenStable();
      expect(labels()).toEqual(['One', 'Three', 'Two']);

      // A reorder keeps the count, so a position derived from the length alone
      // stays where the row was: the highlight sat on 'Three' while 'Two' moved.
      const grabbed = (): string[] =>
        items()
          .filter(el => el.classList.contains('wr-sortable-list__item--grabbed'))
          .map(el => el.textContent.trim());
      expect(grabbed()).toEqual(['3. Two']);

      key(2, ' ');
      await fixture.whenStable();
      fixture.componentInstance.events.length = 0;

      // The same node, picked up again at its new slot.
      key(2, ' ');
      expect(status()).toBe('Grabbed. 3 of 3.');
      key(2, 'ArrowUp');
      await fixture.whenStable();
      expect(labels()).toEqual(['One', 'Two', 'Three']);

      key(1, ' ');
      expect(fixture.componentInstance.events).toEqual([
        {
          items: fixture.componentInstance.items(),
          previousIndex: 2,
          currentIndex: 1,
          item: { id: 2, label: 'Two' },
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

interface Column {
  readonly id: string;
  readonly group: string;
  readonly label: string | null;
  readonly items: ReturnType<typeof signal<Row[]>>;
}

const column = (id: string, group: string, label: string | null, rows: Row[]): Column => ({
  id,
  group,
  label,
  items: signal(rows),
});

@Component({
  imports: [WrSortableList, WrSortableItem],
  template: `
    @for (col of columns(); track col.id) {
      <wr-sortable-list
        [id]="col.id"
        [group]="col.group"
        [ariaLabel]="col.label"
        [(items)]="col.items"
        [canEnter]="col.id === 'done' ? doneRule() : null"
        [disabled]="col.id === 'doing' && doingDisabled()"
        (reorder)="reorders.push(col.id)"
        (move)="moves.push($event)"
      >
        @for (row of col.items(); track row.id) {
          <wr-sortable-item>
            <span class="row">{{ row.label }}</span>
          </wr-sortable-item>
        }
        <p wrSortableListEmpty class="hint">Drop here</p>
      </wr-sortable-list>
    }
  `,
})
class BoardHost {
  readonly columns = signal<Column[]>([
    column('todo', 'board', 'To do', [...ROWS]),
    column('doing', 'board', 'Doing', [{ id: 4, label: 'Four' }]),
    column('done', 'board', null, []),
    column('archive', 'other', 'Archive', [{ id: 5, label: 'Five' }]),
  ]);
  readonly doneRule = signal<WrSortableCanEnter<Row> | null>(null);
  readonly doingDisabled = signal(false);
  readonly reorders: string[] = [];
  readonly moves: WrSortableMoveEvent<Row>[] = [];
}

/**
 * Lists that share a `group`. As above, the gesture itself needs layout, so the
 * pointer half drives what the CDK hands over at the end of one: a `dropped`
 * event naming both containers, and the enter predicate it consults on the way.
 */
describe('WrSortableList in a group', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BoardHost>>;

  const host = (): BoardHost => fixture.componentInstance;
  const listEls = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-sortable-list'),
  ];
  const dropLists = (): CdkDropList[] =>
    fixture.debugElement.queryAll(By.directive(CdkDropList)).map(de => de.injector.get(CdkDropList));
  const drags = (list: number): CdkDrag[] =>
    fixture.debugElement
      .queryAll(By.directive(WrSortableList))
      [list].queryAll(By.directive(CdkDrag))
      .map(de => de.injector.get(CdkDrag));
  const labels = (list: number): string[] =>
    host()
      .columns()
      [list].items()
      .map(r => r.label);
  const rowEls = (list: number): HTMLElement[] => [
    ...listEls()[list].querySelectorAll<HTMLElement>('.wr-sortable-list__item'),
  ];
  const status = (list: number): string => listEls()[list].querySelector('[role="status"]')!.textContent.trim();
  const moves = (): unknown[] =>
    host().moves.map(e => ({
      item: e.item.label,
      from: [e.from.list.id(), e.from.index],
      to: [e.to.list.id(), e.to.index],
    }));

  const drop = (from: number, previousIndex: number, to: number, currentIndex: number): void => {
    const lists = dropLists();
    lists[to].dropped.emit({
      previousIndex,
      currentIndex,
      previousContainer: lists[from],
      container: lists[to],
    } as CdkDragDrop<unknown>);
    fixture.detectChanges();
  };

  const key = async (list: number, index: number, k: string): Promise<void> => {
    rowEls(list)[index].dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const mount = (dir?: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: dir
        ? [
            {
              provide: Directionality,
              useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
            },
          ]
        : [],
    });
    fixture = TestBed.createComponent(BoardHost);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('gives every projected row its own list as the drop container', () => {
    // A projected `cdkDrag` finds its list through the element injector. With
    // the drop list inside the component's view it found none, and every row
    // was a free drag that sorted nothing.
    const lists = dropLists();
    for (const [i, list] of lists.entries()) {
      for (const drag of drags(i)) expect(drag.dropContainer).toBe(list);
    }
    expect(drags(0)).toHaveLength(3);
  });

  it('connects the lists of one group and leaves another group out', () => {
    const [todo, doing, done, archive] = dropLists();

    expect(todo.connectedTo).toEqual([doing, done]);
    expect(doing.connectedTo).toEqual([todo, done]);
    expect(done.connectedTo).toEqual([todo, doing]);
    expect(archive.connectedTo).toEqual([]);
    expect(listEls().map(el => el.classList.contains('wr-sortable-list--connected'))).toEqual([true, true, true, true]);
  });

  it('connects nothing without a group', () => {
    TestBed.resetTestingModule();
    const plain = TestBed.createComponent(Host);
    plain.detectChanges();
    const list = plain.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

    expect(list.connectedTo).toEqual([]);
    expect((plain.nativeElement as HTMLElement).querySelector('.wr-sortable-list--connected')).toBeNull();
    plain.destroy();
  });

  it('drops a list out of the group when it is destroyed', async () => {
    host().columns.update(columns => columns.filter(col => col.id !== 'doing'));
    fixture.detectChanges();
    await fixture.whenStable();
    const [todo, done] = dropLists();

    expect(dropLists()).toHaveLength(3);
    expect(todo.connectedTo).toHaveLength(1);
    expect((todo.connectedTo as CdkDropList[])[0]).toBe(done);
  });

  it('moves a dragged item from one list into another and writes both models', () => {
    drop(0, 1, 1, 0);

    expect(labels(0)).toEqual(['One', 'Three']);
    expect(labels(1)).toEqual(['Two', 'Four']);
    expect(rowEls(1).map(el => el.textContent.trim())).toEqual(['Two', 'Four']);
  });

  it('reports the move once, on the list the item arrived in, and no reorder', () => {
    drop(0, 1, 1, 1);

    expect(moves()).toEqual([{ item: 'Two', from: ['todo', 1], to: ['doing', 1] }]);
    expect(host().moves[0].to.list.items()).toBe(host().columns()[1].items());
    expect(host().reorders).toEqual([]);
  });

  it('keeps reporting a move inside one list as a reorder', () => {
    drop(0, 0, 0, 2);

    expect(host().reorders).toEqual(['todo']);
    expect(host().moves).toEqual([]);
  });

  it('takes a drop while empty, and shows the projected hint only until then', () => {
    const done = listEls()[2];
    expect(done.classList.contains('wr-sortable-list--empty')).toBe(true);
    expect(done.querySelector('.wr-sortable-list__empty .hint')?.textContent).toBe('Drop here');
    expect(listEls()[0].querySelector('.wr-sortable-list__empty')).toBeNull();

    drop(1, 0, 2, 0);

    expect(labels(2)).toEqual(['Four']);
    expect(labels(1)).toEqual([]);
    expect(done.classList.contains('wr-sortable-list--empty')).toBe(false);
    expect(done.querySelector('.wr-sortable-list__empty')).toBeNull();
    expect(listEls()[1].classList.contains('wr-sortable-list--empty')).toBe(true);
  });

  it('asks canEnter about the item and the list it comes from', () => {
    const seen: unknown[] = [];
    host().doneRule.set((item, from) => {
      seen.push([item.label, from.id()]);
      return item.id !== 2;
    });
    fixture.detectChanges();
    const done = dropLists()[2];
    const [one, two] = drags(0);

    expect(done.enterPredicate(one, done)).toBe(true);
    expect(done.enterPredicate(two, done)).toBe(false);
    expect(seen).toEqual([
      ['One', 'todo'],
      ['Two', 'todo'],
    ]);
    // A list without a rule takes everything from its group.
    expect(dropLists()[1].enterPredicate(two, dropLists()[1])).toBe(true);
  });

  it('refuses every item while disabled', () => {
    host().doingDisabled.set(true);
    fixture.detectChanges();
    const doing = dropLists()[1];

    expect(doing.enterPredicate(drags(0)[0], doing)).toBe(false);
  });

  it('names the list by its id, generated when none is given', () => {
    expect(listEls().map(el => el.id)).toEqual(['todo', 'doing', 'done', 'archive']);
    expect(listEls().map(el => el.querySelector('[role="list"]')!.getAttribute('aria-label'))).toEqual([
      'To do',
      'Doing',
      null,
      'Archive',
    ]);

    TestBed.resetTestingModule();
    const plain = TestBed.createComponent(Host);
    plain.detectChanges();
    expect((plain.nativeElement as HTMLElement).querySelector('wr-sortable-list')!.id).toMatch(
      /^wr-sortable-list-\d+$/
    );
    plain.destroy();
  });

  describe('by keyboard', () => {
    it('describes the keys that cross lists', () => {
      const help = listEls()[0].querySelector(`#${rowEls(0)[0].getAttribute('aria-describedby')}`);
      expect(help?.textContent).toContain('into the next one');
    });

    it('hands a held row to the next list, announces it there, and reports on drop', async () => {
      await key(0, 1, ' ');
      await key(0, 1, 'ArrowRight');

      expect(labels(0)).toEqual(['One', 'Three']);
      // Same slot in the new list, clamped to its length.
      expect(labels(1)).toEqual(['Four', 'Two']);
      expect(status(1)).toBe('Moved to Doing. 2 of 2.');
      expect(status(0)).toBe('');
      expect(rowEls(1)[1].classList.contains('wr-sortable-list__item--grabbed')).toBe(true);
      expect(document.activeElement).toBe(rowEls(1)[1]);
      // `[(items)]` moved, the gesture is not over.
      expect(host().moves).toEqual([]);

      await key(1, 1, 'ArrowUp');
      expect(labels(1)).toEqual(['Two', 'Four']);

      await key(1, 0, ' ');
      expect(status(1)).toBe('Dropped. 1 of 2.');
      expect(moves()).toEqual([{ item: 'Two', from: ['todo', 1], to: ['doing', 0] }]);
      expect(host().reorders).toEqual([]);
    });

    it('names an unlabelled list by its position in the group', async () => {
      await key(1, 0, ' ');
      await key(1, 0, 'ArrowRight');

      expect(labels(2)).toEqual(['Four']);
      expect(status(2)).toBe('Moved to list 3 of 3. 1 of 1.');
    });

    it('stops at the last list of the group and never enters another group', async () => {
      await key(1, 0, ' ');
      await key(1, 0, 'ArrowRight');
      await key(2, 0, 'ArrowRight');

      expect(labels(2)).toEqual(['Four']);
      expect(labels(3)).toEqual(['Five']);
    });

    it('steps over a list that refuses the item', async () => {
      host().doneRule.set(() => false);
      host().doingDisabled.set(true);
      fixture.detectChanges();

      await key(0, 0, ' ');
      await key(0, 0, 'ArrowRight');
      // Doing is disabled and Done refuses: nowhere to go.
      expect(labels(0)).toEqual(['One', 'Two', 'Three']);

      host().doneRule.set(null);
      fixture.detectChanges();
      await key(0, 0, 'ArrowRight');
      expect(labels(1)).toEqual(['Four']);
      expect(labels(2)).toEqual(['One']);
    });

    it('puts the row back into the list it started in on Escape', async () => {
      await key(0, 1, ' ');
      await key(0, 1, 'ArrowRight');
      await key(1, 1, 'ArrowRight');
      expect(labels(2)).toEqual(['Two']);

      await key(2, 0, 'Escape');

      expect(labels(0)).toEqual(['One', 'Two', 'Three']);
      expect(labels(2)).toEqual([]);
      expect(status(0)).toBe('Move cancelled.');
      expect(host().moves).toEqual([]);
      expect(host().reorders).toEqual([]);
    });

    it('reports a reorder, not a move, for a row that came back to its own list', async () => {
      await key(0, 0, ' ');
      await key(0, 0, 'ArrowRight');
      await key(1, 0, 'ArrowDown');
      await key(1, 1, 'ArrowLeft');
      expect(labels(0)).toEqual(['Two', 'One', 'Three']);

      await key(0, 1, ' ');

      expect(host().moves).toEqual([]);
      expect(host().reorders).toEqual(['todo']);
    });

    it('mirrors the pair under RTL, where the next list sits to the left', async () => {
      mount('rtl');
      await key(0, 0, ' ');
      await key(0, 0, 'ArrowRight');
      expect(labels(0)).toEqual(['One', 'Two', 'Three']);

      await key(0, 0, 'ArrowLeft');
      expect(labels(1)).toEqual(['One', 'Four']);
    });
  });
});

/*
 * The repeated-primitive case that used to sit here pinned the default
 * `trackBy` of the list's own `@for`. v15 moved the loop to the consumer, so
 * the track expression is theirs and a duplicate key is Angular's own error to
 * report, not this component's behaviour to hold.
 */

/**
 * `[lockAxis]` is deliberately not driven here.
 *
 * It only changes what happens DURING a drag, against real pointer coordinates
 * and a real box — and jsdom has neither layout nor `PointerEvent`. A spec could
 * assemble the events by hand, as the window drag specs do, but every rect it
 * measured would be 0x0, so the constrained axis and the free one would come
 * back identical and the test would pass on a component that ignored the input
 * entirely.
 */
