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
     Form-bound via ControlValueAccessor. Replaces wr-tree-select. -->
<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="single"
  placeholder="Pick a folder"
  [(ngModel)]="picked"
/>`,

    overlayMulti: `<wr-tree
  openOn="overlay"
  [nodes]="folders"
  selectionMode="multi"
  [maxTagCount]="2"
  [defaultExpandAll]="true"
  placeholder="Pick folders"
  [(ngModel)]="picked"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'nodes',
      description: 'Tree data — array of WrTreeNode<TId>.',
      type: 'readonly WrTreeNode[]',
      default: '[]',
    },
    { name: '[(selected)]', description: 'Selected node ids (two-way).', type: 'readonly TId[]', default: '[]' },
    { name: '[(expanded)]', description: 'Expanded node ids (two-way).', type: 'readonly TId[]', default: '[]' },
    {
      name: 'selectionMode',
      description: 'Selection behavior.',
      type: "'none' | 'single' | 'multi'",
      default: "'single'",
    },
    { name: 'disabled', description: 'Disable the whole tree.', type: 'boolean', default: 'false' },
    {
      name: 'openOn',
      description:
        '`inline` (default) renders the tree in place. `overlay` renders a combobox-style trigger that opens a popover containing the tree, with ControlValueAccessor. Replaces the standalone `wr-tree-select`.',
      type: "'inline' | 'overlay'",
      default: "'inline'",
    },
    {
      name: 'placeholder',
      description: 'Overlay mode — placeholder shown on the trigger.',
      type: 'string',
      default: "''",
    },
    {
      name: 'clearable',
      description: 'Overlay mode — show a clear-all (×) button when a node is selected.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'maxTagCount',
      description: 'Overlay + multi mode — cap chips rendered before collapsing into `+N more`. `0` = render all.',
      type: 'number',
      default: '0',
    },
    {
      name: 'defaultExpandAll',
      description: 'Overlay mode — auto-expand every parent on first open.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'WrTreeNode',
      description: '{ id, label, children?, disabled? }',
      type: 'interface',
      default: '—',
    },
  ];
}
