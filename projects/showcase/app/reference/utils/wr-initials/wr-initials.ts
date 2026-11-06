import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-initials-page',
  templateUrl: './wr-initials.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrInitialsPage {
  protected readonly snippet = `import { wrInitials } from 'ngwr/utils';

wrInitials('Roman Khegay');        // 'RK'
wrInitials('  ada   lovelace  ');  // 'AL'
wrInitials('Ada King Lovelace');   // 'AK'
wrInitials('Jean-Luc Picard');     // 'JP'
wrInitials('Madonna');             // 'M'
wrInitials(null);                  // ''`;

  protected readonly scriptsSnippet = `wrInitials('👩🏽‍🚀 Valentina');   // '👩🏽‍🚀V', one grapheme each
wrInitials('émile zola');         // 'ÉZ'
wrInitials('ßen müller');         // 'ßM', an upper case of two letters is kept as written
wrInitials('王小明');              // '王', one character for Han, Hangul and kana
wrInitials('محمد علي');           // 'مع'
wrInitials('ismail', 'tr');       // 'İ', the locale's mapping`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrInitials(name, locale?)',
      description:
        'Up to two initials, one grapheme each, upper-cased. A word is a run between whitespace; its initial is its first letter, digit or emoji. `locale` picks the upper-case mapping; without it the default mapping, the same on the server and the client.',
      type: '(name: string | null | undefined, locale?: string) => string',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Pipe', title: 'wrInitials', url: ['/reference/pipes', 'wr-initials'] },
    { kind: 'Component', title: 'Avatar', url: ['/reference/components', 'avatar'] },
    { kind: 'Pipe', title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ];
}
