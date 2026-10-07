import { Component, computed, signal } from '@angular/core';

import { WrList, WrListItem } from 'ngwr/list';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

interface Row {
  readonly label: string;
  readonly meta: string;
}

@Component({
  selector: 'ngwr-list-page',
  templateUrl: './list.html',
  imports: [WrList, WrListItem, DocPageComponent, DocSectionComponent, DocPlaygroundComponent, DocApiComponent],
})
export default class ListPage {
  protected readonly bordered = signal(true);
  protected readonly dividers = signal(true);
  protected readonly dense = signal(false);
  protected readonly interactive = signal(true);
  protected readonly lastPick = signal<string | null>(null);

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

  protected readonly snippets = {};

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-list>',
      description: 'Container — renders `<ul role="list">` inside.',
      type: 'component',
      default: '—',
    },
    {
      name: 'bordered',
      sub: true,
      description: 'Wrap in a card-style border + radius.',
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
      name: '<wr-list-item>',
      description: 'Row with three projection slots: `[wrListItemLeading]`, default body, `[wrListItemTrailing]`.',
      type: 'component',
      default: '—',
    },
    {
      name: 'interactive',
      sub: true,
      description:
        'Hover + cursor pointer, a tab stop, and Enter/Space activation. The `listitem` role is there either way.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'disabled',
      sub: true,
      description: 'Visual disabled + suppresses interaction.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
