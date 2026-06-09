import { Component, computed, signal } from '@angular/core';

import { Folder, Home as HomeIcon } from 'lucide';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

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

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Separator', signal: this.separator, options: ['/', '›', '→', '·', '|'] as const },
    { kind: 'text', label: 'Aria Label', signal: this.ariaLabel, placeholder: 'Breadcrumbs' },
  ];

  protected readonly snippets = {
    install: `import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';`,
  };

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
      description: 'Label for the `nav` landmark.',
      type: 'string',
      default: "'Breadcrumbs'",
    },
    {
      name: '<wr-breadcrumbs-item>',
      description: 'Single row. Renders `<a>` when linked, `<span aria-current="page">` otherwise.',
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
      type: 'string | unknown[]',
      default: 'null',
    },
    { name: 'href', sub: true, description: 'Plain anchor href.', type: 'string', default: 'null' },
    {
      name: 'external',
      sub: true,
      description: 'Open `href` in a new tab (adds `target="_blank" rel="noreferrer noopener"`).',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'CSS — --wr-breadcrumbs-separator',
      description: 'Override the separator glyph.',
      type: 'string',
      default: "'/'",
    },
    {
      name: 'CSS — --wr-breadcrumbs-gap',
      description: 'Spacing between items and separators.',
      type: 'length',
      default: '0.5rem',
    },
    {
      name: 'CSS — --wr-breadcrumbs-link-color',
      description: 'Link colour.',
      type: 'color',
      default: 'var(--wr-color-primary)',
    },
    {
      name: 'CSS — --wr-breadcrumbs-current-color',
      description: 'Current-page (last) item colour.',
      type: 'color',
      default: 'var(--wr-color-dark)',
    },
    {
      name: 'CSS — --wr-breadcrumbs-separator-color',
      description: 'Separator glyph colour.',
      type: 'color',
      default: 'rgba(var(--wr-color-dark-rgb), 0.3)',
    },
  ];
}
