import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrPageHeader } from 'ngwr/page-header';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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
  protected readonly install = `import { WrPageHeader } from 'ngwr/page-header';

@Component({ imports: [WrPageHeader] })
export class MyComponent {}`;

  protected readonly snippet = `<wr-page-header title="Settings" subtitle="Manage your workspace">
  <div wrPageHeaderActions>
    <wr-btn>Invite</wr-btn>
    <wr-btn color="primary">Save</wr-btn>
  </div>
</wr-page-header>`;

  protected readonly api = API.WrPageHeader;
}
