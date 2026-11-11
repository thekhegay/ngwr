import { Component } from '@angular/core';

import { WrCopyValue } from 'ngwr/copy-value';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-copy-value-page',
  templateUrl: './copy-value.html',
  imports: [WrCopyValue, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class CopyValuePageComponent {
  protected readonly orderId = 'ORD-1042';
  protected readonly serial = 4815162342;
  protected readonly token = 'sk_test_9f8b2c41d7e04a6fb3c5a1e2d4f6a8b0c2e4f6a8b0c2e4f6';
  protected readonly address = 'Building 12, Riverside Business Park, 48 Harbour Road, North Quay';

  protected readonly snippets = {
    basic: `<wr-copy-value [value]="order.id" />
<wr-copy-value [value]="device.serial" (copied)="onCopied($event)" />`,
    empty: `<wr-copy-value [value]="null" />
<wr-copy-value [value]="''" emptyLabel="not set" />`,
    truncate: `<div style="width: 16rem">
  <wr-copy-value [value]="token" />
</div>`,
    wrap: `<div style="width: 16rem">
  <wr-copy-value [value]="address" wrap />
</div>`,
    labels: `<wr-copy-value [value]="order.id" copyLabel="Copy order id" copiedLabel="Order id copied" />`,
    i18n: `provideWrI18nStaticLoader({
  en: { copyValue: { copy: 'Copy', copied: 'Copied', empty: '-' } },
});`,
  };

  protected readonly api = API.WrCopyValue;
}
