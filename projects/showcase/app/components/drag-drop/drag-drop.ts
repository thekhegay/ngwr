import { Component, signal } from '@angular/core';

import { WrDragHandle, WrSortableList, type WrSortableReorderEvent } from 'ngwr/drag-drop';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

interface Task {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'ngwr-drag-drop-page',
  templateUrl: './drag-drop.html',
  imports: [
    WrSortableList,
    WrDragHandle,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DragDropPage {
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
    install: `import { WrSortableList, WrDragHandle, type WrSortableReorderEvent } from 'ngwr/drag-drop';`,
    basic: `<wr-sortable-list [(items)]="rows" (reorder)="onReorder($event)">
  <ng-template let-row let-i="index">
    <div class="row">{{ i + 1 }}. {{ row.label }}</div>
  </ng-template>
</wr-sortable-list>`,
    handle: `<wr-sortable-list [(items)]="rows">
  <ng-template let-row>
    <div class="row">
      <span wrDragHandle class="grip">≡</span>
      <span>{{ row.label }}</span>
    </div>
  </ng-template>
</wr-sortable-list>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'items',
      description: 'Two-way bound items array. Emits the reordered array after drop.',
      type: 'T[]',
      default: '— (required)',
      required: true,
    },
    {
      name: 'orientation',
      description: "Layout direction. Drives CDK's `cdkDropListOrientation`.",
      type: "'vertical' | 'horizontal'",
      default: "'vertical'",
    },
    { name: 'disabled', description: 'Disable dragging.', type: 'boolean', default: 'false' },
    { name: 'lockAxis', description: 'Restrict drag movement to one axis.', type: "'x' | 'y'", default: '—' },
    {
      name: 'dragStartDelay',
      description:
        'Delay (ms) before a drag begins. The touch delay lets a quick swipe scroll the list while a brief hold starts the drag; mouse stays instant.',
      type: 'number | { touch: number; mouse: number }',
      default: '{ touch: 150, mouse: 0 }',
    },
    {
      name: 'trackBy',
      description: '`trackBy` for the inner `@for`.',
      type: '(i, item) => unknown',
      default: 'identity',
    },
    {
      name: '(reorder)',
      description: 'Fires after a successful reorder with the new array + indices.',
      type: 'EventEmitter<WrSortableReorderEvent<T>>',
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
