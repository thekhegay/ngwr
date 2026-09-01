import { Component } from '@angular/core';

import { Plus, Trash } from 'lucide';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-icon-page',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  imports: [
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash }))],
})
export default class IconComponent {
  protected readonly snippets = {
    register: `// 1. Bring icons from any source — Lucide, Tabler, your own SVGs, …
import { Plus, Trash } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

bootstrapApplication(AppComponent, {
  providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash }))],
});`,

    use: `<!-- 2. Reference by name in any template. -->
<wr-icon name="plus" />
<wr-icon name="trash" />`,

    custom: `import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([
  svgIcon('brand', '<svg viewBox="0 0 24 24"><path d="…"/></svg>'),
]);`,
  };

  protected readonly api = API.WrIcon;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Icons',
      url: ['/icons'],
      description:
        'Browse and install the sets — Lucide, Feather, Tabler, Phosphor, Heroicons, Iconoir, Radix, Bootstrap.',
    },
    {
      kind: 'Guide',
      title: 'ng g ngwr:icon-set',
      url: ['/start', 'schematics'],
      description: 'Pair with the schematic for a one-shot scaffold of the icon barrel.',
    },
  ];
}
