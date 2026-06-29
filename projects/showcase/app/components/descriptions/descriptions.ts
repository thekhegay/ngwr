import { Component } from '@angular/core';

import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-descriptions-page',
  templateUrl: './descriptions.html',
  imports: [
    WrDescriptions,
    WrDescriptionItem,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DescriptionsPageComponent {
  protected readonly snippet = `<wr-descriptions title="Account" inline bordered>
  <wr-description-item label="Name">Ada Lovelace</wr-description-item>
  <wr-description-item label="Email">ada@example.com</wr-description-item>
  <wr-description-item label="Joined">2024-03-12</wr-description-item>
</wr-descriptions>`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'title', description: 'Optional title shown above the list.', type: 'string', default: "''" },
    {
      name: 'inline',
      description: 'Two-column rows instead of stacked.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'bordered', description: 'Add visible borders around each row.', type: 'boolean', default: 'false' },
    {
      name: 'responsive',
      description: 'Reflow inline rows via container query.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
