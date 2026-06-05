import { Component } from '@angular/core';

import iconoirData from '../_generated/iconoir.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Iconoir',
  description: 'A free 24px stroke set with 1300+ hand-crafted icons. Click any tile to copy the import snippet.',
  homepage: 'https://iconoir.com',
  license: 'MIT',
  install: 'pnpm add iconoir',
  usage: `import plusSvg from 'iconoir/icons/regular/plus.svg?raw';
import trashSvg from 'iconoir/icons/regular/trash.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from 'iconoir/icons/regular/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-iconoir',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class IconoirBrowser {
  protected readonly spec = SPEC;
  protected readonly data = iconoirData as Record<string, string>;
}
