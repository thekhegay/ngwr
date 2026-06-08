import { Component } from '@angular/core';

import radixData from '../_generated/radix.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Radix Icons',
  description:
    'A 15px crisp-pixel set from the Radix UI team. 300+ icons, MIT. Note: the official npm package ships React components only; ngwr vendors the raw SVGs from the upstream repo. Click any tile to copy the import snippet.',
  homepage: 'https://www.radix-ui.com/icons',
  license: 'MIT',
  // No npm package ships raw SVGs — grab them from the github repo.
  install: `# No npm package ships raw SVGs (the official @radix-ui/react-icons
# is React-only). Pull the .svg files directly from the upstream repo:
git clone --depth=1 https://github.com/radix-ui/icons.git /tmp/radix
mkdir -p src/assets/icons/radix
cp /tmp/radix/packages/radix-icons/icons/*.svg src/assets/icons/radix/`,
  usage: `import plusSvg from './assets/icons/radix/plus.svg?raw';
import trashSvg from './assets/icons/radix/trash.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from './assets/icons/radix/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-radix',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class RadixBrowser {
  protected readonly spec = SPEC;
  protected readonly data = radixData as Record<string, string>;
}
