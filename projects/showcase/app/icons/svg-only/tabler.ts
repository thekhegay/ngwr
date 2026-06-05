import { Component } from '@angular/core';

import tablerData from '../_generated/tabler.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Tabler',
  description: 'A 24px stroke set with 5000+ outline icons. Click any tile to copy the import snippet.',
  homepage: 'https://tabler.io/icons',
  license: 'MIT',
  install: 'pnpm add @tabler/icons',
  usage: `import plusSvg from '@tabler/icons/icons/outline/plus.svg?raw';
import trashSvg from '@tabler/icons/icons/outline/trash.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from '@tabler/icons/icons/outline/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-tabler',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class TablerBrowser {
  protected readonly spec = SPEC;
  protected readonly data = tablerData as Record<string, string>;
}
