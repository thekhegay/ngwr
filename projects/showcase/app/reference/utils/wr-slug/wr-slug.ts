import { Component, computed, signal } from '@angular/core';

import { wrSlug } from 'ngwr/utils';

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
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-slug-page',
  templateUrl: './wr-slug.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocPlaygroundComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrSlugPage {
  protected readonly snippet = `import { wrSlug } from 'ngwr/utils';

wrSlug('What it costs to adopt');  // 'what-it-costs-to-adopt'
wrSlug('  Data & charts!  ');      // 'data-charts'
wrSlug('v16.9.0');                 // 'v16-9-0'
wrSlug('...');                     // ''
wrSlug(null);                      // ''`;

  protected readonly optionsSnippet = `wrSlug('Data & charts', { separator: '_' });          // 'data_charts'
wrSlug('Signal Forms', { separator: '' });            // 'signalforms'
wrSlug('What it costs to adopt', { maxLength: 14 });  // 'what-it-costs'
wrSlug('Internationalization', { maxLength: 5 });     // 'inter', a first word too long is cut`;

  protected readonly text = signal('What it costs to adopt');
  protected readonly separator = signal('-');
  protected readonly maxLength = signal(40);

  protected readonly slug = computed(() =>
    wrSlug(this.text(), { separator: this.separator(), maxLength: this.maxLength() })
  );

  protected readonly playgroundSnippet = computed(
    () =>
      `wrSlug('${this.text().replace(/[\\']/g, '\\$&')}', { separator: '${this.separator()}', maxLength: ${this.maxLength()} });`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'text', label: 'Text', signal: this.text },
    { kind: 'select', label: 'Separator', signal: this.separator, options: ['-', '_', '.'] },
    { kind: 'slider', label: 'Max length', signal: this.maxLength, min: 4, max: 40 },
  ];

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
      name: 'wrSlug(text, options?)',
      description:
        'The text NFKC-normalised and lower-cased, its words of letters, combining marks and digits joined by the separator. No transliteration. Not injective.',
      type: '(text: string | null | undefined, options?: WrSlugOptions) => string',
      default: '-',
    },
    {
      name: 'options.separator',
      description: "What joins the words. `''` runs them together.",
      type: 'string',
      default: "'-'",
    },
    {
      name: 'options.maxLength',
      description:
        'The longest slug, in UTF-16 code units. Words that do not fit are dropped; a first word longer than the limit is cut between two graphemes.',
      type: 'number',
      default: 'no limit',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Util', title: 'wrRandomId', url: ['/reference/utils', 'wr-random-id'] },
    { kind: 'Util', title: 'wrInitials', url: ['/reference/utils', 'wr-initials'] },
    { kind: 'Pipe', title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ];
}
