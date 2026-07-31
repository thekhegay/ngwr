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
  /** v8 → v9 checkbox input renames. */
  protected readonly checkboxRows: readonly DocApiRow[] = [
    {
      name: 'value',
      description: 'Renamed — the group-membership identity. `FormCheckboxControl` reserves `value`.',
      type: '→ checkboxValue',
    },
    {
      name: 'checked',
      description: 'Now the form value — a two-way `model()`. Bind `[(checked)]`, `[formField]` or `[(ngModel)]`.',
      type: 'model<boolean>',
    },
  ];

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
ng update ngwr@9`,

    checkbox: `<!-- Inside <wr-checkbox-group>: the identity input was renamed. -->
- <wr-checkbox value="autosave">Autosave</wr-checkbox>
+ <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>

<!-- Standalone: the boolean form value is the checked model. -->
- <wr-checkbox [(ngModel)]="agree">I agree</wr-checkbox>
+ <wr-checkbox [(checked)]="agree">I agree</wr-checkbox>

<!-- The group itself keeps its own value input — do not rename it. -->
  <wr-checkbox-group [(value)]="features">…</wr-checkbox-group>`,

    lucide: `// Icon names are now registered VERBATIM — no kebab-casing.
// A camelCase key used to register as 'chevron-down'; now it stays 'chevronDown'.
- provideWrIcons(lucideIcons({ chevronDown: ChevronDown }))   // <wr-icon name="chevron-down">
+ provideWrIcons(lucideIcons({ 'chevron-down': ChevronDown })) // keeps <wr-icon name="chevron-down">

// …or leave the key and update the usages instead:
+ provideWrIcons(lucideIcons({ chevronDown: ChevronDown }))   // <wr-icon name="chevronDown">`,

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
