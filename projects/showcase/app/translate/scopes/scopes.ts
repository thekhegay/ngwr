import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-scopes-page',
  templateUrl: './scopes.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class TranslateScopesPage {
  protected readonly snippets = {
    register: `// In a feature module / route resolver:
const i18n = inject(WrI18n);
await i18n.registerScope('checkout');

// Static loader: catalog must exist under that key
// HTTP loader: fetched from path interpolated with both {locale} and {scope}`,
    consume: `<!-- pipe -->
{{ 'address.zip' | wrT: undefined: 'checkout' }}

<!-- directive -->
<label [wrT]="'address.zip'" [wrTScope]="'checkout'"></label>

<!-- service -->
i18n.t('address.zip', undefined, 'checkout');`,
    httpLayout: `// HTTP loader will request:
//   GET /assets/i18n/checkout/en.json
//   GET /assets/i18n/checkout/ru.json
provideWrI18nHttpLoader({
  path: '/assets/i18n/{scope}/{locale}.json',
  rootPath: '/assets/i18n/{locale}.json',
});`,
  };
}
