import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-icons-overview',
  templateUrl: './overview.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class IconsOverviewPage {
  protected readonly snippets = {
    register: `import { provideWrIcons } from 'ngwr/icon';

// Each provider call adds icons to the registry. Mix and match across
// sets — every \`<wr-icon name="…">\` then resolves against this set.
bootstrapApplication(AppComponent, {
  providers: [
    provideWrIcons([/* WrIconDef[] from one of the patterns below */]),
  ],
});`,

    svgIcon: `// Generic — works with any source that ships full <svg> files.
// Pair with a bundler's raw-svg import (Vite: \`?raw\`, Webpack:
// \`raw-loader\`, esbuild: \`--loader:.svg=text\`).
import { svgIcon, provideWrIcons } from 'ngwr/icon';
import plusSvg from '@tabler/icons/icons/outline/plus.svg?raw';
import trashSvg from 'feather-icons/dist/icons/trash-2.svg?raw';

provideWrIcons([svgIcon('plus', plusSvg), svgIcon('trash', trashSvg)]);`,

    lucide: `// Lucide ships per-icon JS exports (\`IconNode\` tuples).
import { Plus, Trash, ChevronDown } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

provideWrIcons(lucideIcons({ plus: Plus, trash: Trash, 'chevron-down': ChevronDown }));`,

    schematic: `# Scaffold an icon set with the schematic — generates a typed barrel
# under src/app/icons.ts that you import from your bootstrap.
ng g ngwr:icon-set basic`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-icon',
      url: ['/reference/components', 'icon'],
      description: 'The renderer side — where a name registered here becomes an SVG on the page.',
    },
    {
      kind: 'Guide',
      title: 'ng g ngwr:icon-set',
      url: ['/start', 'schematics'],
      description: 'The generator side — let the CLI write the barrel instead of hand-listing icons.',
    },
  ];
}
