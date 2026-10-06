import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { type WrGraphEdge, type WrGraphNode, WrGraph, WrGraphNodeTemplate } from 'ngwr/graph';
import { WrIcon } from 'ngwr/icon';
import { WrPagination } from 'ngwr/pagination';
import { WrDragHandle, WrSortableItem, WrSortableList } from 'ngwr/sortable-list';
import { WrTheme } from 'ngwr/theme';
import { type WrTreeNode, WrTree } from 'ngwr/tree';
import { WrVirtualScroll } from 'ngwr/virtual-scroll';

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    WrButton,
    WrDragHandle,
    WrGraph,
    WrGraphNodeTemplate,
    WrIcon,
    WrPagination,
    WrSortableItem,
    WrSortableList,
    WrTree,
    WrVirtualScroll,
  ],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  // --- Sortable list ------------------------------------------------------
  protected readonly rows = signal([
    { id: 'a', label: 'Draft the brief' },
    { id: 'b', label: 'Review with design' },
    { id: 'c', label: 'Ship it' },
  ]);
  protected readonly reordered = signal('—');
  protected onReorder(e: unknown): void {
    this.reordered.set(JSON.stringify(e));
  }

  // --- Pagination ---------------------------------------------------------
  protected readonly page = signal(1);
  protected readonly pageSm = signal(1);
  protected readonly pageMd = signal(1);
  protected readonly pageLg = signal(1);
  protected readonly pageRounded = signal(1);
  protected readonly pageSquare = signal(1);

  // --- Tree ---------------------------------------------------------------
  protected readonly folders: readonly WrTreeNode[] = [
    {
      id: 'src',
      label: 'src',
      children: [
        { id: 'app', label: 'app', children: [{ id: 'main', label: 'main.ts' }] },
        { id: 'styles', label: 'styles.scss' },
      ],
    },
    { id: 'docs', label: 'docs', children: [{ id: 'readme', label: 'README.md' }] },
  ];
  protected readonly picked = signal<readonly string[]>([]);
  protected readonly open = signal<readonly string[]>(['src']);
  protected readonly pickedMulti = signal<readonly string[]>([]);
  protected readonly openMulti = signal<readonly string[]>(['src']);

  // --- Graph --------------------------------------------------------------
  protected readonly nodes: readonly WrGraphNode[] = [
    { id: 'draft', label: 'Draft' },
    { id: 'review', label: 'Review' },
    { id: 'legal', label: 'Legal' },
    { id: 'publish', label: 'Publish' },
  ];
  protected readonly edges: readonly WrGraphEdge[] = [
    { from: 'draft', to: 'review' },
    { from: 'review', to: 'legal' },
    { from: 'review', to: 'publish' },
  ];

  // --- Virtual scroll -----------------------------------------------------
  protected readonly manyRows = Array.from({ length: 5000 }, (_, i) => `Row ${i + 1}`);
}
