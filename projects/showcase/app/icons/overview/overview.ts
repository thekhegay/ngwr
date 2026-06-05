import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-icons-overview',
  templateUrl: './overview.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent],
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
import plusSvg from '@tabler/icons/icons/plus.svg?raw';

provideWrIcons([svgIcon('plus', plusSvg)]);`,

    lucide: `// Lucide ships per-icon JS exports (\`IconNode\` tuples).
import { Plus, Trash, ChevronDown } from 'lucide';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

provideWrIcons(lucideIcons({ plus: Plus, trash: Trash, chevronDown: ChevronDown }));`,

    feather: `// Feather ships inner-SVG strings under \`dist/icons.json\`.
// The adapter wraps each with Feather's default <svg> chrome.
import featherSource from 'feather-icons/dist/icons.json';
import { featherIcons } from 'ngwr/icon/adapters/feather';

provideWrIcons(featherIcons({ plus: featherSource.plus, trash: featherSource.trash }));`,

    schematic: `# Scaffold an icon set with the schematic — generates a typed barrel
# under src/app/icons.ts that you import from your bootstrap.
ng g ngwr:icon-set basic`,
  };
}
