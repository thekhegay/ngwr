import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrI18n, WrTPipe } from 'ngwr/i18n';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [RouterLink, WrTPipe, WrTypography, DocPageComponent, DocSectionComponent],
})
export default class TranslateOverviewPage {
  private readonly i18n = inject(WrI18n);
  protected readonly locale = this.i18n.locale;
  protected readonly available = this.i18n.available();

  protected use(locale: string): void {
    this.i18n.use(locale);
  }

  protected readonly cards = [
    {
      url: ['/guides/translations', 'setup'] as const,
      title: 'Setup & loaders',
      body: 'Providers, loaders and the shipped catalogs.',
    },
    {
      url: ['/guides/translations', 'usage'] as const,
      title: 'Usage in templates',
      body: 'The wrT pipe, the wrT directive and the WrI18n service.',
    },
    {
      url: ['/guides/translations', 'scopes'] as const,
      title: 'Scopes',
      body: 'Load a feature’s catalog when the feature loads.',
    },
    {
      url: ['/guides/translations', 'interpolation'] as const,
      title: 'Interpolation',
      body: 'Fill {{name}} placeholders with values.',
    },
    {
      url: ['/reference/services', 'i18n'] as const,
      title: 'API reference',
      body: 'Every method, signal and provider.',
    },
  ];
}
