import { Component, inject } from '@angular/core';

import { WrI18n, WrTPipe } from 'ngwr/i18n';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent, DocSeeAlsoComponent, type DocSeeAlsoLink } from '#core/components';

@Component({
  selector: 'ngwr-translate-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [WrSegmented, WrTPipe, WrTypography, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class TranslateOverviewPage {
  private readonly i18n = inject(WrI18n);
  protected readonly locale = this.i18n.locale;
  protected readonly localeOptions: readonly WrSegmentedOption<string>[] = this.i18n
    .available()
    .map(code => ({ value: code, label: code }));

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
