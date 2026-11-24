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
  selector: 'ngwr-utl-wr-slug-page',
  templateUrl: './wr-slug.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrSlugPage {
  protected readonly snippet = `import { wrSlug } from 'ngwr/utils';

wrSlug('What it costs to adopt');  // 'what-it-costs-to-adopt'
wrSlug('  Data & charts!  ');      // 'data-charts'
wrSlug('v16.9.0');                 // 'v16-9-0'
wrSlug('...');                     // ''
wrSlug(null);                      // ''`;

  protected readonly scriptsSnippet = `wrSlug('Привет, мир!');            // 'привет-мир'
wrSlug('Қазақстан Республикасы');  // 'қазақстан-республикасы'
wrSlug('Café au lait');            // 'café-au-lait'
wrSlug('नमस्ते दुनिया');              // 'नमस्ते-दुनिया'
wrSlug('ＡＢＣ １２３');            // 'abc-123', full-width forms fold into plain ones`;

  protected readonly tiesSnippet = `wrSlug('Data & charts');  // 'data-charts'
wrSlug('Data / charts');  // 'data-charts'

const taken = new Set<string>();

function uniqueId(title: string): string {
  const slug = wrSlug(title) || 'section';
  let id = slug;
  for (let n = 2; taken.has(id); n++) id = \`\${slug}-\${n}\`;
  taken.add(id);
  return id;
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrSlug(text)',
      description:
        'The text NFKC-normalised and lower-cased, every run of characters that are not a letter, a combining mark or a digit replaced by one `-`, with none at either end. No transliteration. Not injective.',
      type: '(text: string | null | undefined) => string',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Util', title: 'wrRandomId', url: ['/reference/utils', 'wr-random-id'] },
    { kind: 'Util', title: 'wrInitials', url: ['/reference/utils', 'wr-initials'] },
    { kind: 'Pipe', title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ];
}
