import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrToolbar } from 'ngwr/toolbar';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-toolbar-page',
  templateUrl: './toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrToolbar, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class ToolbarPageComponent {
  protected readonly snippet = `<wr-toolbar>
  <div wrToolbarStart><strong>Items</strong></div>
  <div wrToolbarCenter><button>Grid</button> <button>List</button></div>
  <div wrToolbarEnd><button>New</button></div>
</wr-toolbar>`;
}
