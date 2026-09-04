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
# One command, whatever major you are on: ng update applies every migration
# between your version and 14, in order. From v12 that is v13 then v14; from
# v6 it is v7, v8, v9, v12, v13, v14. v10 and v11 ship none — nothing to skip.
#
# v14 rewrites its five renames and REPORTS the rest.
# v13 only reports: it names the files, it edits nothing.
# Read the output of both — the reports are the part that matters.
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

    v13: `<!-- The binding is unchanged — the id just lands somewhere else. -->
  <wr-checkbox id="agree">I agree</wr-checkbox>

<!-- A selector anchored to the HOST stops matching, and nothing says so. -->
- ::ng-deep wr-checkbox#agree { margin: 0; }
+ ::ng-deep #agree { margin: 0; }              <!-- the inner input: the 16px tick -->
+ ::ng-deep wr-checkbox:has(#agree) { … }      <!-- …or the whole row, if that is what you meant -->

// Same shape in TypeScript and in a test locator.
- document.querySelector('wr-checkbox#agree')
+ document.getElementById('agree')   // the native input, as the input always documented

<!-- The groups are NOT affected — they keep their host id. -->
  wr-checkbox-group#filters { … }`,

    v14Renames: `<!-- The size input matches the other twenty-three components. -->
- <input wrInput wrSize="lg" />
+ <input wrInput size="lg" />

<!-- One dismiss spelling. wr-drawer, WrDrawerOptions and -->
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
