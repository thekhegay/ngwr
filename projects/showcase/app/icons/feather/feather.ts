import { Component } from '@angular/core';

import featherData from '../_generated/feather.json';
import type { IconEntry } from '../_grid/icon-grid';
import { SvgSetBrowser, type SvgSetSpec } from '../svg-only/svg-set-browser';

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

const SPEC: SvgSetSpec = {
  title: 'Feather',
  description: count =>
    `The original minimal 24px stroke set. ${count} icons. Click any tile to copy the import snippet.`,
  homepage: 'https://feathericons.com',
  license: 'MIT',
  packages: 'feather-icons',
  usage: `import plusSvg from 'feather-icons/dist/icons/plus.svg?raw';
import trashSvg from 'feather-icons/dist/icons/trash-2.svg?raw';
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
    `import ${kebabToCamel(entry.name)}Svg from 'feather-icons/dist/icons/${entry.name}.svg?raw';\nimport { svgIcon, provideWrIcons } from 'ngwr/icon';\n\nprovideWrIcons([svgIcon('${entry.name}', ${kebabToCamel(entry.name)}Svg)]);`,
};

@Component({
  selector: 'ngwr-icons-feather',
  template: `<ngwr-svg-set-browser [spec]="spec" [data]="data" />`,
  imports: [SvgSetBrowser],
})
export default class FeatherBrowser {
  protected readonly spec = SPEC;
  protected readonly data = featherData as Record<string, string>;
}
