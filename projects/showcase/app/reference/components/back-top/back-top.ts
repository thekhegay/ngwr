import { Component } from '@angular/core';

import { WrBackTop } from 'ngwr/back-top';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-back-top-page',
  templateUrl: './back-top.html',
  imports: [WrBackTop, DocPageComponent, DocSectionComponent, DocCodeComponent, DocSnippetComponent, DocApiComponent],
})
export default class BackTopPageComponent {
  protected readonly snippet = `<wr-back-top visibilityThreshold="400" [offset]="80" />`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'visibilityThreshold', description: 'Scroll distance before showing.', type: 'number', default: '400' },
    { name: 'offset', description: 'Pixels subtracted from scroll target.', type: 'number', default: '0' },
    { name: 'ariaLabel', description: 'Accessible label for the button.', type: 'string', default: "'Back to top'" },
  ];
}
