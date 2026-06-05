import { Component } from '@angular/core';

import { Check, TriangleAlert, X, Zap } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrTag } from 'ngwr/tag';
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
  selector: 'ngwr-tag-page',
  templateUrl: './tag.html',
  imports: [WrTag, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons(lucideIcons({ checkmark: Check, close: X, flash: Zap, warning: TriangleAlert }))],
})
export default class TagComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrTag } from 'ngwr/tag';

@Component({ imports: [WrTag] })
export class MyComponent {}`,
    basic: `<wr-tag>Tag</wr-tag>`,
    colors: `<wr-tag color="primary">Primary</wr-tag>
<wr-tag color="success">Success</wr-tag>`,
    outlined: `<wr-tag color="primary" outlined>Outlined</wr-tag>`,
    transparent: `<wr-tag color="primary" transparent>Transparent</wr-tag>`,
    rounded: `<wr-tag color="primary" rounded>Rounded</wr-tag>`,
    icons: `<wr-tag color="success" icon="checkmark">Done</wr-tag>
<wr-tag color="danger" icon="close" iconPosition="end">Failed</wr-tag>`,
    loading: `<wr-tag color="primary" loading>Saving</wr-tag>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Color variant.', type: 'WrColor', default: "'primary'" },
    { name: 'icon', description: 'Icon name shown beside content.', type: 'WrIconName | null', default: 'null' },
    {
      name: 'iconPosition',
      description: 'Where the icon/spinner is rendered.',
      type: "'start' | 'end'",
      default: "'start'",
    },
    { name: 'outlined', description: 'Outlined style.', type: 'boolean', default: 'false' },
    { name: 'transparent', description: 'Transparent tinted style.', type: 'boolean', default: 'false' },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
    { name: 'hoverable', description: 'Adds a hover state for interactive tags.', type: 'boolean', default: 'false' },
    { name: 'loading', description: 'Show a spinner in place of the icon.', type: 'boolean', default: 'false' },
  ];
}
