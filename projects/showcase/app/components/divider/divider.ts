import { Component } from '@angular/core';

import { WrDivider } from 'ngwr/divider';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

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

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Line color.', type: 'WrColor | null', default: 'null' },
    { name: 'type', description: 'Line style.', type: "'solid' | 'dashed' | 'dotted'", default: "'solid'" },
    { name: 'width', description: 'Line width in pixels.', type: 'number', default: '1' },
    {
      name: 'align',
      description: 'Label position. Ignored when no content is projected.',
      type: "'start' | 'center' | 'end'",
      default: "'center'",
    },
  ];
}
