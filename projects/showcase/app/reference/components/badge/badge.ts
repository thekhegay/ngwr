import { Component } from '@angular/core';

import { Check } from 'lucide';
import { WrBadge, WrTag } from 'ngwr/badge';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-badge-page',
  templateUrl: './badge.html',
  imports: [
    WrBadge,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ checkmark: Check }))],
})
export default class BadgeComponent {
  protected readonly colors = WR_COLORS;

  protected readonly snippets = {
    install: `import { WrBadge, WrTag } from 'ngwr/badge';

@Component({ imports: [WrBadge, WrTag] })
export class MyComponent {}`,
    basic: `<wr-badge>New</wr-badge>`,
    colors: `<wr-badge color="primary">Primary</wr-badge>
<wr-badge color="success">Success</wr-badge>`,
    sizes: `<wr-badge size="sm">12</wr-badge>
<wr-badge size="md">12</wr-badge>
<wr-badge size="lg">12</wr-badge>`,
    shape: `<wr-badge color="primary" shape="pill">Beta</wr-badge>`,
    outlined: `<wr-badge color="primary" outlined>Beta</wr-badge>`,
    tag: `<wr-tag color="success" icon="checkmark">Done</wr-tag>
<wr-tag color="primary" outlined rounded>Beta</wr-tag>
<wr-tag color="warning" loading>Saving</wr-tag>`,
  };

  protected readonly api = API.WrBadge;

  protected readonly tagApi: readonly DocApiRow[] = [
    { name: 'color', description: 'Intent colour.', type: 'WrColor', default: "'primary'" },
    { name: 'icon', description: 'Icon rendered beside the label.', type: 'WrIconName | null', default: 'null' },
    { name: 'iconPosition', description: 'Which side the icon sits on.', type: `'start' | 'end'`, default: "'start'" },
    { name: 'outlined', description: 'Transparent fill with a coloured ring.', type: 'boolean', default: 'false' },
    { name: 'transparent', description: 'Drop the fill entirely.', type: 'boolean', default: 'false' },
    { name: 'rounded', description: 'Pill radius instead of the default.', type: 'boolean', default: 'false' },
    { name: 'hoverable', description: 'Add a hover affordance.', type: 'boolean', default: 'false' },
    { name: 'loading', description: 'Swap the icon for a spinner.', type: 'boolean', default: 'false' },
  ];
}
