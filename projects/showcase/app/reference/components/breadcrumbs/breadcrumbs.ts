import { Component, computed, signal } from '@angular/core';

import { Folder, Home as HomeIcon } from 'lucide';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
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

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Separator', signal: this.separator, options: ['/', '›', '→', '·', '|'] as const },
    { kind: 'text', label: 'Aria Label', signal: this.ariaLabel, placeholder: 'Breadcrumbs' },
  ];

  protected readonly snippets = {};

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '<wr-breadcrumbs>',
      description: 'Container — renders `<nav aria-label><ol>…</ol></nav>`.',
      type: 'component',
      default: '—',
    },
    {
      name: 'separator',
      sub: true,
      description: 'Glyph rendered between items via CSS `::before`. Any short string.',
      type: 'string',
      default: "'/'",
    },
    {
      name: 'ariaLabel',
      sub: true,
      description:
        'Accessible name for the `nav` landmark. Falls back to the `breadcrumbs.label` catalog key, then `Breadcrumbs`.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: '<wr-breadcrumbs-item>',
      description:
        'Single row. The host element IS the row — `<wr-breadcrumbs-item role="listitem">` — and holds an `<a class="wr-breadcrumbs__link">` when linked or an `<a class="wr-breadcrumbs__current" aria-current="page">` when it is the page you are on. Both are anchors; the current one simply has nowhere to go.',
      type: 'component',
      default: '—',
    },
    {
      name: 'icon',
      sub: true,
      description: 'Optional leading icon (from the wr-icon registry) rendered inline before the label.',
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
