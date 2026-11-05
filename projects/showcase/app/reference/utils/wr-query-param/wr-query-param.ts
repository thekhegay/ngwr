import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';
import { WrPagination } from 'ngwr/pagination';
import { wrQueryParam } from 'ngwr/utils/router';

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
  selector: 'ngwr-utl-wr-query-param-page',
  templateUrl: './wr-query-param.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
    WrButton,
    WrInput,
    WrPagination,
  ],
})
export default class WrQueryParamPage {
  protected readonly q = wrQueryParam('q', { replaceUrl: true });
  protected readonly page = wrQueryParam<number>('page', {
    default: 1,
    parse: raw => Number(raw) || 1,
    serialize: String,
  });

  protected search(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
  }

  protected reset(): void {
    this.q.set('');
    this.page.set(1);
  }

  protected readonly snippet = `import { wrQueryParam } from 'ngwr/utils/router';

@Component({
  template: \`
    <input wrInput type="search" [value]="q()" (input)="q.set($any($event.target).value)" />
    <wr-pagination [total]="total()" [(page)]="page" />
  \`,
})
export class Orders {
  readonly q = wrQueryParam('q', { replaceUrl: true });
  readonly page = wrQueryParam<number>('page', { default: 1, parse: raw => Number(raw) || 1, serialize: String });
  readonly orders = httpResource<Order[]>(() => \`/api/orders?q=\${this.q()}&page=\${this.page()}\`);
}`;

  protected readonly typedSnippet = `readonly tags = wrQueryParam<string[]>('tags', {
  default: [],
  parse: raw => raw.split(','),
  serialize: tags => tags.join(','),
});

readonly sort = wrQueryParam<'asc' | 'desc'>('sort', {
  default: 'asc',
  parse: raw => (raw === 'desc' ? 'desc' : 'asc'),
  serialize: String,
});

// Refused by the compiler: a number needs parse and serialize.
readonly page = wrQueryParam<number>('page', { default: 1 });`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrQueryParam(name, options?)',
      description:
        'A `WritableSignal<string>` linked to the `name` parameter. `options.default` is what an absent parameter reads as and the value that removes it; `options.replaceUrl` replaces the history entry instead of pushing one. Needs an injection context.',
      type: '(name: string, options?: WrQueryParamStringOptions) => WritableSignal<string>',
      default: '-',
    },
    {
      name: 'wrQueryParam<T>(name, options)',
      description:
        'The typed form: `options.default`, `options.parse` and `options.serialize` are required. A `parse` that throws reads as `default`. `serialize` is called once for `default`, so a value that serializes like it is left out of the address too.',
      type: '<T>(name: string, options: WrQueryParamOptions<T>) => WritableSignal<T>',
      default: '-',
    },
    {
      name: 'WrQueryParamStringOptions',
      description: '`default` (an empty string unless given) and `replaceUrl`.',
      type: '{ default?: string; replaceUrl?: boolean }',
      default: '-',
    },
    {
      name: 'WrQueryParamOptions<T>',
      description: '`default`, `parse`, `serialize` and `replaceUrl`.',
      type: '{ default: T; parse: (raw: string) => T; serialize: (value: T) => string; replaceUrl?: boolean }',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Component', title: 'Pagination', url: ['/reference/components', 'pagination'] },
    { kind: 'Component', title: 'Tabs', url: ['/reference/components', 'tabs'] },
    { kind: 'Service', title: 'WrStorage', url: ['/reference/services', 'storage'] },
  ];
}
