import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import {
  WrTree,
  type WrTreeCanDrop,
  type WrTreeChildrenLoader,
  type WrTreeMoveEvent,
  type WrTreeNode,
  type WrTreeSize,
  wrMoveTreeNode,
} from 'ngwr/tree';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-tree-page',
  templateUrl: './tree.html',
  imports: [
    FormsModule,
    WrInput,
    WrTree,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TreePageComponent {
  protected readonly folders: readonly WrTreeNode[] = [
    {
      id: 'src',
      label: 'src',
      children: [
        {
          id: 'src/app',
          label: 'app',
          children: [
            { id: 'src/app/app.ts', label: 'app.ts' },
            { id: 'src/app/main.ts', label: 'main.ts' },
            {
              id: 'src/app/components',
              label: 'components',
              children: [
                { id: 'src/app/components/button.ts', label: 'button.ts' },
                { id: 'src/app/components/icon.ts', label: 'icon.ts' },
              ],
            },
          ],
        },
        { id: 'src/styles.scss', label: 'styles.scss' },
      ],
    },
    {
      id: 'public',
      label: 'public',
      children: [
        { id: 'public/favicon.ico', label: 'favicon.ico' },
        { id: 'public/logo.svg', label: 'logo.svg' },
      ],
    },
    { id: 'package.json', label: 'package.json' },
    { id: 'tsconfig.json', label: 'tsconfig.json', disabled: true },
  ];

  protected readonly singleSelected = signal<readonly string[]>([]);
  protected readonly multiSelected = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['src', 'src/app']);

  protected readonly comboSingle = signal<string | null>(null);
  protected readonly sizes: readonly WrTreeSize[] = ['sm', 'md', 'lg'];
  protected readonly comboSized = signal<string | null>(null);
  protected readonly comboMulti = signal<readonly string[]>([]);

  // 5,020-node tree for the virtual-scroll demo.
  protected readonly bigTree: readonly WrTreeNode[] = Array.from({ length: 20 }, (_, g) => ({
    id: `g${g}`,
    label: `Group ${g + 1}`,
    children: Array.from({ length: 250 }, (_, i) => ({ id: `g${g}-i${i}`, label: `Item ${g + 1}.${i + 1}` })),
  }));
  protected readonly bigExpanded = signal<readonly string[]>(Array.from({ length: 20 }, (_, g) => `g${g}`));
  protected readonly bigPick = signal<readonly string[]>([]);

  // Lazy loading: a fake server that answers after 800ms, and fails for one folder.
  protected readonly remote: readonly WrTreeNode[] = [
    { id: 'inbox', label: 'Inbox', hasChildren: true },
    { id: 'archive', label: 'Archive', hasChildren: true },
    { id: 'offline', label: 'Offline share (fails once)', hasChildren: true },
  ];
  private offlineTries = 0;
  protected readonly loadFolder: WrTreeChildrenLoader = node =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (node.id === 'offline' && this.offlineTries++ === 0) {
          reject(new Error('offline'));
          return;
        }
        resolve([
          { id: `${node.id}/2026`, label: '2026', hasChildren: node.id.split('/').length < 2 },
          { id: `${node.id}/notes.md`, label: 'notes.md' },
          { id: `${node.id}/todo.md`, label: 'todo.md' },
        ]);
      }, 800);
    });

  protected readonly filterText = signal('');
  protected readonly filterExpanded = signal<readonly string[]>(['src']);

  protected readonly checked = signal<readonly string[]>(['src/app/app.ts']);

  protected readonly movable = signal<readonly WrTreeNode[]>(this.folders);
  protected readonly movableExpanded = signal<readonly string[]>(['src', 'public']);
  protected readonly lastMove = signal('');
  // Folders take children, files do not.
  protected readonly intoFolders: WrTreeCanDrop = (_node, target) => target.parent === null || !!target.parent.children;

  protected onMove(move: WrTreeMoveEvent): void {
    this.movable.update(nodes => wrMoveTreeNode(nodes, move));
    this.lastMove.set(`${move.node.label}: to ${move.to.parentId ?? 'the root'}, index ${move.to.index}`);
  }

  protected readonly snippets = {
    lazy: `<wr-tree ariaLabel="Mail folders" [nodes]="folders" [loadChildren]="load" />`,

    lazyTs: `folders: WrTreeNode[] = [{ id: 'inbox', label: 'Inbox', hasChildren: true }];

// Called once per node, on its first expand. A Promise, an Observable or an array.
load: WrTreeChildrenLoader = node => this.http.get<WrTreeNode[]>(\`/folders/\${node.id}\`);`,

    filter: `<input wrInput placeholder="Filter files" [(ngModel)]="query" />
<wr-tree ariaLabel="Project files" [nodes]="folders" [(expanded)]="open" [filter]="query()" />`,

    cascade: `<wr-tree
  ariaLabel="Project files"
  [nodes]="folders"
  selectionMode="multi"
  cascade
  [(selected)]="checked"
/>`,

    drag: `<wr-tree
  ariaLabel="Project files"
  draggable
  [nodes]="nodes()"
  [(expanded)]="open"
  [canDrop]="intoFolders"
  (nodeMove)="onMove($event)"
/>`,

    dragTs: `// The tree never writes to nodes: apply the move yourself.
onMove(move: WrTreeMoveEvent): void {
  this.nodes.update(nodes => wrMoveTreeNode(nodes, move));
}

// Folders take children, files do not.
intoFolders: WrTreeCanDrop = (node, target) => target.parent === null || !!target.parent.children;`,

    openFromCode: `<wr-tree #folder openOn="overlay" [nodes]="folders" [(value)]="picked" (opened)="onOpened()" (closed)="onClosed()" />
<button wr-btn [attr.aria-expanded]="folder.isOpen()" (click)="folder.open()">Open</button>`,

    single: `<wr-tree
  ariaLabel="Project files"
  [nodes]="folders"
  [(selected)]="picked"
  [(expanded)]="open"
  selectionMode="single"
/>`,

    multi: `<wr-tree
  ariaLabel="Project files"
  [nodes]="folders"
  [(selected)]="picked"
  selectionMode="multi"
/>`,

    overlaySingle: `<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="single"
  placeholder="Pick a folder"
  [(value)]="picked"
/>`,

    overlaySizes: `<wr-tree openOn="overlay" size="sm" [nodes]="folders" [(value)]="picked" />
<wr-tree openOn="overlay" size="lg" [nodes]="folders" [(value)]="picked" />`,

    overlayMulti: `<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="multi"
  [maxTagCount]="2"
  [defaultExpandAll]="true"
  placeholder="Pick folders"
  [(value)]="picked"
/>`,

    virtual: `<wr-tree
  ariaLabel="Generated folders"
  [nodes]="bigTree"
  [(expanded)]="expanded"
  [(selected)]="picked"
  virtualScroll
  [viewportHeight]="320"
/>`,
  };

  protected readonly api = API.WrTree;

  protected readonly typesApi: readonly DocApiRow[] = [
    {
      name: 'WrTreeNode',
      description:
        '`{ id, label, children?, hasChildren?, disabled? }`. `id` is what `[(selected)]` / `[(expanded)]` carry; a node without `children` is a leaf, unless `hasChildren` says they load on expand.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrTreeChildrenLoader',
      description: '`(node) => WrTreeNode[]`, or a Promise or an Observable of it. What `loadChildren` takes.',
      type: 'type',
      default: '—',
    },
    {
      name: 'WrTreeFilterFn',
      description: '`(node, query) => boolean`. What `filterFn` takes.',
      type: 'type',
      default: '—',
    },
    {
      name: 'WrTreeMoveEvent',
      description:
        '`{ node, from, to }`, each end a `WrTreeMoveEnd`: `{ parentId, index }`, with `parentId` `null` for the root. `to.index` counts the new siblings without the moved node.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrTreeCanDrop',
      description:
        '`(node, target) => boolean`. `target` is a `WrTreeDropTarget`: a `WrTreeMoveEnd` plus the `parent` node, `null` for the root.',
      type: 'type',
      default: '—',
    },
    {
      name: 'wrMoveTreeNode',
      description: '`wrMoveTreeNode(nodes, move)` returns a new array with a `nodeMove` applied. Nothing is mutated.',
      type: 'function',
      default: '—',
    },
  ];
}
