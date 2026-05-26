import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBadge } from 'ngwr/badge';
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
  selector: 'ngwr-badge-page',
  templateUrl: './badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrBadge, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class BadgeComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrBadge } from 'ngwr/badge';

@Component({ imports: [WrBadge] })
export class MyComponent {}`,
    basic: `<wr-badge>New</wr-badge>`,
    colors: `<wr-badge color="primary">Primary</wr-badge>
<wr-badge color="success">Success</wr-badge>`,
    sizes: `<wr-badge size="sm">12</wr-badge>
<wr-badge size="md">12</wr-badge>
<wr-badge size="lg">12</wr-badge>`,
    rounded: `<wr-badge color="primary" rounded>Beta</wr-badge>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Color variant.', type: 'WrColor', default: "'primary'" },
    { name: 'size', description: 'Size variant.', type: "'sm' | 'md' | 'lg'", default: "'md'" },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
  ];
}
