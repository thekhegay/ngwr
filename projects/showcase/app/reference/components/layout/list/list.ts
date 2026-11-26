import { Component, computed, signal } from '@angular/core';

import { WrList, WrListItem } from 'ngwr/list';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

interface Row {
  readonly label: string;
  readonly meta: string;
}

@Component({
  selector: 'ngwr-list-page',
  templateUrl: './list.html',
  imports: [
    WrList,
    WrListItem,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class ListPage {
  protected readonly bordered = signal(true);
  protected readonly dividers = signal(true);
  protected readonly dense = signal(false);
  protected readonly interactive = signal(true);
  protected readonly lastPick = signal<string | null>(null);
  protected readonly folder = signal<string | null>('Invoices');
  protected readonly folders = signal<readonly string[]>(['Reports']);

  protected readonly selectableSnippet = `<wr-list selection="single" ariaLabel="Folder" [(value)]="folder">
  <wr-list-item value="reports">Reports</wr-list-item>
  <wr-list-item value="invoices">Invoices</wr-list-item>
</wr-list>

<wr-list selection="multiple" ariaLabel="Folders" [(value)]="folders">
  <wr-list-item value="reports">Reports</wr-list-item>
  <wr-list-item value="invoices">Invoices</wr-list-item>
</wr-list>`;

  protected readonly rows: readonly Row[] = [
    { label: 'Reports', meta: '12' },
    { label: 'Invoices', meta: '4' },
    { label: 'Customers', meta: '128' },
    { label: 'Settings', meta: '—' },
  ];

  protected pick(label: string): void {
    if (!this.interactive()) return;
    this.lastPick.set(label);
  }

  protected readonly snippet = computed(
    () =>
      `<wr-list ${this.bordered() ? 'bordered ' : ''}${this.dividers() ? 'dividers ' : ''}${this.dense() ? 'dense' : ''}>
  <wr-list-item ${this.interactive() ? 'interactive' : ''}>
    <span ngProjectAs="[wrListItemLeading]">📁</span>
    Reports
    <span ngProjectAs="[wrListItemTrailing]">12</span>
  </wr-list-item>
</wr-list>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'toggle', label: 'Bordered', signal: this.bordered },
    { kind: 'toggle', label: 'Dividers', signal: this.dividers },
    { kind: 'toggle', label: 'Dense', signal: this.dense },
    { kind: 'toggle', label: 'Interactive rows', signal: this.interactive },
  ];

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-list>',
      description: 'Container. Renders `<ul role="list">`.',
      type: 'component',
      default: '—',
    },
    {
      name: 'bordered',
      sub: true,
      description: 'Card-style border and radius.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'dividers',
      sub: true,
      description: 'Thin border between consecutive items.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'dense', sub: true, description: 'Compact vertical padding.', type: 'boolean', default: 'false' },
    {
      name: 'ariaLabel',
      sub: true,
      description: 'Optional accessible label for the list.',
      type: 'string',
      default: "''",
    },
    {
      name: 'selection',
      sub: true,
      description: 'Makes the list a `role="listbox"` of options the user picks from.',
      type: "'single' | 'multiple' | null",
      default: 'null',
    },
    {
      name: 'value',
      sub: true,
      description: "The picked row's `value` under `single`, an array under `multiple`. Two-way, or `[formField]`.",
      type: 'unknown',
      default: 'null',
    },
    {
      name: 'disabled',
      sub: true,
      description: 'Disables a selectable list: no row takes focus or a click.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'readonly',
      sub: true,
      description: 'Refuses a pick while the rows stay focusable.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: '(touch)',
      sub: true,
      description: 'Focus left a selectable list.',
      type: 'void',
      default: '—',
    },
    {
      name: '<wr-list-item>',
      description: 'Row with three projection slots: `[wrListItemLeading]`, default body, `[wrListItemTrailing]`.',
      type: 'component',
      default: '—',
    },
    {
      name: 'interactive',
      sub: true,
      description: 'Hover state, a tab stop and Enter / Space activation.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'value',
      sub: true,
      description: 'What the row stands for in a selectable list.',
      type: 'unknown',
      default: 'undefined',
    },
    {
      name: 'disabled',
      sub: true,
      description: 'Dims the row and blocks interaction.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
