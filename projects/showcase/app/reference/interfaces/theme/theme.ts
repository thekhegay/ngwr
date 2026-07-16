import { Component } from '@angular/core';

import { WrBadge } from 'ngwr/badge';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-interfaces-theme-page',
  templateUrl: './theme.html',
  imports: [
    WrBadge,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class ThemeTypesPage {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import type { WrColor, WrThemeMode, WrResolvedTheme } from 'ngwr/theme';`,
    color: `const accent: WrColor = 'primary';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrColor',
      description: 'Palette names accepted by every `[color]` input.',
      // Derived from the real tuple rather than retyped. The hand-written
      // mirror that used to sit here fell a member behind the union it
      // documents — on the page that renders that same tuple as badges.
      type: WR_COLORS.map(color => `'${color}'`).join(' | '),
      default: '—',
    },
    {
      name: 'WrThemeMode',
      description: 'What the consumer asks `WrTheme` for — `auto` follows the OS.',
      type: "'light' | 'dark' | 'auto'",
      default: '—',
    },
    {
      name: 'WrResolvedTheme',
      description: 'What is actually applied to the DOM after resolving `auto`.',
      type: "'light' | 'dark'",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
      description: 'Switches the mode and persists the choice.',
    },
    {
      kind: 'Guide',
      title: 'Configuration',
      url: ['/start', 'configuration'],
      description: 'Overriding the palette and theme tokens.',
    },
  ];
}
