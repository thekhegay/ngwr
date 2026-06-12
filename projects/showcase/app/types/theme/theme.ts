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
  selector: 'ngwr-types-theme-page',
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
      type: "'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark'",
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
      url: ['/services', 'theme'],
      description: 'Switches the mode and persists the choice.',
    },
    {
      kind: 'Guide',
      title: 'Configuration',
      url: ['/getting-started', 'configuration'],
      description: 'Overriding the palette and theme tokens.',
    },
  ];
}
