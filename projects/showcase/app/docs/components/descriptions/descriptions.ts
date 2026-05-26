import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-descriptions-page',
  templateUrl: './descriptions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrDescriptions,
    WrDescriptionItem,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class DescriptionsPageComponent {
  protected readonly snippet = `<wr-descriptions title="Account" inline bordered>
  <wr-description-item label="Name">Ada Lovelace</wr-description-item>
  <wr-description-item label="Email">ada@example.com</wr-description-item>
  <wr-description-item label="Joined">2024-03-12</wr-description-item>
</wr-descriptions>`;
}
