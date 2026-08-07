import { JsonPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrOption, WrOptionGroup, WrSelect } from 'ngwr/select';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-select-page',
  templateUrl: './select.html',
  imports: [
    FormsModule,
    JsonPipe,
    WrSelect,
    WrOption,
    WrOptionGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SelectComponent {
  protected readonly size = signal<string | null>(null);
  protected readonly respSize = signal<string | null>(null);
  protected readonly framework = signal<string | null>('angular');
  protected readonly tags = signal<readonly string[]>(['typescript', 'angular']);
  protected readonly manyTags = signal<readonly string[]>(['typescript', 'angular', 'rxjs', 'signals']);
  protected readonly recipients = signal<readonly string[]>(['ada@ngwr.dev']);

  /** Tag-mode validator demo: reasonable email check. */
  protected readonly isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  protected readonly snippets = {
    install: `import { WrSelect, WrOption } from 'ngwr/select';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrSelect, WrOption, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-select placeholder="Pick a size" [(ngModel)]="size">
  <wr-option value="sm">Small</wr-option>
  <wr-option value="md">Medium</wr-option>
  <wr-option value="lg">Large</wr-option>
</wr-select>`,
    groups: `<wr-select [(ngModel)]="framework">
  <wr-option-group label="Frontend">
    <wr-option value="angular">Angular</wr-option>
    <wr-option value="react">React</wr-option>
    <wr-option value="vue">Vue</wr-option>
  </wr-option-group>
  <wr-option-group label="Backend">
    <wr-option value="nest">NestJS</wr-option>
    <wr-option value="fastify">Fastify</wr-option>
  </wr-option-group>
</wr-select>`,
    disabled: `<wr-select placeholder="Disabled" disabled />`,
    multi: `<wr-select mode="multi" placeholder="Pick tags" [(ngModel)]="tags">
  <wr-option value="typescript">TypeScript</wr-option>
  <wr-option value="angular">Angular</wr-option>
  <wr-option value="rxjs">RxJS</wr-option>
  <wr-option value="signals">Signals</wr-option>
</wr-select>`,
    multiOverflow: `<wr-select mode="multi" [maxTagCount]="2" [maxItems]="6" [(ngModel)]="manyTags">
  <wr-option value="typescript">TypeScript</wr-option>
  <wr-option value="angular">Angular</wr-option>
  <wr-option value="rxjs">RxJS</wr-option>
  <wr-option value="signals">Signals</wr-option>
  <wr-option value="cdk">CDK</wr-option>
  <wr-option value="ssr">SSR</wr-option>
</wr-select>`,
    tag: `<wr-select mode="tag" placeholder="Add a tag" [(ngModel)]="tags" />

<!-- With separators + validator + caps -->
<wr-select
  mode="tag"
  placeholder="Add email and press Enter or ,"
  [(ngModel)]="recipients"
  [separators]="['Enter', ',', ' ']"
  [validate]="isEmail"
  [maxItems]="5"
/>`,
    search: `<wr-select mode="search" placeholder="Search a country" [(ngModel)]="country">
  @for (c of countries; track c) {
    <wr-option [value]="c">{{ c }}</wr-option>
  }
</wr-select>`,
    searchableMulti: `<!-- searchable is orthogonal to mode — this is multi + typeahead. -->
<wr-select mode="multi" searchable placeholder="Filter categories" [(ngModel)]="categories">
  @for (c of allCategories; track c) {
    <wr-option [value]="c">{{ c }}</wr-option>
  }
</wr-select>`,
    serverSearch: `<!-- Options live in the store; (searchChange) is the only wiring. -->
<wr-select
  mode="search"
  serverSearch
  placeholder="Search a country"
  [options]="results()"
  [loading]="pending()"
  [(ngModel)]="picked"
  (searchChange)="onSearch($event)"
/>`,
    serverSearchTs: `// (searchChange) is debounced by [debounceMs] and fires on every settled
// change — including '' when the field is cleared, so the store can reset.
onSearch(query: string): void {
  this.store.dispatch(searchCountries({ query }));
}

// results()/pending() are plain store selectors.`,
    virtual: `<!-- 5,000 options via the [options] data array + virtualScroll:
     only ~one viewport of rows is ever in the DOM. -->
<wr-select
  mode="search"
  virtualScroll
  placeholder="Search 5,000 items"
  [options]="bigOptions"
  [(ngModel)]="picked"
/>`,
  };

  protected readonly countries = [
    'Australia',
    'Brazil',
    'Canada',
    'Denmark',
    'Estonia',
    'France',
    'Germany',
    'India',
    'Italy',
    'Japan',
    'Kazakhstan',
    'Mexico',
    'Netherlands',
    'Norway',
    'Poland',
    'Portugal',
    'Russia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'United Kingdom',
    'United States',
    'Vietnam',
  ];

  protected readonly country = signal<string | null>(null);

  protected readonly allCategories = [
    'Excavators',
    'Loaders',
    'Cranes',
    'Dump trucks',
    'Graders',
    'Rollers',
    'Bulldozers',
    'Forklifts',
  ];

  protected readonly categories = signal<readonly string[]>(['Cranes']);

  // Server-side search demo. Stands in for "dispatch an action, read the
  // results back out of a store" — the (searchChange) output is the only wiring.
  protected readonly serverResults = signal<readonly string[]>([]);
  protected readonly serverPending = signal(false);
  protected readonly serverPicked = signal<string | null>(null);
  private serverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The fake request outlives navigation otherwise — it would write to signals
    // of a destroyed page.
    inject(DestroyRef).onDestroy(() => {
      if (this.serverTimer) clearTimeout(this.serverTimer);
    });
  }

  protected onServerSearch(query: string): void {
    if (this.serverTimer) clearTimeout(this.serverTimer);
    const q = query.trim().toLowerCase();
    if (!q) {
      this.serverResults.set([]);
      this.serverPending.set(false);
      return;
    }
    this.serverPending.set(true);
    this.serverTimer = setTimeout(() => {
      this.serverResults.set(this.countries.filter(c => c.toLowerCase().includes(q)));
      this.serverPending.set(false);
    }, 700);
  }

  // 5,000-item array for the virtual-scroll demo (search mode, [options] path).
  protected readonly bigOptions = Array.from({ length: 5000 }, (_, i) => `Item ${String(i + 1).padStart(4, '0')}`);
  protected readonly bigPick = signal<string | null>(null);

  protected readonly api = API.WrSelect;

  protected readonly outputsApi: readonly DocApiRow[] = [
    {
      name: '(searchChange)',
      description:
        "Debounced query, for server-side search. Fires on every settled change — including `''` when cleared, so a store can reset. `[minChars]` does not gate it.",
      type: 'EventEmitter<string>',
      default: '—',
    },
    {
      name: '(searchQueryChange)',
      description: 'Raw, undebounced query — the `[(searchQuery)]` half. Prefer `(searchChange)` for server calls.',
      type: 'EventEmitter<string>',
      default: '—',
    },
    {
      name: '(valueChange)',
      description: 'The `[(value)]` half. Bound automatically by `[formField]` / `[(ngModel)]`.',
      type: 'EventEmitter<unknown>',
      default: '—',
    },
    {
      name: '(touch)',
      description: 'Emitted on blur / commit so a bound field marks itself touched.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];

  protected readonly optionApi: readonly DocApiRow[] = [
    { name: 'value', description: 'Form value contributed when chosen.', type: 'unknown', required: true },
    { name: 'disabled', description: 'Disable this option.', type: 'boolean', default: 'false' },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    { name: 'label', description: 'Section heading.', type: 'string', required: true },
  ];
}
