import { Component } from '@angular/core';

import { WrDivider } from 'ngwr/divider';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-divider-page',
  templateUrl: './divider.html',
  imports: [WrDivider, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class DividerComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrDivider } from 'ngwr/divider';

@Component({ imports: [WrDivider] })
export class MyComponent {}`,
    basic: `<wr-divider />`,
    types: `<wr-divider type="solid" />
<wr-divider type="dashed" />
<wr-divider type="dotted" />`,
    colors: `<wr-divider color="primary" />
<wr-divider color="success" />`,
    width: `<wr-divider [width]="3" color="primary" />`,
    label: `<wr-divider>OR</wr-divider>
<wr-divider align="start">Section</wr-divider>
<wr-divider align="end" type="dashed">Footnotes</wr-divider>`,
    longText: `<wr-divider>Continued from the previous chapter — see appendix B for derivations</wr-divider>`,
  };

  protected readonly api = API.WrDivider;
}
