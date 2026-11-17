import { Component, computed, signal } from '@angular/core';

import { Folder, Home as HomeIcon } from 'lucide';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { wrLucideIcons, provideWrIcons } from 'ngwr/icon';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
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
    DocSnippetComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(wrLucideIcons({ home: HomeIcon, folder: Folder }))],
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

  protected readonly truncateSnippet = `<wr-breadcrumbs truncate style="--wr-breadcrumbs-item-max-width: 10rem">
  <wr-breadcrumbs-item routerLink="/">Workspace</wr-breadcrumbs-item>
  <wr-breadcrumbs-item routerLink="/boards/7">Quarterly revenue forecast for the northern region</wr-breadcrumbs-item>
  <wr-breadcrumbs-item>Task 12</wr-breadcrumbs-item>
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
      name: 'truncate',
      sub: true,
      description: 'One line per item, a long one ends in an ellipsis. A cut item shows its full text on hover.',
      type: 'boolean',
      default: 'false',
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
