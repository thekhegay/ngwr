import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-live-locale-page',
  templateUrl: './wr-live-locale.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrLiveLocalePage {
  protected readonly snippet = `import { LOCALE_ID, computed, inject } from '@angular/core';
import { WR_LIVE_LOCALE } from 'ngwr/utils';

private readonly live = inject(WR_LIVE_LOCALE, { optional: true });
private readonly fallback = inject(LOCALE_ID);

// Rewritten when the app calls WrI18n.use().
protected readonly price = computed(() =>
  new Intl.NumberFormat(this.live?.() ?? this.fallback, { style: 'currency', currency: 'EUR' }).format(this.amount())
);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WR_LIVE_LOCALE',
      description:
        'The interface language of `provideWrI18n()`, the signal `WrI18n.locale`. Not provided without `provideWrI18n()`.',
      type: 'InjectionToken<Signal<string>>',
      default: '-',
    },
  ];
}
