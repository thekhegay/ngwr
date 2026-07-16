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
      body: 'Wire `provideWrI18n` plus a static or HTTP catalog loader. Two-snippet bootstrap.',
    },
    {
      url: ['/guides/translations', 'usage'] as const,
      title: 'Usage in templates',
      body: 'Three call sites — `| wrT` pipe, `[wrT]` directive, or `inject(WrI18n)` for code.',
    },
    {
      url: ['/guides/translations', 'scopes'] as const,
      title: 'Scopes',
      body: 'Feature-scoped catalogs load on demand. Ship the root, lazy-load the rest.',
    },
    {
      url: ['/guides/translations', 'interpolation'] as const,
      title: 'Interpolation',
      body: '`{{name}}` placeholders and helper formatters for plurals, dates, numbers.',
    },
    {
      url: ['/guides/translations', 'api'] as const,
      title: 'API',
      body: 'Full `WrI18n` reference — every method, signal, and config option.',
    },
  ];
}
