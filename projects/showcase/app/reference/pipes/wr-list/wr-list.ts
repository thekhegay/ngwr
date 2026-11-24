import { Component, computed, signal } from '@angular/core';

import { WrList, type WrListType, wrFormatList } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocCodeFile,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const LOCALES: readonly (readonly [locale: string, names: readonly string[]])[] = [
  ['en-GB', ['Ada', 'Alan', 'Grace']],
  ['de', ['Ada', 'Alan', 'Grace']],
  ['es', ['Ada', 'Alan', 'Grace']],
  ['ru', ['Ада', 'Алан', 'Грейс']],
  ['ja', ['エイダ', 'アラン', 'グレース']],
];

@Component({
  selector: 'ngwr-pipe-wr-list-page',
  templateUrl: './wr-list.html',
  imports: [
    WrList,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
  ],
})
export default class WrListPipePage {
  protected readonly names = ['Ada', 'Alan', 'Grace'];
  protected readonly parts = ['5 kg', '200 g'];

  protected readonly locales = LOCALES.map(([locale, names]) => ({
    locale,
    and: wrFormatList(names, locale),
    or: wrFormatList(names, locale, 'disjunction'),
  }));

  protected readonly text = signal('Ada, Alan, Grace');
  protected readonly type = signal<WrListType>('conjunction');
  protected readonly style = signal<Intl.ListFormatStyle>('long');

  protected readonly items = computed(() =>
    this.text()
      .split(',')
      .map(item => item.trim())
  );
  protected readonly options = computed<Intl.ListFormatOptions>(() => ({ type: this.type(), style: this.style() }));

  protected readonly playgroundSnippet = computed(
    () => `{{ items | wrList: { type: '${this.type()}', style: '${this.style()}' } }}`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'text', label: 'Items, comma-separated', signal: this.text },
    { kind: 'select', label: 'Type', signal: this.type, options: ['conjunction', 'disjunction', 'unit'] },
    { kind: 'select', label: 'Style', signal: this.style, options: ['long', 'short', 'narrow'] },
  ];

  protected readonly basicFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<p>{{ names | wrList }}</p>
<p>{{ names | wrList: 'disjunction' }}</p>
<p>{{ parts | wrList: 'unit' }}</p>
<p>{{ parts | wrList: { type: 'unit', style: 'narrow' } }}</p>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component } from '@angular/core';

import { WrList } from 'ngwr/pipes';

@Component({
  selector: 'app-team',
  templateUrl: './team.html',
  imports: [WrList],
})
export class Team {
  protected readonly names = ['Ada', 'Alan', 'Grace'];
  protected readonly parts = ['5 kg', '200 g'];
}`,
    },
  ];

  protected readonly snippets = {
    fn: `import { wrFormatList } from 'ngwr/pipes';

wrFormatList(['Ada', 'Alan', 'Grace'], 'en-GB');                // "Ada, Alan and Grace"
wrFormatList(['Ada', 'Alan', 'Grace'], 'en-GB', 'disjunction'); // "Ada, Alan or Grace"
wrFormatList(['Ада', 'Алан', 'Грейс'], 'ru');                   // "Ада, Алан и Грейс"`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrList',
      description:
        'Joins the items through `Intl.ListFormat` in `LOCALE_ID`. Takes a type shortcut or the full options object. Blank items are left out; `null`, `undefined` and an empty list give an empty string.',
      type: "(value: Iterable<string> | null | undefined, typeOrOptions: WrListType | Intl.ListFormatOptions = 'conjunction') => string",
      default: '-',
    },
    {
      name: 'wrFormatList',
      description: 'The pipe as a function, in the locale given.',
      type: "(value: Iterable<string> | null | undefined, locale: string, typeOrOptions: WrListType | Intl.ListFormatOptions = 'conjunction') => string",
      default: '-',
    },
    {
      name: 'WrListType',
      description: 'What joins the last item: "and", "or", or nothing, for a compound unit.',
      type: "'conjunction' | 'disjunction' | 'unit'",
      default: "'conjunction'",
    },
    {
      name: 'options.style',
      description: 'How much of the joining word is written, as `Intl.ListFormat` reads it.',
      type: "'long' | 'short' | 'narrow'",
      default: "'long'",
    },
  ];
}
