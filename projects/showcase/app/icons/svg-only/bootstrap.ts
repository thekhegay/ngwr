import { Component } from '@angular/core';

import bootstrapData from '../_generated/bootstrap.json';
import type { IconEntry } from '../_grid/icon-grid';

import { SvgSetBrowser, type SvgSetSpec } from './svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Bootstrap Icons',
  description:
    "The Bootstrap team's set. 2000+ icons across outline and filled variants. Click any tile to copy the import snippet.",
  homepage: 'https://icons.getbootstrap.com',
  license: 'MIT',
  install: 'pnpm add bootstrap-icons',
  usage: `import plusSvg from 'bootstrap-icons/icons/plus.svg?raw';
import trashSvg from 'bootstrap-icons/icons/trash.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from 'bootstrap-icons/icons/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-bootstrap',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class BootstrapBrowser {
  protected readonly spec = SPEC;
  protected readonly data = bootstrapData as Record<string, string>;
}
