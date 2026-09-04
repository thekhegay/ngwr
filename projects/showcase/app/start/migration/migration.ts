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
  /** v11 → v12 date entry-point moves. Import paths only; every symbol keeps its name. */
  protected readonly dateEntryRows: readonly DocApiRow[] = [
    {
      name: "'ngwr/date-adapter'",
      description: 'The adapter contract, the locale token and `provideWrDateAdapter()`.',
      type: "→ 'ngwr/date'",
    },
    {
      name: "'ngwr/date-adapter-fns'",
      description: 'The date-fns implementation.',
      type: "→ 'ngwr/date/adapters/fns'",
    },
    {
      name: "'ngwr/date-adapter-luxon'",
      description: 'The luxon implementation.',
      type: "→ 'ngwr/date/adapters/luxon'",
    },
  ];

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
    dateEntry: `// Import paths only — WrDateAdapter, WrDateFnsAdapter, WrLuxonAdapter,
// provideWrDateAdapter and WR_DATE_LOCALE all keep their names.
- import { provideWrDateAdapter } from 'ngwr/date-adapter';
- import { WrDateFnsAdapter } from 'ngwr/date-adapter-fns';
- import { WrLuxonAdapter } from 'ngwr/date-adapter-luxon';
+ import { provideWrDateAdapter } from 'ngwr/date';
+ import { WrDateFnsAdapter } from 'ngwr/date/adapters/fns';
+ import { WrLuxonAdapter } from 'ngwr/date/adapters/luxon';`,

    readI18n: `// \`readI18nText\` returns a Signal now. Every read needs a call.
  protected readonly label = readI18nText('datePicker.open', 'Open calendar');

- <button [attr.aria-label]="label">
+ <button [attr.aria-label]="label()">`,

    update: `# Run the codemod — rewrites templates, TS and stylesheets in place.
# v12 moves the three date import paths; the run also applies any pending
# v7–v9 migrations. v10 and v11 ship none, so there is nothing to skip.
# v14 rewrites its five renames and REPORTS the rest — read the output.
ng update ngwr@14`,

    v14Dates: `// A named format round-trips now. Nothing to change if you only
// bind [(value)] — this is about what happens when a user TYPES.

  <wr-date-picker [(value)]="d" format="shortDate" />

- // de-DE: field shows 15.3.2026, user retypes it, model becomes 1 Jan 2001
+ // de-DE: field shows 15.3.2026, user retypes it, model is 15 March 2026

- // Unreadable input used to commit whatever new Date() made of it
+ // Unreadable input now returns null and leaves the committed value alone

// If you relied on new Date()'s leniency, name the shape you accept:
+ <wr-date-picker [(value)]="d" format="yyyy-MM-dd" />

// Also: MMMM declines beside a day token (ru "15 марта", not "15 март"),
// the \`a\` token emits the locale's marker (ja 午後, ar م), and every Intl
// call pins calendar: 'gregory' — so a th-TH app prints 2026, not 2569.`,

    v13: `<!-- The size input matches the other twenty-three components. -->
- <input wrInput wrSize="lg" />
+ <input wrInput size="lg" />

<!-- [id] no longer lands on the host, so a host selector stops matching. -->
  <wr-checkbox id="agree">I agree</wr-checkbox>
- ::ng-deep wr-checkbox#agree { … }
+ ::ng-deep #agree { … }        <!-- resolves to the inner input, as documented -->`,

    v14Renames: `<!-- One dismiss spelling. wr-drawer, WrDrawerOptions and -->
<!-- WrDialogOptions already said closable; wr-alert was the outlier. -->
- <wr-alert type="danger" closeable />
+ <wr-alert type="danger" closable />

<!-- Table and pagination now use one word per concept. -->
- <wr-table [totalItems]="count" [(page)]="page" />
+ <wr-table [total]="count" [(page)]="page" />
- <wr-pagination [total]="count" [(currentPage)]="page" />
+ <wr-pagination [total]="count" [(page)]="page" />
- <wr-pagination [currentPage]="p()" (currentPageChange)="p.set($event)" />
+ <wr-pagination [page]="p()" (pageChange)="p.set($event)" />

<!-- The only is-prefixed boolean in the library, against thirty-nine bare ones. -->
- <button wr-btn loading [isDisabledWhenLoading]="false">Save</button>
+ <button wr-btn loading [disabledWhenLoading]="false">Save</button>

// The window chrome finishes the density rename v8 started.
- manager.open(PanelComponent, { chromeSize: 'compact' })
+ manager.open(PanelComponent, { chromeSize: 'sm' })
- .wr-window--chrome-compact { … }
+ .wr-window--chrome-sm { … }`,

    v14: `// The loading bar no longer subscribes to the router on its own.
// Without this it still works for start() / complete() and never moves
// for navigation — nothing throws, which is what makes it worth checking.
providers: [
  provideRouter(routes),
  provideWrLoadingBarRouter(),   // from 'ngwr/loading-bar/router'
]

// A tab carrying routerLink needs the adapter on the strip.
// This half DOES throw, so your build finds it for you.
- imports: [WrTabs, WrTab]
+ imports: [WrTabs, WrTab, WrTabsRouting]   // from 'ngwr/tabs/router'
- <wr-tabs>
+ <wr-tabs wrTabsRouting>

// The pagination range is one template now, not a word in the middle.
- pagination: { of: 'von' }
+ pagination: { range: '{{from}}–{{to}} von {{total}}' }`,

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
