import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
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

  protected readonly api: readonly DocApiRow[] = [
    { name: 'placeholder', description: 'Shown when no option is chosen.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Disable the select.', type: 'boolean', default: 'false' },
    { name: 'rounded', description: 'Pill-shaped trigger.', type: 'boolean', default: 'false' },
    {
      name: 'mode',
      description:
        'Behavior mode. `single` (default), `multi` (chips + array value), `search` (typeahead filter — replaces `wr-autocomplete`), `tag` (free-text chips — replaces `wr-chips-input`).',
      type: "'single' | 'multi' | 'search' | 'tag'",
      default: "'single'",
    },
    {
      name: 'multi',
      description: '**Deprecated** — alias for `[mode]="multi"`. Use `mode` instead.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'clearable',
      description: 'Show a clear-all (×) button on the trigger (multi mode only).',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'maxItems',
      description: 'Cap on the number of selected items (multi mode). `0` = unlimited.',
      type: 'number',
      default: '0',
    },
    {
      name: 'maxTagCount',
      description: 'Cap on chips rendered before collapsing the rest into `+N more`. `0` = render all.',
      type: 'number',
      default: '0',
    },
    {
      name: 'separators',
      description: 'Tag mode only — keys/characters that commit the draft into a chip.',
      type: 'readonly string[]',
      default: "['Enter', ',']",
    },
    {
      name: 'allowDuplicates',
      description: 'Tag mode only — allow the same value to appear more than once.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'validate',
      description: 'Tag mode only — `(value, existing) => boolean`. Return `false` to silently reject.',
      type: 'WrSelectTagValidator | null',
      default: 'null',
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
