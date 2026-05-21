import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrDividerComponent } from 'ngwr/divider';
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
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrDividerComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DividerComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrDividerComponent } from 'ngwr/divider';

@Component({ imports: [WrDividerComponent] })
export class MyComponent {}`,
    basic: `<wr-divider />`,
    types: `<wr-divider type="solid" />
<wr-divider type="dashed" />
<wr-divider type="dotted" />`,
    colors: `<wr-divider color="primary" />
<wr-divider color="success" />`,
    width: `<wr-divider [width]="3" color="primary" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Line color.', type: 'WrColor | null', default: 'null' },
    { name: 'type', description: 'Line style.', type: "'solid' | 'dashed' | 'dotted'", default: "'solid'" },
    { name: 'width', description: 'Line width in pixels.', type: 'number', default: '1' },
  ];
}
