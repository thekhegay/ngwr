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

  protected readonly surnameSnippet = `const surname = { style: 'surname' } as const;
const familyFirst = { style: 'surname', order: 'family-first' } as const;

wrInitials('Roman Khegay', undefined, surname);       // 'Khegay R.'
wrInitials('Ada King Lovelace', undefined, surname);  // 'Lovelace A. K.', the last part is the family name
wrInitials('Jean-Luc Picard', undefined, surname);    // 'Picard J.'
wrInitials('Madonna', undefined, surname);            // 'Madonna', one part comes back as written

wrInitials('Иванов Иван Иванович', undefined, familyFirst);            // 'Иванов И. И.'
wrInitials('Петров-Водкин Кузьма Сергеевич', undefined, familyFirst);  // 'Петров-Водкин К. С.'
wrInitials('Kaya ismail', 'tr', familyFirst);                          // 'Kaya İ.'`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrInitials(name, locale?, options?)',
      description:
        'Up to two initials, one grapheme each, upper-cased. A word is a run between whitespace; its initial is its first letter, digit or emoji. `locale` picks the upper-case mapping; without it the default mapping, the same on the server and the client.',
      type: '(name: string | null | undefined, locale?: string, options?: WrInitialsOptions) => string',
      default: '-',
    },
    {
      name: 'options.style',
      description:
        "`'letters'` gives up to two initials. `'surname'` gives the family name as written, then every other part as an initial and a dot; the one-character rule for Han, Hangul and kana does not apply to it.",
      type: "WrInitialsStyle = 'letters' | 'surname'",
      default: "'letters'",
    },
    {
      name: 'options.order',
      description:
        "Where the family name sits in the input: last for `'given-first'`, first for `'family-first'`. Read by `'surname'` only.",
      type: "WrInitialsOrder = 'given-first' | 'family-first'",
      default: "'given-first'",
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Pipe', title: 'wrInitials', url: ['/reference/pipes', 'wr-initials'] },
    { kind: 'Component', title: 'Avatar', url: ['/reference/components', 'avatar'] },
    { kind: 'Pipe', title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ];
}
