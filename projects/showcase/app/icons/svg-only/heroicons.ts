import { Component } from '@angular/core';

import heroiconsData from '../_generated/heroicons.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Heroicons',
  description:
    "The Tailwind team's set. 300+ icons here in 24px outline — solid + 20/16 variants live in sibling folders. Click any tile to copy the import snippet.",
  homepage: 'https://heroicons.com',
  license: 'MIT',
  install: 'pnpm add heroicons',
  usage: `// Variants: 24/outline, 24/solid, 20/solid, 16/solid.
import plusSvg from 'heroicons/24/outline/plus.svg?raw';
import trashSvg from 'heroicons/24/solid/trash.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from 'heroicons/24/outline/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-heroicons',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class HeroiconsBrowser {
  protected readonly spec = SPEC;
  protected readonly data = heroiconsData as Record<string, string>;
}
