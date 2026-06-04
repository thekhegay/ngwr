import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { WrTreeNode } from 'ngwr/tree';
import { WrTreeSelect } from 'ngwr/tree-select';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tree-select-page',
  templateUrl: './tree-select.html',
  imports: [
    FormsModule,
    JsonPipe,
    WrTreeSelect,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TreeSelectPage {
  protected readonly folders: readonly WrTreeNode[] = [
    {
      id: 'docs',
      label: 'Documents',
      children: [
        {
          id: 'docs/work',
          label: 'Work',
          children: [
            { id: 'docs/work/q1', label: 'Q1 plan' },
            { id: 'docs/work/q2', label: 'Q2 plan' },
          ],
        },
        { id: 'docs/personal', label: 'Personal' },
      ],
    },
    {
      id: 'src',
      label: 'src',
      children: [
        { id: 'src/lib', label: 'lib' },
        { id: 'src/showcase', label: 'showcase' },
      ],
    },
    { id: 'readme', label: 'README.md' },
  ];

  protected readonly picked = signal<string | null>('docs/work/q1');
  protected readonly pickedMany = signal<readonly string[]>(['docs/work/q1', 'src/lib']);

  protected readonly snippets = {
    install: `import { WrTreeSelect } from 'ngwr/tree-select';
import type { WrTreeNode } from 'ngwr/tree';`,
    single: `<wr-tree-select
  [nodes]="folders"
  [(ngModel)]="picked"
  placeholder="Pick a folder"
  defaultExpandAll
/>`,
    multi: `<wr-tree-select
  [nodes]="folders"
  selectionMode="multi"
  [(ngModel)]="pickedMany"
  [maxTagCount]="3"
  placeholder="Pick folders"
  defaultExpandAll
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'nodes',
      description: 'Tree data — `WrTreeNode[]`. Each node has `id`, `label`, optional `children` + `disabled`.',
      type: 'readonly WrTreeNode<TId>[]',
      default: '— (required)',
      required: true,
    },
    {
      name: 'selectionMode',
      description: 'Pass-through to the inner `<wr-tree>`.',
      type: "'single' | 'multi' | 'none'",
      default: "'single'",
    },
    { name: 'placeholder', description: 'Shown when no node is selected.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Disable the picker.', type: 'boolean', default: 'false' },
    { name: 'clearable', description: 'Show a clear-all (×) button.', type: 'boolean', default: 'true' },
    {
      name: 'maxTagCount',
      description: 'Cap on chips before collapsing into `+N more` (multi mode). `0` = render all.',
      type: 'number',
      default: '0',
    },
    {
      name: 'defaultExpandAll',
      description: 'Expand every node with children on first open.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'ngModel / formControl',
      description: 'Single mode: `TId | null`. Multi mode: `readonly TId[]`.',
      type: 'TId | TId[] | null',
      default: '—',
    },
  ];
}
