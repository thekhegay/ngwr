import { Component, computed } from '@angular/core';

import featherSource from 'feather-icons/dist/icons.json';
import { feather } from 'ngwr/icon/adapters/feather';

import { IconGridComponent, type IconEntry } from '../_grid/icon-grid';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

let cached: readonly IconEntry[] | null = null;

function buildFeatherEntries(): readonly IconEntry[] {
  if (cached) return cached;

  const source = featherSource as Record<string, string>;
  const out: IconEntry[] = [];

  for (const name of Object.keys(source).sort()) {
    const def = feather(name, source[name]);
    out.push({ name, svg: def.data });
  }

  cached = out;
  return out;
}

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

@Component({
  selector: 'ngwr-icons-feather',
  templateUrl: './feather.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, IconGridComponent],
})
export default class FeatherBrowser {
  protected readonly icons = computed<readonly IconEntry[]>(() => buildFeatherEntries());

  protected readonly install = 'pnpm add feather-icons';

  protected readonly usage = `import featherSource from 'feather-icons/dist/icons.json';
import { provideWrIcons } from 'ngwr/icon';
import { featherIcons } from 'ngwr/icon/adapters/feather';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrIcons(featherIcons({
      add: featherSource['plus'],
      trash: featherSource['trash-2'],
    })),
  ],
});

// Then in any template: <wr-icon name="add" />`;

  protected readonly snippetFor = (entry: IconEntry): string =>
    `import featherSource from 'feather-icons/dist/icons.json';\nimport { featherIcons } from 'ngwr/icon/adapters/feather';\n\nprovideWrIcons(featherIcons({ ${kebabToCamel(entry.name)}: featherSource['${entry.name}'] }));`;
}
