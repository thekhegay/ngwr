import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPageHeader } from 'ngwr/page-header';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-page-header-page',
  templateUrl: './page-header.html',
  imports: [WrButton, WrPageHeader, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class PageHeaderPageComponent {
  protected readonly snippet = `<wr-page-header title="Settings" subtitle="Manage your workspace">
  <div wrPageHeaderActions>
    <wr-btn>Invite</wr-btn>
    <wr-btn color="primary">Save</wr-btn>
  </div>
</wr-page-header>`;
}
