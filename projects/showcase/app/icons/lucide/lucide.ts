import { Component, computed } from '@angular/core';

import * as LucideAll from 'lucide';
import { lucide } from 'ngwr/icon/adapters/lucide';

import { IconGridComponent, type IconEntry } from '../_grid/icon-grid';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

let cached: readonly IconEntry[] | null = null;

function buildLucideEntries(): readonly IconEntry[] {
  if (cached) return cached;

  const Lucide = LucideAll as unknown as Record<string, unknown>;
  const seen = new Set<string>();
  const out: IconEntry[] = [];

  for (const key of Object.keys(Lucide).sort()) {
    if (!/^[A-Z]/.test(key)) continue;
    const value = Lucide[key];
    if (!Array.isArray(value)) continue;

    const name = pascalToKebab(key);
    if (seen.has(name)) continue;
    seen.add(name);

    const def = lucide(name, value as Parameters<typeof lucide>[1]);
    out.push({ name, svg: def.data });
  }

  cached = out;
  return out;
}

function pascalToKebab(value: string): string {
  return value.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase());
}

function kebabToPascal(value: string): string {
  const camel = kebabToCamel(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

@Component({
  selector: 'ngwr-icons-lucide',
  templateUrl: './lucide.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, IconGridComponent],
})
export default class LucideBrowser {
  /**
   * Pre-converted icon list. Built lazily via a computed signal so the work
   * happens once on first render — Lucide ships its icons as IconNode tuples,
   * two thousand of them and counting.
   */
  protected readonly icons = computed<readonly IconEntry[]>(() => buildLucideEntries());

  /**
   * The lede, with the set's size DERIVED rather than written down. It was a
   * literal `~1700` until lucide 1.43 made that 22% short: a count a reader
   * uses to judge whether the set covers them is exactly the number that must
   * not be a claim someone has to remember to update.
   */
  protected readonly lede = computed(
    () =>
      `A modern, community-maintained Feather fork. ${this.icons().length} 24px stroke icons. ` +
      `Click any tile to copy the import snippet.`
  );

  protected readonly install = 'pnpm add lucide';

  protected readonly usage = `import { Plus, Trash2 } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrIcons(lucideIcons({
      add: Plus,
      trash: Trash2,
    })),
  ],
});

// Then in any template: <wr-icon name="add" />`;

  protected readonly snippetFor = (entry: IconEntry): string =>
    `import { ${kebabToPascal(entry.name)} } from 'lucide';\nimport { lucideIcons } from 'ngwr/icon/adapters/lucide';\n\nprovideWrIcons(lucideIcons({ '${entry.name}': ${kebabToPascal(entry.name)} }));`;
}
