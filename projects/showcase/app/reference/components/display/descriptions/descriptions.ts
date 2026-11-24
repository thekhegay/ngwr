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
  protected readonly plainSnippet = `<wr-descriptions title="Account">
  <wr-description-item label="Name">Ada Lovelace</wr-description-item>
  <wr-description-item label="Email">ada@example.com</wr-description-item>
</wr-descriptions>`;

  protected readonly snippet = `<wr-descriptions title="Account" inline bordered>
  <wr-description-item label="Name">Ada Lovelace</wr-description-item>
  <wr-description-item label="Email">ada@example.com</wr-description-item>
  <wr-description-item label="Joined">2024-03-12</wr-description-item>
</wr-descriptions>`;

  protected readonly columnsSnippet = `<wr-descriptions title="Order" columns="3" bordered responsive>
  <wr-description-item label="Order">#1042</wr-description-item>
  <wr-description-item label="Status">Paid</wr-description-item>
  <wr-description-item label="Placed">2026-03-12</wr-description-item>
  <wr-description-item label="Customer">Ada Lovelace</wr-description-item>
  <wr-description-item label="Address" span="2">12 St James's Square, London SW1Y 4JH</wr-description-item>
  <wr-description-item label="Note" span="3">Leave with the porter if nobody answers.</wr-description-item>
</wr-descriptions>`;

  protected readonly api = API.WrDescriptions;
  protected readonly itemApi = API.WrDescriptionItem;
}
