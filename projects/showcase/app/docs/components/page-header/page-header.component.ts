import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrPageHeaderComponent } from 'ngwr/page-header';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-page-header-page',
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrPageHeaderComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class PageHeaderPageComponent {
  protected readonly snippet = `<wr-page-header title="Settings" subtitle="Manage your workspace">
  <div wrPageHeaderActions>
    <button>Invite</button>
    <button>Save</button>
  </div>
</wr-page-header>`;
}
