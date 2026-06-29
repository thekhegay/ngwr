import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPageHeader } from 'ngwr/page-header';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-page-header-page',
  templateUrl: './page-header.html',
  imports: [
    WrButton,
    WrPageHeader,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PageHeaderPageComponent {
  protected readonly snippet = `<wr-page-header title="Settings" subtitle="Manage your workspace">
  <div wrPageHeaderActions>
    <wr-btn>Invite</wr-btn>
    <wr-btn color="primary">Save</wr-btn>
  </div>
</wr-page-header>`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'title', description: 'Primary title shown as an h1.', type: 'string', default: "''" },
    { name: 'subtitle', description: 'Secondary line below the title.', type: 'string', default: "''" },
    {
      name: 'responsive',
      description: 'Stack title and actions when narrow.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
