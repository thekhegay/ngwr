import { Component } from '@angular/core';

import phosphorData from '../_generated/phosphor.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Phosphor',
  description:
    'A flexible 6-weight icon family. 1500+ regular icons shown here — pick a weight by swapping the folder. Click any tile to copy the import snippet.',
  homepage: 'https://phosphoricons.com',
  license: 'MIT',
  install: 'pnpm add @phosphor-icons/core',
  usage: `// Pick a weight: regular / thin / light / bold / fill / duotone.
import plusSvg from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import trashSvg from '@phosphor-icons/core/assets/bold/trash.svg?raw';
import { provideWrIcons, svgIcon } from 'ngwr/icon';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrIcons([
      svgIcon('add', plusSvg),
      svgIcon('trash', trashSvg),
    ]),
  ],
});

// Then in any template: <wr-icon name="add" />`,
  snippetFor: (entry: IconEntry): string =>
    `import ${kebabToCamel(entry.name)}Svg from '@phosphor-icons/core/assets/regular/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-phosphor',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class PhosphorBrowser {
  protected readonly spec = SPEC;
  protected readonly data = phosphorData as Record<string, string>;
}
