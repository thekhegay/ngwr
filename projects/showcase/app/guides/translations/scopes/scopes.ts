import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-translate-scopes-page',
  templateUrl: './scopes.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class TranslateScopesPage {
  protected readonly snippets = {
    register: `const i18n = inject(WrI18n);
await i18n.registerScope('checkout');

i18n.t('address.zip', undefined, 'checkout');`,
    consume: `{{ 'address.zip' | wrT: null : 'checkout' }}

<label [wrT]="'address.zip'" [wrTScope]="'checkout'"></label>`,
    httpLayout: `provideWrI18nHttpLoader({
  path: '/assets/i18n/{scope}/{locale}.json', // /assets/i18n/checkout/en.json
  rootPath: '/assets/i18n/{locale}.json',     // /assets/i18n/en.json
});

// Static loader: scopes are the second argument.
provideWrI18nStaticLoader(rootCatalogs, { checkout: { en: { … }, ru: { … } } });`,
  };
}
