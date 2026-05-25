import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrTreeComponent, type WrTreeNode } from 'ngwr/tree';

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
  templateUrl: './tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTreeComponent,
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

  protected readonly snippets = {
    install: `import { WrTreeComponent, type WrTreeNode } from 'ngwr/tree';

@Component({ imports: [WrTreeComponent] })
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
      name: 'WrTreeNode',
      description: '{ id, label, children?, disabled? }',
      type: 'type',
      default: '—',
    },
  ];
}
