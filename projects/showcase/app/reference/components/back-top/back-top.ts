import { Component } from '@angular/core';

import { WrBackTop } from 'ngwr/back-top';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-back-top-page',
  templateUrl: './back-top.html',
  imports: [WrBackTop, DocPageComponent, DocSectionComponent, DocCodeComponent, DocSnippetComponent, DocApiComponent],
})
export default class BackTopPageComponent {
  protected readonly install = `import { WrBackTop } from 'ngwr/back-top';

@Component({ imports: [WrBackTop] })
export class MyComponent {}`;

  protected readonly snippet = `<wr-back-top visibilityThreshold="400" [offset]="80" />`;

  protected readonly customIcon = `<!-- Anything projected replaces the default arrow. A <wr-icon> needs
     provideWrIcons() and the name registered; a bare <svg> needs neither. -->
<wr-back-top>
  <wr-icon name="arrow-up" />
</wr-back-top>`;

  protected readonly api = API.WrBackTop;
}
