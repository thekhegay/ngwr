import { Component, signal } from '@angular/core';

import { WrInitials } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-initials-page',
  templateUrl: './wr-initials.html',
  imports: [
    WrInitials,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrInitialsPipePage {
  protected readonly names = [
    'Roman Khegay',
    'ada lovelace',
    'Madonna',
    'Хегай Роман',
    '王小明',
    'محمد علي',
    '👩🏽‍🚀 Valentina',
  ];

  protected readonly name = signal('Ada King Lovelace');

  protected readonly controls: readonly DocControl[] = [{ kind: 'text', label: 'Name', signal: this.name }];

  protected readonly snippets = {
    basic: `{{ 'Roman Khegay' | wrInitials }}   <!-- "RK" -->
{{ 'Madonna' | wrInitials }}        <!-- "M"  -->
{{ '王小明' | wrInitials }}          <!-- "王" -->`,
    playground: `{{ name | wrInitials }}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrInitials',
      description:
        'Up to two initials of a name, one grapheme each, upper-cased in `LOCALE_ID`. `wrInitials()` from `ngwr/utils` with the app locale.',
      type: '(value: string | null | undefined) => string',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Util', title: 'wrInitials', url: ['/reference/utils', 'wr-initials'] },
    { kind: 'Component', title: 'Avatar', url: ['/reference/components', 'avatar'] },
    { kind: 'Pipe', title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ];
}
