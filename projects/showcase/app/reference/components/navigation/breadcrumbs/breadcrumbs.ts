import { Component, computed, signal } from '@angular/core';

import { Folder, Home as HomeIcon } from 'lucide';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-breadcrumbs-page',
  templateUrl: './breadcrumbs.html',
  imports: [
    WrBreadcrumbs,
    WrBreadcrumbsItem,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ home: HomeIcon, folder: Folder }))],
})
export default class BreadcrumbsPage {
  protected readonly separator = signal('/');
  protected readonly ariaLabel = signal('Breadcrumbs');

  protected readonly snippet = computed(
    () =>
      `<wr-breadcrumbs separator="${this.separator()}" ariaLabel="${this.ariaLabel()}">
  <wr-breadcrumbs-item icon="home" routerLink="/">Home</wr-breadcrumbs-item>
  <wr-breadcrumbs-item icon="folder" routerLink="/docs">Docs</wr-breadcrumbs-item>
  <wr-breadcrumbs-item routerLink="/docs/components">Components</wr-breadcrumbs-item>
  <wr-breadcrumbs-item>Breadcrumbs</wr-breadcrumbs-item>
</wr-breadcrumbs>`
  );

  protected readonly querySnippet = `<wr-breadcrumbs>
  <wr-breadcrumbs-item routerLink="/debts" [queryParams]="{ date: '2026-11-01' }">Debts</wr-breadcrumbs-item>
  <wr-breadcrumbs-item>November 1</wr-breadcrumbs-item>
</wr-breadcrumbs>`;

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Separator', signal: this.separator, options: ['/', '›', '→', '·', '|'] as const },
    { kind: 'text', label: 'Aria Label', signal: this.ariaLabel, placeholder: 'Breadcrumbs' },
  ];

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-breadcrumbs>',
      description: 'Container. Renders `<nav aria-label><ol>…</ol></nav>`.',
      type: 'component',
      default: '—',
    },
    {
      name: 'separator',
      sub: true,
      description: 'Short string drawn between items.',
      type: 'string',
      default: "'/'",
    },
    {
      name: 'ariaLabel',
      sub: true,
      description: 'Name of the `nav` landmark. Falls back to `breadcrumbs.label`.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: '<wr-breadcrumbs-item>',
      description:
        'One item: `.wr-breadcrumbs__link` when linked, `.wr-breadcrumbs__current` (`aria-current="page"`) when not.',
      type: 'component',
      default: '—',
    },
    {
      name: 'icon',
      sub: true,
      description: 'Leading icon from the icon registry.',
      type: 'WrIconName | null',
      default: 'null',
    },
    {
      name: 'routerLink',
      sub: true,
      description: 'Angular router target. Wins over `href`.',
      type: 'string | readonly unknown[] | null',
      default: 'null',
    },
    {
      name: 'queryParams',
      sub: true,
      description:
        'Query parameters for a `routerLink` crumb. A `?` inside `routerLink` is escaped as part of the path.',
      type: 'Params | null',
      default: 'null',
    },
    { name: 'href', sub: true, description: 'Plain anchor href.', type: 'string | null', default: 'null' },
    {
      name: 'external',
      sub: true,
      description: 'Open `href` in a new tab (adds `target="_blank" rel="noreferrer noopener"`).',
      type: 'boolean',
      default: 'false',
    },
  ];
}
