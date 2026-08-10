import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrTree, type WrTreeNode } from 'ngwr/tree';

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
  protected readonly comboMulti = signal<readonly string[]>([]);

  // 5,020-node tree for the virtual-scroll demo.
  protected readonly bigTree: readonly WrTreeNode[] = Array.from({ length: 20 }, (_, g) => ({
    id: `g${g}`,
    label: `Group ${g + 1}`,
    children: Array.from({ length: 250 }, (_, i) => ({ id: `g${g}-i${i}`, label: `Item ${g + 1}.${i + 1}` })),
  }));
  protected readonly bigExpanded = signal<readonly string[]>(Array.from({ length: 20 }, (_, g) => `g${g}`));
  protected readonly bigPick = signal<readonly string[]>([]);

  protected readonly snippets = {
    install: `import { WrTree, type WrTreeNode } from 'ngwr/tree';

@Component({ imports: [WrTree] })
export class MyComponent {
  protected readonly nodes: readonly WrTreeNode[] = [
    { id: 'src', label: 'src', children: [{ id: 'src/app.ts', label: 'app.ts' }] },
  ];
}`,

    single: `<wr-tree
  [nodes]="folders"
  [(selected)]="picked"
  [(expanded)]="open"
  selectionMode="single"
/>`,

    multi: `<wr-tree
  [nodes]="folders"
  [(selected)]="picked"
  selectionMode="multi"
/>

<!-- Cmd / Ctrl + click toggles individual selections. -->`,

    overlaySingle: `<!-- Combobox shape — opens an overlay containing the tree.
     A signal-forms native control (FormValueControl). Replaces wr-tree-select. -->
<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="single"
  placeholder="Pick a folder"
  [(value)]="picked"
/>`,

    overlayMulti: `<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="multi"
  [maxTagCount]="2"
  [defaultExpandAll]="true"
  placeholder="Pick folders"
  [(value)]="picked"
/>`,

    virtual: `<!-- 5,000+ nodes; only ~one viewport of rows stays in the DOM. -->
<wr-tree
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
        '`{ id, label, children?, disabled?, icon? }`. `id` is what `[(selected)]` / `[(expanded)]` carry; a node without `children` is a leaf.',
      type: 'interface',
      default: '—',
    },
  ];
}
