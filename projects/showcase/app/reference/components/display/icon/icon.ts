import { Component } from '@angular/core';

import { Plus, Trash } from 'lucide';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';

import {
  DocApiComponent,
  DocCodeComponent,
  DocInstallComponent,
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
  imports: [
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocInstallComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash }))],
})
export default class IconComponent {
  protected readonly snippets = {
    register: `import { Plus, Trash } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

bootstrapApplication(AppComponent, {
  providers: [provideWrIcons(lucideIcons({ plus: Plus, trash: Trash }))],
});`,

    use: `import { WrIcon } from 'ngwr/icon';

@Component({ imports: [WrIcon], templateUrl: './my.html' })
export class MyComponent {}

<wr-icon name="plus" />
<wr-icon name="trash" />`,

    custom: `import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([
  svgIcon('brand', '<svg viewBox="0 0 24 24"><path d="…"/></svg>'),
]);`,
  };

  protected readonly api = API.WrIcon;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Icons', url: ['/icons'], description: 'Browse the icon sets.' },
    {
      kind: 'Guide',
      title: 'ng g ngwr:icon-set',
      url: ['/docs', 'installation'],
      description: 'Scaffold an icon barrel.',
    },
  ];
}
