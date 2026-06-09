import { Component } from '@angular/core';

import { WrBackTop } from 'ngwr/back-top';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-back-top-page',
  templateUrl: './back-top.html',
  imports: [WrBackTop, DocPageComponent, DocSectionComponent, DocCodeComponent, DocSnippetComponent],
})
export default class BackTopPageComponent {
  protected readonly snippet = `<wr-back-top visibilityThreshold="400" [offset]="80" />`;
}
