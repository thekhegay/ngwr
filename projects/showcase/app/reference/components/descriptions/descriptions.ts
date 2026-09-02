import { Component } from '@angular/core';

import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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

  protected readonly api = API.WrDescriptions;
  protected readonly itemApi = API.WrDescriptionItem;
}
