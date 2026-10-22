import { Component, inject } from '@angular/core';

import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-usage-page',
  templateUrl: './usage.html',
  imports: [
    WrTPipe,
    WrTDirective,
    WrSegmented,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class TranslateUsagePage {
  private readonly i18n = inject(WrI18n);
  protected readonly locale = this.i18n.locale;
  protected readonly localeOptions: readonly WrSegmentedOption<string>[] = this.i18n
    .available()
    .map(locale => ({ value: locale, label: locale }));

  protected use(locale: string | null): void {
    if (locale) this.i18n.use(locale);
  }

  protected readonly snippets = {
    pipe: `<h1>{{ 'app.title' | wrT }}</h1>
<p>{{ 'app.hello' | wrT: { name: user().name } }}</p>
<button>{{ 'common.save' | wrT }}</button>`,
    directive: `<h1 [wrT]="'app.title'"></h1>
<p [wrT]="'app.hello'" [wrTParams]="{ name: user().name }"></p>`,
    service: `const i18n = inject(WrI18n);

i18n.use('ru');
i18n.t('app.hello', { name: 'Ada' }); // 'Привет, Ada!'

const title = i18n.translate('app.title'); // Signal<string>`,
  };
}
