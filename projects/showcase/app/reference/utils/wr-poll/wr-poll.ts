import { Component, computed, resource } from '@angular/core';

import { wrPoll } from 'ngwr/platform';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-poll-page',
  templateUrl: './wr-poll.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrPollPage {
  private count = 0;

  protected readonly clock = resource({ loader: () => Promise.resolve(++this.count) });
  protected readonly loads = computed(() => (this.clock.hasValue() ? this.clock.value() : 0));

  constructor() {
    wrPoll(this.clock, 2000);
  }

  protected readonly snippet = `import { httpResource } from '@angular/common/http';
import { wrPoll } from 'ngwr/platform';

@Component({
  template: \`<wr-table [items]="rows()" [loading]="orders.isLoading()" />\`,
})
export class Orders {
  readonly orders = httpResource<Order[]>(() => '/api/orders');
  readonly rows = wrResourceValue(this.orders, []);

  constructor() {
    wrPoll(this.orders, 15_000);
  }
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrPoll(resource, intervalMs)',
      description:
        'Reloads `resource` every `intervalMs` while the page is visible, on the one shared timer. Needs an injection context and stops with it. Throws in dev mode on an interval that is not positive.',
      type: '<T>(resource: WritableResource<T>, intervalMs: number) => void',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrPlatform', url: ['/reference/services', 'platform'] },
    { kind: 'Util', title: 'wrAction', url: ['/reference/utils', 'wr-action'] },
  ];
}
