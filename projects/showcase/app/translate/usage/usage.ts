import { Component, inject, signal } from '@angular/core';

import { WrI18n, WrTDirective, WrTPipe } from 'ngwr/i18n';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-usage-page',
  templateUrl: './usage.html',
  imports: [
    WrTPipe,
    WrTDirective,
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
  protected readonly available = this.i18n.available();
  protected readonly name = signal('Ada');

  protected use(locale: string): void {
    this.i18n.use(locale);
  }

  protected readonly snippets = {
    pipe: `<h1>{{ 'app.title' | wrT }}</h1>
<p>{{ 'app.hello' | wrT: { name: user().name } }}</p>
<button>{{ 'common.save' | wrT }}</button>`,
    directive: `<h1 [wrT]="'app.title'"></h1>
<p [wrT]="'app.hello'" [wrTParams]="{ name: user().name }"></p>`,
    service: `const i18n = inject(WrI18n);
i18n.use('ru');                                 // switch locale
i18n.t('app.hello', { name: 'Ada' });           // → 'Привет, Ada!'

// Reactive lookup — re-runs on locale change:
const title = i18n.translate('app.title');
effect(() => console.log(title()));`,
  };
}
