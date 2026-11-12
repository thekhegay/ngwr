import { Component, type WritableSignal, signal } from '@angular/core';

import {
  WrDragHandle,
  WrSortableItem,
  WrSortableList,
  type WrSortableCanEnter,
  type WrSortableMoveEvent,
  type WrSortableReorderEvent,
} from 'ngwr/sortable-list';
import { WrTypography } from 'ngwr/typography';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocInstallComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface Task {
  readonly id: number;
  readonly label: string;
}

interface Column {
  readonly id: string;
  readonly title: string;
  readonly tasks: WritableSignal<Task[]>;
  readonly canEnter: WrSortableCanEnter<Task> | null;
}

@Component({
  selector: 'ngwr-sortable-list-page',
  templateUrl: './sortable-list.html',
  styleUrl: './sortable-list.scss',
  imports: [
    WrSortableList,
    WrSortableItem,
    WrDragHandle,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocInstallComponent,
    DocApiComponent,
  ],
})
export default class SortableListPage {
  protected readonly tasks = signal<Task[]>([
    { id: 1, label: 'Design the empty state' },
    { id: 2, label: 'Wire the new sidebar config' },
    { id: 3, label: 'Run lighthouse on the homepage' },
    { id: 4, label: 'Write release notes' },
    { id: 5, label: 'Bump the version' },
  ]);

  protected readonly lastReorder = signal<string>('—');

  protected onReorder(e: WrSortableReorderEvent<Task>): void {
    this.lastReorder.set(`moved "${e.item.label}" from #${e.previousIndex + 1} to #${e.currentIndex + 1}`);
  }

  protected readonly board: readonly Column[] = [
    {
      id: 'todo',
      title: 'To do',
      tasks: signal<Task[]>([
        { id: 11, label: 'Draft the changelog' },
        { id: 12, label: 'Review the migration' },
        { id: 13, label: 'Record the demo' },
      ]),
      // A finished task does not go back to the start.
      canEnter: (_task, from) => from.id() !== 'done',
    },
    { id: 'doing', title: 'Doing', tasks: signal<Task[]>([{ id: 14, label: 'Fix the flaky spec' }]), canEnter: null },
    { id: 'done', title: 'Done', tasks: signal<Task[]>([]), canEnter: null },
  ];

  protected readonly lastMove = signal<string>('none yet');

  protected onMove(e: WrSortableMoveEvent<Task>): void {
    this.lastMove.set(`"${e.item.label}" from ${e.from.list.ariaLabel()} to ${e.to.list.ariaLabel()}`);
  }

  protected readonly snippets = {
    group: `@for (column of board; track column.id) {
  <wr-sortable-list
    group="board"
    [id]="column.id"
    [ariaLabel]="column.title"
    [(items)]="column.tasks"
    [canEnter]="column.canEnter"
    (move)="onMove($event)"
  >
    @for (task of column.tasks(); track task.id) {
      <wr-sortable-item>{{ task.label }}</wr-sortable-item>
    }
    <p wrSortableListEmpty>Drop a task here</p>
  </wr-sortable-list>
}`,
    groupTs: `protected readonly board = [
  {
    id: 'todo',
    title: 'To do',
    tasks: signal<Task[]>([...]),
    // A finished task does not go back to the start.
    canEnter: (task: Task, from: WrSortableList<Task>) => from.id() !== 'done',
  },
  { id: 'doing', title: 'Doing', tasks: signal<Task[]>([...]), canEnter: null },
  { id: 'done', title: 'Done', tasks: signal<Task[]>([]), canEnter: null },
];

protected onMove(e: WrSortableMoveEvent<Task>): void {
  // Fired once, on the list the task arrived in. Both lists have written items by now.
  save(e.item, { from: e.from.list.id(), to: e.to.list.id(), index: e.to.index });
}`,
    basic: `<wr-sortable-list [(items)]="rows" (reorder)="onReorder($event)">
  @for (row of rows(); track row.id; let i = $index) {
    <wr-sortable-item>
      <div class="row">
        <span class="row__index">#{{ i + 1 }}</span>
        <span>{{ row.label }}</span>
      </div>
    </wr-sortable-item>
  }
</wr-sortable-list>`,
    basicStyles: `.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--wr-border-base);
  border-radius: var(--wr-border-radius-base);
  background: var(--wr-color-surface);
}`,
    handle: `<wr-sortable-list [(items)]="rows">
  @for (row of rows(); track row.id) {
    <wr-sortable-item>
      <div class="row">
        <span wrDragHandle aria-label="Reorder">≡</span>
        <span>{{ row.label }}</span>
      </div>
    </wr-sortable-item>
  }
</wr-sortable-list>`,
  };

  protected readonly keys: readonly DocApiRow[] = [
    { name: 'Space / Enter', description: 'Pick the focused row up, or drop the one being held.', type: 'key' },
    {
      name: 'Arrow keys',
      description: 'Move the held row. Follows the reading direction when horizontal.',
      type: 'key',
    },
    {
      name: 'Arrows of the other axis',
      description:
        'In a group, move the held row to the nearest list that takes it: Left and Right for a vertical list, mirrored in RTL.',
      type: 'key',
    },
    { name: 'Escape', description: 'Put the held row back where it started, in the list it started in.', type: 'key' },
  ];

  protected readonly api = API.WrSortableList;

  protected readonly related: readonly DocApiRow[] = [
    {
      name: '<wr-sortable-item>',
      description: 'One row. Write one per item in your own loop.',
      type: 'component',
      default: '—',
    },
    {
      name: '[wrDragHandle]',
      description: 'Only this element starts a drag.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrSortableListEmpty]',
      description: 'Slot shown while the list has no items. A plain attribute, nothing to import.',
      type: 'slot',
    },
    {
      name: 'WrSortableMoveEvent<T>',
      description: '`{ item, from: { list, index }, to: { list, index } }`. `list` is the `WrSortableList`.',
      type: 'type',
    },
    {
      name: 'WrSortableCanEnter<T>',
      description: '`(item: T, from: WrSortableList<T>) => boolean`.',
      type: 'type',
    },
  ];
}
