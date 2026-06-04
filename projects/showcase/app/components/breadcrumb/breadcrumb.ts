import { Component, computed, signal } from '@angular/core';

import { WrBreadcrumb, WrBreadcrumbItem } from 'ngwr/breadcrumb';

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
  selector: 'ngwr-breadcrumb-page',
  templateUrl: './breadcrumb.html',
  imports: [
    WrBreadcrumb,
    WrBreadcrumbItem,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BreadcrumbPage {
  protected readonly separator = signal('/');
  protected readonly ariaLabel = signal('Breadcrumb');

  protected readonly snippet = computed(
    () =>
      `<wr-breadcrumb separator="${this.separator()}" ariaLabel="${this.ariaLabel()}">
  <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
  <wr-breadcrumb-item routerLink="/docs">Docs</wr-breadcrumb-item>
  <wr-breadcrumb-item routerLink="/docs/components">Components</wr-breadcrumb-item>
  <wr-breadcrumb-item>Breadcrumb</wr-breadcrumb-item>
</wr-breadcrumb>`,
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Separator', signal: this.separator, options: ['/', '›', '→', '·', '|'] as const },
    { kind: 'text', label: 'Aria Label', signal: this.ariaLabel, placeholder: 'Breadcrumb' },
  ];

  protected readonly snippets = {
    install: `import { WrBreadcrumb, WrBreadcrumbItem } from 'ngwr/breadcrumb';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: '<wr-breadcrumb>', description: 'Container — renders `<nav aria-label><ol>…</ol></nav>`.', type: 'component', default: '—' },
    { name: '└ separator', description: 'Glyph rendered between items via CSS `::before`. Any short string.', type: 'string', default: "'/'" },
    { name: '└ ariaLabel', description: 'Label for the `nav` landmark.', type: 'string', default: "'Breadcrumb'" },
    { name: '<wr-breadcrumb-item>', description: 'Single row. Renders `<a>` when linked, `<span aria-current="page">` otherwise.', type: 'component', default: '—' },
    { name: '└ routerLink', description: 'Angular router target. Wins over `href`.', type: 'string | unknown[]', default: 'null' },
    { name: '└ href', description: 'Plain anchor href.', type: 'string', default: 'null' },
    { name: '└ external', description: 'Open `href` in a new tab (adds `target="_blank" rel="noreferrer noopener"`).', type: 'boolean', default: 'false' },
    { name: 'CSS — --wr-breadcrumb-separator', description: 'Override the separator glyph.', type: 'string', default: "'/'" },
    { name: 'CSS — --wr-breadcrumb-gap', description: 'Spacing between items and separators.', type: 'length', default: '0.5rem' },
    { name: 'CSS — --wr-breadcrumb-link-color', description: 'Link colour.', type: 'color', default: 'var(--wr-color-primary)' },
    { name: 'CSS — --wr-breadcrumb-current-color', description: 'Current-page (last) item colour.', type: 'color', default: 'var(--wr-color-dark)' },
    { name: 'CSS — --wr-breadcrumb-separator-color', description: 'Separator glyph colour.', type: 'color', default: 'rgba(var(--wr-color-dark-rgb), 0.3)' },
  ];
}
