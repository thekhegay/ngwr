import { Component, inject, signal } from '@angular/core';

import { WrI18n, WrTPipe } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-translate-interpolation-page',
  templateUrl: './interpolation.html',
  imports: [
    WrInput,
    WrTPipe,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class TranslateInterpolationPage {
  private readonly i18n = inject(WrI18n);
  protected readonly locale = this.i18n.locale;
  protected readonly name = signal('Ada');

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected readonly snippets = {
    catalog: `{
  "app": {
    "title": "Welcome",
    "hello": "Hello, {{name}}!",
    "items": "{{count}} item(s) selected"
  }
}`,
    pipe: `<p>{{ 'app.hello' | wrT: { name: user().name } }}</p>
<p>{{ 'app.items' | wrT: { count: selection().length } }}</p>`,
    formatter: `import { useI18nFormatter } from 'ngwr/i18n';

const formatItems = useI18nFormatter('app.items');
// formatItems({ count: 3 }) → '3 item(s) selected'`,
  };
}
