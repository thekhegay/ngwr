import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { type Observable, delay, of } from 'rxjs';

import { WrAutocompleteComponent } from 'ngwr/autocomplete';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

type User = {
  readonly id: number;
  readonly name: string;
  readonly email: string;
};

@Component({
  selector: 'ngwr-autocomplete-page',
  templateUrl: './autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrAutocompleteComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AutocompletePageComponent {
  protected readonly countries: readonly string[] = [
    'Argentina',
    'Australia',
    'Austria',
    'Belgium',
    'Brazil',
    'Canada',
    'Czechia',
    'Denmark',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'India',
    'Indonesia',
    'Ireland',
    'Italy',
    'Japan',
    'Mexico',
    'Netherlands',
    'New Zealand',
    'Norway',
    'Poland',
    'Portugal',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'United Kingdom',
    'United States',
  ];

  protected readonly users: readonly User[] = [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
    { id: 3, name: 'Grace Hopper', email: 'grace@example.com' },
    { id: 4, name: 'Linus Torvalds', email: 'linus@example.com' },
    { id: 5, name: 'Margaret Hamilton', email: 'maggie@example.com' },
  ];

  protected readonly userLabel = (u: User): string => `${u.name} <${u.email}>`;

  protected readonly basic = signal<string | null>(null);
  protected readonly objectValue = signal<User | string | null>(null);
  protected readonly freeText = signal<string | null>(null);
  protected readonly minChars = signal<string | null>(null);
  protected readonly asyncValue = signal<string | null>(null);

  /** Fake remote search — returns countries matching the query after a small delay. */
  protected readonly searchCountries = (query: string): Observable<readonly string[]> =>
    of(this.countries.filter(c => c.toLowerCase().includes(query.toLowerCase()))).pipe(delay(400));

  protected readonly snippets = {
    install: `import { WrAutocompleteComponent } from 'ngwr/autocomplete';

@Component({ imports: [WrAutocompleteComponent, FormsModule] })
export class MyComponent {
  protected readonly options = ['Argentina', 'Belgium', 'Canada'];
  protected readonly picked = signal<string | null>(null);
}`,

    basic: `<wr-autocomplete [options]="countries" [(ngModel)]="picked" placeholder="Search countries" />`,

    objects: `interface User { id: number; name: string; email: string; }

protected readonly userLabel = (u: User) => \`\${u.name} <\${u.email}>\`;

<wr-autocomplete
  [options]="users"
  [displayWith]="userLabel"
  [(ngModel)]="user"
  placeholder="Search users"
/>`,

    freeText: `<wr-autocomplete [options]="countries" [(ngModel)]="picked" [freeText]="true" />`,

    minChars: `<wr-autocomplete [options]="countries" [(ngModel)]="picked" [minChars]="2" />`,

    async: `protected readonly searchCountries = (query: string) =>
  this.http.get<readonly string[]>(\`/api/countries?q=\${query}\`);

<wr-autocomplete
  [asyncOptions]="searchCountries"
  [(ngModel)]="picked"
  [debounceMs]="300"
  [minChars]="1"
  placeholder="Search remotely"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'options', description: 'Items shown in the panel.', type: 'readonly T[]', default: '[]' },
    {
      name: 'displayWith',
      description: 'Maps an item to its display string.',
      type: '(item: T) => string',
      default: 'String',
    },
    {
      name: 'filterWith',
      description: 'Custom filter predicate. Falls back to case-insensitive `includes`.',
      type: '((query: string, item: T) => boolean) | null',
      default: 'null',
    },
    {
      name: 'asyncOptions',
      description:
        'Loader called on every (debounced) keystroke. Returns Observable / Promise / array. Wins over `options`.',
      type: '((q: string) => Observable<T[]> | Promise<T[]> | T[]) | null',
      default: 'null',
    },
    { name: 'debounceMs', description: 'Debounce applied to async loader calls.', type: 'number', default: '250' },
    { name: 'placeholder', description: 'Placeholder shown when empty.', type: 'string', default: "''" },
    { name: 'minChars', description: 'Minimum query length before the panel opens.', type: 'number', default: '0' },
    {
      name: 'freeText',
      description: 'Allow values not present in the options list.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'noResultsText',
      description: 'Text shown when no options match the query.',
      type: 'string',
      default: "'No results'",
    },
    {
      name: 'loadingText',
      description: 'Text shown in the panel while async results are loading.',
      type: 'string',
      default: "'Loading…'",
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    { name: 'readonly', description: 'Input not typeable, panel cannot open.', type: 'boolean', default: 'false' },
  ];
}
