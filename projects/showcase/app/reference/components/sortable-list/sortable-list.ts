import { Component, signal } from '@angular/core';

import { WrDragHandle, WrSortableItem, WrSortableList, type WrSortableReorderEvent } from 'ngwr/sortable-list';
import { WrTypography } from 'ngwr/typography';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface Task {
  readonly id: number;
  readonly label: string;
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

  protected readonly snippets = {
    peer: `npm install @angular/cdk`,
    basic: `<wr-sortable-list [(items)]="rows" (reorder)="onReorder($event)">
  @for (row of rows(); track row.id; let i = $index) {
    <wr-sortable-item>{{ i + 1 }}. {{ row.label }}</wr-sortable-item>
  }
</wr-sortable-list>`,
    handle: `<wr-sortable-list [(items)]="rows">
  @for (row of rows(); track row.id) {
    <wr-sortable-item>
      <span wrDragHandle>≡</span>
      <span>{{ row.label }}</span>
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
    { name: 'Escape', description: 'Put the held row back where it started.', type: 'key' },
  ];

  protected readonly api = API.WrSortableList;

  protected readonly related: readonly DocApiRow[] = [
    {
      name: '<wr-sortable-item>',
      description: 'One row. Project one per item of your own loop; it carries the drag and the tab stop.',
      type: 'component',
      default: '—',
    },
    {
      name: '[wrDragHandle]',
      description: "Restrict drag start to a handle element. Composes CDK's `cdkDragHandle`.",
      type: 'directive',
      default: '—',
    },
  ];
}
