import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrPlural } from 'ngwr/pipes';
import { WrSlider } from 'ngwr/slider';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-plural-page',
  templateUrl: './wr-plural.html',
  imports: [
    FormsModule,
    WrPlural,
    WrSlider,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WrPluralPipePage {
  protected readonly count = signal(1);

  protected readonly en = { one: 'comment', other: 'comments' } as const;
  protected readonly ru = { one: 'файл', few: 'файла', other: 'файлов' } as const;

  protected readonly snippets = {
    install: `import { WrPlural } from 'ngwr/pipes';

@Component({ imports: [WrPlural] })
export class MyComponent { /* ... */ }`,

    usage: `{{ 1 | wrPlural: { one: 'comment', other: 'comments' } }}
<!-- "1 comment" -->

{{ 5 | wrPlural: { one: 'файл', few: 'файла', other: 'файлов' } : { locale: 'ru' } }}
<!-- "5 файлов" -->

{{ count() | wrPlural: forms : { includeValue: false } }}
<!-- word only -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrPlural',
      description:
        'Picks the word form for a count via `Intl.PluralRules`. Forms are keyed by CLDR category (`zero`/`one`/`two`/`few`/`many`/`other`); missing keys fall back to `other`.',
      type: '(value: number, forms: WrPluralForms, options?: WrPluralOptions) => string',
      default: '—',
    },
    {
      name: 'options.includeValue',
      description: 'Prefix the locale-formatted count before the word.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'options.locale',
      description: "Locale override; defaults to Angular's `LOCALE_ID`.",
      type: 'string',
      default: 'LOCALE_ID',
    },
  ];
}
