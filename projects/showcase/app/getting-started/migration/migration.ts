import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import { DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import type { DocApiRow } from '#core/components';

@Component({
  selector: 'ngwr-migration-page',
  templateUrl: './migration.html',
  imports: [RouterLink, WrTypography, DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class MigrationPageComponent {
  /** v7 → v8 density value renames. */
  protected readonly densityRows: readonly DocApiRow[] = [
    { name: "'compact'", description: 'Renamed.', type: "→ 'sm'" },
    { name: "'default'", description: 'Renamed — and is now the default.', type: "→ 'md'" },
    { name: "'comfortable'", description: 'Renamed.', type: "→ 'lg'" },
    { name: "'touch'", description: 'Unchanged.', type: "'touch'" },
  ];

  /** v7 → v8 pagination size renames. */
  protected readonly paginationRows: readonly DocApiRow[] = [
    { name: 'size="xs"', description: 'Dropped.', type: '→ "sm"' },
    { name: 'size="xl"', description: 'Dropped.', type: '→ "lg"' },
  ];

  protected readonly snippets = {
    update: `# Run the codemod — rewrites templates, TS and stylesheets in place.
ng update ngwr@8`,

    density: `// Provider
- provideWrDensity({ defaultDensity: 'comfortable' })
+ provideWrDensity({ defaultDensity: 'lg' })`,

    densityTpl: `<!-- Directive + selector -->
- <aside wrDensity="compact">…</aside>
+ <aside wrDensity="sm">…</aside>

- [data-wr-density='comfortable'] { … }
+ [data-wr-density='lg'] { … }`,

    removed: `<!-- WrReveal — removed, no replacement. Drop the directive + its inputs. -->
- <div wrReveal [threshold]="0.5">…</div>
+ <div>…</div>

<!-- WrScrambleText — removed. Use <wr-decrypt-text> (or plain text). -->
- <wr-scramble-text>Hover me</wr-scramble-text>
+ <wr-decrypt-text text="Hover me" />`,
  };
}
