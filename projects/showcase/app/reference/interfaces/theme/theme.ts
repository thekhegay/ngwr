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
    color: `const accent: WrColor = 'primary';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrColor',
      description:
        'The five intents. `[color]` on six components takes it, as does `[confirmColor]` on `[wrPopconfirm]`.',
      // Derived from the real tuple rather than retyped. The hand-written
      // mirror that used to sit here fell a member behind the union it
      // documents — on the page that renders that same tuple as badges.
      type: WR_COLORS.map(color => `'${color}'`).join(' | '),
      default: '—',
    },
    {
      name: 'WrThemeMode',
      description: 'The mode you ask `WrTheme` for. `auto` follows the OS.',
      type: "'light' | 'dark' | 'auto'",
      default: '—',
    },
    {
      name: 'WrResolvedTheme',
      description: 'The scheme in effect once `auto` is resolved.',
      type: "'light' | 'dark'",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrTheme', url: ['/reference/services', 'theme'] },
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
  ];
}
