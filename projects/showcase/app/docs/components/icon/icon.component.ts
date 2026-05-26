import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { provideWrIcons, WrIconComponent, type WrBuiltInIconName, wrIconSet } from 'ngwr/icon';

import { iconTags } from './_data/icon-tags.generated';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { copyToClipboard } from '#core/utils';

/** 'logo-github' → 'logoGithub' */
function camelize(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

interface IconRow {
  readonly name: WrBuiltInIconName;
  readonly camel: string;
  readonly haystack: string;
}

function buildRow(name: WrBuiltInIconName): IconRow {
  const tags = iconTags[name] ?? [];
  return {
    name,
    camel: camelize(name),
    // Pre-built lowercase haystack for fast filter().
    haystack: [name, ...tags].join(' ').toLowerCase(),
  };
}

@Component({
  selector: 'ngwr-icon-page',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrIconComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export default class IconComponent {
  protected readonly query = signal('');
  protected readonly copiedName = signal<string | null>(null);

  private readonly allRows: readonly IconRow[] = wrIconSet.map(i => buildRow(i.name as WrBuiltInIconName));

  protected readonly icons = computed(() => this.filter(r => !r.name.startsWith('logo')));
  protected readonly logoIcons = computed(() => this.filter(r => r.name.startsWith('logo')));

  protected readonly snippets = {
    install: `import { WrIconComponent } from 'ngwr/icon';

@Component({
  imports: [WrIconComponent],
})
export class MyComponent {}`,
    registerApp: `import { provideWrIcons, logoAngular } from 'ngwr/icon';

bootstrapApplication(AppComponent, {
  providers: [provideWrIcons([logoAngular])],
});`,
    registerComponent: `import { provideWrIcons, WrIconComponent, logoGithub, logoNpm } from 'ngwr/icon';

@Component({
  selector: 'app-header',
  imports: [WrIconComponent],
  providers: [provideWrIcons([logoGithub, logoNpm])],
  template: \`
    <wr-icon name="logo-github" />
    <wr-icon name="logo-npm" />
  \`,
})
export class HeaderComponent {}`,
    custom: `import type { WrIcon } from 'ngwr/icon';

export const myBrand: WrIcon = {
  name: 'my-brand',
  data: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="..." /></svg>',
};`,
    customRegister: `import { provideWrIcons, WrIconComponent } from 'ngwr/icon';

import { myBrand } from './my-brand.icon';

@Component({
  imports: [WrIconComponent],
  providers: [provideWrIcons([myBrand])],
  template: \`<wr-icon name="my-brand" />\`,
})
export class BrandComponent {}`,
    usage: `<wr-icon name="logo-angular" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'name',
      description: 'Name of a registered icon.',
      type: 'WrIconName',
      required: true,
    },
  ];

  protected readonly tagsFor = (name: WrBuiltInIconName): readonly string[] => iconTags[name] ?? [];

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected async onCopy(name: WrBuiltInIconName): Promise<void> {
    const ok = await copyToClipboard(camelize(name));
    if (!ok) return;
    this.copiedName.set(name);
    setTimeout(() => {
      if (this.copiedName() === name) this.copiedName.set(null);
    }, 1500);
  }

  private filter(predicate: (row: IconRow) => boolean): readonly IconRow[] {
    const q = this.query().trim().toLowerCase();
    const base = this.allRows.filter(predicate);
    if (!q) return base;
    return base.filter(r => r.haystack.includes(q));
  }
}
