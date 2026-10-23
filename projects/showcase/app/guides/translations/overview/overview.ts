import { Component, inject, signal } from '@angular/core';

import { WrCard } from 'ngwr/card';
import { WrEmpty } from 'ngwr/empty';
import { WrFileUpload } from 'ngwr/file-upload';
import { WrFormField } from 'ngwr/form';
import { WrI18n, WrTPipe } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { WrPagination } from 'ngwr/pagination';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrSelect } from 'ngwr/select';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent, DocSeeAlsoComponent, type DocSeeAlsoLink } from '#core/components';

/** Options that read the same in every language, so what changes is the select's own text. */
const FORMATS = ['CSV', 'JSON', 'PDF', 'XLSX', 'XML'] as const;

@Component({
  selector: 'ngwr-translate-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [
    WrCard,
    WrEmpty,
    WrFileUpload,
    WrFormField,
    WrInput,
    WrPagination,
    WrSegmented,
    WrSelect,
    WrTPipe,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSeeAlsoComponent,
  ],
})
export default class TranslateOverviewPage {
  private readonly i18n = inject(WrI18n);
  protected readonly locale = this.i18n.locale;
  protected readonly localeOptions: readonly WrSegmentedOption<string>[] = this.i18n
    .available()
    .map(code => ({ value: code, label: code }));

  protected readonly page = signal(1);
  protected readonly formats = FORMATS;
  protected readonly format = signal<string | null>(null);

  protected use(locale: string | null): void {
    if (locale) this.i18n.use(locale);
  }

  private readonly cards = [
    {
      url: '/guides/translations/setup',
      title: 'Setup & loaders',
      body: 'Providers, loaders and the shipped catalogs.',
    },
    {
      url: '/guides/translations/usage',
      title: 'Usage in templates',
      body: 'The wrT pipe, the wrT directive and the WrI18n service.',
    },
    {
      url: '/guides/translations/scopes',
      title: 'Scopes',
      body: 'Load a feature’s catalog when the feature loads.',
    },
    {
      url: '/guides/translations/interpolation',
      title: 'Interpolation',
      body: 'Fill {{name}} placeholders with values.',
    },
    {
      url: '/reference/services/i18n',
      title: 'API reference',
      body: 'Every method, signal and provider.',
    },
  ];

  protected readonly sections: readonly DocSeeAlsoLink[] = this.cards.map(({ title, url, body }) => ({
    title,
    url: [url],
    description: body,
  }));
}
