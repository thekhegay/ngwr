import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrTag } from 'ngwr/badge';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';
import { WrRating } from 'ngwr/rating';
import { WrStatistic, WrStatisticGroup } from 'ngwr/statistic';
import { WrTable, WrTableCell } from 'ngwr/table';
import type { WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';
import { NGWR_VERSION } from 'ngwr/version';

import {
  DocCodeComponent,
  type DocCodeFile,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { QUALITY } from '#core/generated/quality';

/** The five libraries the table compares, and the key each row stores them under. */
type LibraryKey = 'ngwr' | 'material' | 'primeng' | 'zorro' | 'taiga';

/** One column of the comparison table — one library, named as it ships. */
interface ComparisonLibrary {
  readonly key: LibraryKey;
  readonly name: string;
  /** ngwr's own column, marked so it can be accented rather than hidden among the four. */
  readonly self?: boolean;
}

/** One row of the comparison table — one deciding factor across five libraries. */
interface ComparisonRow extends Record<LibraryKey, string> {
  readonly axis: string;
  /**
   * The date this row's figures were read, printed under the factor name.
   *
   * Only the rows whose cells are a MOVING third-party number carry one. A
   * rounded figure with no date is still undated — `~2M` is true for months and
   * false eventually, and the reader cannot tell which without knowing when it
   * was taken.
   */
  readonly readAt?: string;
}

/** One row of a gate table — the script a workflow runs, and what it catches. */
interface GateRow {
  readonly gate: string;
  readonly catches: string;
}

/** One row of the majors table. */
interface MajorRow {
  readonly version: string;
  readonly broke: string;
  readonly codemod: string;
}

/**
 * What each pull-request gate catches, keyed by the script name.
 *
 * The LIST is not written here — it comes from `QUALITY.prGates`, parsed out of
 * `ci.yml`. A gate added to the workflow therefore appears on this page whether
 * or not anyone wrote a sentence for it, spelled as the command it runs. That
 * fallback is the point: a page that under-explains a gate is untidy, a page
 * that advertises a gate CI stopped running is the one failure this whole file
 * exists to avoid.
 */
const PR_GATE_NOTES: Readonly<Record<string, string>> = {
  lint: 'ESLint, Stylelint and the repository gates in one chain — colour-list parity, unexplained physical CSS, dead design tokens and colour-only state rules. Every stage is listed below.',
  'test:coverage':
    'The vitest suite, with coverage. Specs sit beside the code they cover and assert the rendered DOM — roles, ARIA state, and the .wr-* classes, which are public API — rather than component internals.',
  'check:api-docs':
    'A documented input the component no longer has, a default the docs invented, a page with no API table at all. A page is keyed to an entry point by its FOLDER name, so it is held only where the folder is the entry point: every service page and most component pages, names, types and defaults alike. A pipe, util or validator page is named after the function, and nothing resolves that to an entry point — nor the interface pages, four of the six directive pages, or the handful of components whose folder differs from their route. Read those signatures against the shipped types.',
  'check:llms':
    'The generated AI assets — llms-full.txt and the agent skill — against coverage floors. Missing frontmatter, or a catalog table with nothing but a header, fails the build.',
  'check:css-vars':
    'The --wr-<name>-* hooks each component page lists, regenerated from the stylesheets and compared against the committed copy. A hook a component grows cannot ship without its row.',
  'build:lib':
    '`@angular/build:library` over every secondary entry point, then the schematics, the MCP server and the AI assets. An entry point that does not compile in isolation fails here and nowhere else.',
  'build:showcase':
    'Every documentation route prerendered in Node. SSR breakage is a red build rather than a silent degrade: a component that touches the DOM outside afterNextRender cannot reach a release.',
  'check:theme':
    'wrThemeTokens(), the runtime palette recipe, against the compiled stylesheet — token by token. Two implementations of one recipe drift the moment either is edited.',
  'check:a11y':
    'axe over the prerendered HTML: accessible names, ARIA validity, roles, id references, landmark and heading structure. Fails on any serious or critical violation, and the baseline is empty.',
};

/** The `&&` chain inside `pnpm lint`, in the same shape and for the same reason. */
const LINT_STAGE_NOTES: Readonly<Record<string, string>> = {
  'ng lint': 'ESLint over the library, then the showcase — templates included.',
  'eslint scripts':
    'The same rules over the build and release tooling — TypeScript that never ships to npm, and that every gate on this page runs through.',
  'lint:styles': 'Stylelint over every stylesheet in both projects.',
  'check:colors':
    'The TypeScript colour list against the SCSS palette map. They drifted once: v8 shipped --wr-color-info and its whole modifier class while color="info" stayed a template type error.',
  'check:rtl':
    'A direction-dependent CSS property written in physical form with no rtl-ok: reason above it. Plenty of them are correct — the rule is that the reason is written down.',
  'check:tokens':
    'A --wr-* token nothing paints with. A say-why gate rather than a do-not gate: an intentionally unused token carries unused-ok: and the reason.',
  'check:color-only':
    'A state or intent modifier whose own declarations are all colour, with no color-ok: reason above the selector. WCAG 1.4.1 has no axe rule, so this reads the stylesheets instead — @each loops included.',
};

/** The nightly workflow. `build:showcase` is on it because the browser checks read what it writes. */
const NIGHTLY_NOTES: Readonly<Record<string, string>> = {
  'build:showcase': 'Not a check. The browser checks below read dist/showcase and cannot start without it.',
  'check:contrast':
    "axe's color-contrast and target-size rules in a real Chromium, both themes, every canonical route — the two rules check:a11y has to switch off.",
  'check:state-a11y':
    'The full axe rule set inside a state you have to create: a hover, a focus ring, an open overlay. Neither static gate can reach one.',
  'check:layout':
    'The measured box of a set of load-bearing components in both themes, against a committed baseline. It catches a token or density change that silently resizes controls, and says nothing about colour, shadows or radii.',
  'check:rtl-layout':
    'Every route rendered both ways, failing only where the RTL pass overflows sideways and the LTR pass does not. Differential, so there is no baseline of pixel positions to rot.',
};

/**
 * `4060` to `4,060`, hand-rolled rather than `toLocaleString`.
 *
 * The page is prerendered in Node and hydrated in the browser, and the two
 * resolve their default locale independently — a separator that disagrees is a
 * hydration text mismatch on a page whose entire argument is that its numbers
 * are trustworthy.
 */
function grouped(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

@Component({
  selector: 'ngwr-gs-introduction-page',
  templateUrl: './introduction.html',
  styleUrl: './introduction.scss',
  imports: [
    FormField,
    RouterLink,
    WrAlert,
    WrCheckbox,
    WrDescriptionItem,
    WrDescriptions,
    WrRating,
    WrStatistic,
    WrStatisticGroup,
    WrTable,
    WrTableCell,
    WrTag,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocSeeAlsoComponent,
  ],
})
export default class IntroductionPage {
  /**
   * The ngwr column, counted rather than typed.
   *
   * Written by `scripts/gen/quality.ts` during the showcase build. It matters
   * more here than on the quality page: this is the page a reader arrives at
   * ready to disbelieve, and every figure in the ngwr column is one they can
   * check in thirty seconds. A stale one costs the whole table.
   */
  protected readonly quality = QUALITY;

  /**
   * The live demo's model. Deliberately NOT wrapped in a `<wr-form-field>`: the
   * field renders a `<label for>` pointing at its generated `controlId`, and
   * only controls that adopt that id (`wrInput`, `wr-select`) make the
   * reference land. A rating projected into one would be labelled by an id that
   * exists nowhere, which is worse than the control's own `aria-label`.
   */
  private readonly demoModel = signal<{ score: number | null; contact: boolean }>({ score: 4, contact: false });

  /**
   * `demo.score` writes the rating's `value` model and `demo.contact` the
   * checkbox's `checked` — the two halves of the claim this page makes, running
   * rather than quoted. No schema: the point is the binding, not validation.
   */
  protected readonly demo = form(this.demoModel);

  protected readonly demoJson = computed(() => JSON.stringify(this.demoModel()));

  /**
   * The column order, and the only place a library's display name is written.
   *
   * The template loops this for the sticky header row AND for each block's
   * cells, indexing the row by `lib.key`, so a column cannot be renamed in one
   * place and not the other — which is what a hand-written header row plus
   * hand-written cells eventually drifts into.
   */
  protected readonly libraries: readonly ComparisonLibrary[] = [
    // Derived, never typed: this row was still labelled "ngwr 12" at 14.0.0,
    // on the one page a prospective adopter reads to compare majors.
    { key: 'ngwr', name: `ngwr ${NGWR_VERSION.split('.')[0]}`, self: true },
    { key: 'material', name: 'Angular Material 22' },
    { key: 'primeng', name: 'PrimeNG 22' },
    { key: 'zorro', name: 'NG-ZORRO 22' },
    { key: 'taiga', name: 'Taiga UI 5' },
  ];

  /**
   * Read on 2026-08-20 from the npm registry, the GitHub API and the published
   * tarball of each library's then-current version; the ngwr column is measured
   * in this repository. Cells say "not measured" rather than guessing — a table
   * that fills every square is a table that started inventing.
   *
   * **A competitor cell may only say what was OBSERVED in an artefact.** None of
   * these packages is installed here, so nothing in a non-ngwr column can be
   * re-checked while editing this file; the licensing row is where that bites,
   * because a wrong sentence about a named vendor's terms is the one mistake on
   * this page with a legal shape. Those cells were cut back to the smallest
   * claim the read supports and point at the vendor for the rest — the terms are
   * theirs to state, they move, and restating them here dates instantly.
   *
   * Nine rows, and ngwr wins two of them. That ratio is the point: an axis set
   * where one library sweeps is an axis set chosen by that library.
   *
   * **The two counted rows are ROUNDED to two significant figures, and they are
   * the only rows that are.** Downloads and stars move every day, so a figure
   * read once and printed exactly — `2,015,398` — is false within a week while
   * still looking like a measurement; `~2M` stays true for months and cannot be
   * mistaken for one. Both rows carry `readAt` so the rounding is dated rather
   * than merely vague. ngwr's `3` stars is exact because it is exact and small
   * enough to stay that way.
   *
   * ngwr's own commits are a share, not a total. They were once exact
   * (`1,409 of 1,480`), which made them checkable and also false by the next
   * commit, so the page states the share that holds ("more than nine in ten")
   * and hands the reader `git shortlog -sn --all` for the exact figures.
   */
  protected readonly comparisonRows: readonly ComparisonRow[] = [
    {
      axis: 'Signal Forms binding',
      ngwr: 'Native. Twenty value controls implement FormValueControl or FormCheckboxControl; no ControlValueAccessor in the package. One public component with a value model implements neither: [wrColorPickerTrigger].',
      material: 'ControlValueAccessor. Eleven controls declare one; no FormValueControl in the tarball.',
      primeng: 'No FormValueControl in the shipped .d.ts.',
      zorro: 'Started. 22.0.1 added Signal Forms state to the input; 41 files still reference ControlValueAccessor.',
      taiga:
        'A structurally identical interface of its own, with a source note to adopt the Angular one once v22 is its floor.',
    },
    {
      axis: 'License',
      ngwr: 'MIT.',
      material: 'MIT.',
      primeng: 'Not MIT from 22.0.0; MIT through 21.1.9. Read 2026-08-20 — the vendor states the current terms.',
      zorro: 'MIT.',
      taiga: 'Apache-2.0.',
    },
    {
      axis: 'Weekly npm downloads',
      readAt: '2026-08-20',
      ngwr: '~150.',
      material: '~2M.',
      primeng: '~640k.',
      zorro: '~230k.',
      taiga: '~20k.',
    },
    {
      axis: 'GitHub stars',
      readAt: '2026-08-20',
      ngwr: '3.',
      material: '~25k.',
      primeng: '~12k.',
      zorro: '~9.2k.',
      taiga: '~4k.',
    },
    {
      axis: 'Who maintains it',
      ngwr: 'One person — more than nine commits in ten, under four author identities. The only other human contributor has 13; the rest are two bots.',
      material: 'The Angular team at Google.',
      primeng: 'PrimeTek, commercially.',
      zorro: 'Over a hundred contributors.',
      taiga: 'Over a hundred contributors, backed by T-Bank.',
    },
    {
      axis: 'CDK test harnesses',
      ngwr: `${QUALITY.harnessClasses} classes across ${QUALITY.testingEntryPoints} entry points.`,
      material: '97 classes. The CDK harness pattern started here; ngwr copied it.',
      primeng: 'None found in the tarball.',
      zorro: 'None found in the tarball.',
      taiga: 'None found in the tarball.',
    },
    {
      axis: 'Locales in the box',
      ngwr: `${QUALITY.locales.length} catalogs, gated against the English key set.`,
      material: 'Defers to Angular i18n and MAT_DATE_LOCALE.',
      primeng: 'Not measured.',
      zorro: 'Considerably more; the exact count was not measured.',
      taiga: '23 language packages.',
    },
    {
      axis: 'Angular peer range',
      ngwr: '>=22.0.0, with no upper bound — permissive, and a promise about nothing.',
      material: '^22 || ^23. The only one already declaring v23.',
      primeng: '^22.1.',
      zorro: '^22.',
      taiga: '>=19. The widest back-compat of the five.',
    },
    {
      axis: 'Runtime dependencies',
      ngwr: `One — ${QUALITY.runtimeDependencies.join(', ')}. @angular/cdk is a required peer, so parse5 arrives with it.`,
      material: 'One — tslib. The CDK adds parse5, exactly as it does for ngwr.',
      primeng: 'Seven, including the license manager.',
      zorro: 'Five.',
      taiga: 'One — tslib, plus fifteen peers.',
    },
  ];

  protected readonly snippets = {
    cva: `// Path 3, the compatibility one. A component control reaches a form by
// providing an accessor and hand-wiring the callbacks the framework hands back.
@Component({
  selector: 'legacy-rating',
  templateUrl: './legacy-rating.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LegacyRating), multi: true },
  ],
})
export class LegacyRating implements ControlValueAccessor {
  protected value = 0;
  protected disabled = false;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.value = value ?? 0;
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected pick(value: number): void {
    this.value = value;   // mutate a field…
    this.onChange(value); // …then tell the framework about it, by hand
  }
}`,

    native: `// Path 2, the native one. This is projects/lib/rating/rating.ts, trimmed to
// the members the form actually touches — every line below is in that file.
@Component({
  selector: 'wr-rating',
  templateUrl: './rating.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrRating implements FormValueControl<number | null> {
  /** The rating. Bound by \`[formField]\`, or two-way via \`[(value)]\`. */
  readonly value = model<number | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with \`[formField]\`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Transient hover preview — overrides \`value\` for display when set. */
  protected readonly hoverValue = signal<number | null>(null);

  private commit(value: number | null): void {
    this.value.set(value);
    this.hoverValue.set(null);
  }
}`,

    demoHtml: `<wr-rating [formField]="demo.score" ariaLabel="How likely are you to recommend ngwr?" />

<wr-checkbox [formField]="demo.contact">You may follow up by email</wr-checkbox>

<p>The model, live: {{ demoJson() }}</p>`,

    demoTs: `import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrRating } from 'ngwr/rating';

@Component({
  selector: 'feedback-form',
  templateUrl: './feedback-form.html',
  imports: [FormField, WrRating, WrCheckbox],
})
export class FeedbackForm {
  private readonly model = signal<{ score: number | null; contact: boolean }>({ score: 4, contact: false });

  protected readonly demo = form(this.model);

  protected readonly demoJson = computed(() => JSON.stringify(this.model()));
}`,

    classic: `<!-- Still supported, and not a fallback path inside the library: no
     ControlValueAccessor is created. Angular's NgModel / FormControlDirective
     drive the same \`value\` model the field would have written. Template
     validator directives (required, minlength, …) are NOT applied on this
     path — put validators on the FormControl. -->
<wr-rating [(ngModel)]="score" />
<wr-rating [formControl]="scoreControl" />`,

    counts: `# Everything the "modernity" claim rests on, as greps over projects/lib.
grep -rn '@NgModule' projects/lib --include='*.ts' | wc -l                      # 0
grep -rn 'standalone: true' projects/lib --include='*.ts' | wc -l               # 0
grep -rn 'ChangeDetectionStrategy.OnPush' projects/lib --include='*.ts' | wc -l # 2
grep -rn 'ControlValueAccessor' projects/lib --include='*.ts' \\
  | grep -vE ':[0-9]+:\\s*\\*' | wc -l                                          # 0

# Two of those need a word. The two OnPush declarations are legacy files under
# window/. And the second grep on the last one drops comment lines: every
# mention of ControlValueAccessor in the library is a comment saying there is
# not one, so leave that filter off to read them.

# And since "always" is the claim people check first — it is not the claim.
# The library was rebuilt at v7 and the two zeroes above date from there:
git grep -l '@NgModule' v6.0.0 -- projects/lib | wc -l                          # 1
git grep -l '@NgModule' v7.0.0 -- projects/lib | wc -l                          # 0
git show v6.0.0:package.json | grep zone.js                                     # ~0.15.0
git show v12.0.0:package.json | grep zone.js                                    # (nothing)`,
  };

  /** Source tabs for the live demo above — held as a field so the array identity is stable. */
  protected readonly demoFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: this.snippets.demoHtml },
    { label: 'TS', language: 'angular-ts', code: this.snippets.demoTs },
  ];

  /**
   * The two places the count is rendered, hedged together or not at all.
   *
   * `testCasesAreExact` is false once the suite holds a call site that stands
   * for an unknown number of cases — a parameterised form, or an `it()` in a
   * loop. The generator names the file and carries on rather than failing a
   * documentation build over a legal spec, so the hedge has to live here: a
   * figure that is silently a floor is exactly the kind of number this page
   * exists to not print.
   */
  protected readonly testCasesLabel = QUALITY.testCasesAreExact ? 'Test cases' : 'Test cases (at least)';

  protected readonly testCasesPhrase = QUALITY.testCasesAreExact
    ? `${grouped(QUALITY.testCases)} cases`
    : `At least ${grouped(QUALITY.testCases)} cases`;

  /** `12.0.0` to `v12` — the major line, which is what a reader deciding on the library cares about. */
  protected readonly majorLine = `v${QUALITY.version.split('.')[0]}`;

  /** Components plus directives — the classes a consumer can actually put in `imports: []`. */
  protected readonly publicClasses = QUALITY.components + QUALITY.directives;

  protected readonly gateColumns: WrTableColumns = {
    gate: { title: 'Gate', width: 168 },
    catches: { title: 'What it catches' },
  };

  protected readonly stageColumns: WrTableColumns = {
    gate: { title: 'Stage', width: 168 },
    catches: { title: 'What it catches' },
  };

  protected readonly majorColumns: WrTableColumns = {
    version: { title: 'Major', width: 88 },
    broke: { title: 'What broke' },
    codemod: { title: 'Codemod', width: 120 },
  };

  protected readonly prGateRows: readonly GateRow[] = QUALITY.prGates.map(gate => ({
    gate: gate.name,
    catches: PR_GATE_NOTES[gate.name] ?? gate.command,
  }));

  protected readonly lintStageRows: readonly GateRow[] = QUALITY.lintStages.map(stage => ({
    gate: stage.name,
    catches: LINT_STAGE_NOTES[stage.name] ?? stage.command,
  }));

  protected readonly nightlyRows: readonly GateRow[] = QUALITY.nightlyGates.map(gate => ({
    gate: gate.name,
    catches: NIGHTLY_NOTES[gate.name] ?? gate.command,
  }));

  /**
   * The majors, and whether each one shipped a codemod.
   *
   * Deliberately hand-written: `migrations.json` would give the list of
   * codemods, but the interesting half of this table is the majors that ship
   * NONE, and an absence has nothing to read it from. Add a row when a major
   * ships — until then `majorLine` above will name a version this table does
   * not have, which is a visible failure rather than a silent one.
   */
  protected readonly majorRows: readonly MajorRow[] = [
    {
      version: 'v14',
      broke:
        'Six names moved to one word per concept — closeable to closable, totalItems to total, currentPage to page, and [wrInput]’s wrSize to size. Router integration became opt-in for wr-loading-bar and routed tabs. A named date format refuses input it cannot read, and wr-pagination ofLabel is gone.',
      codemod: 'Partial',
    },
    {
      version: 'v13',
      broke:
        'readonly and invalid reach every control, and [id] on checkbox, radio and switch stopped landing on the host — getElementById now returns the inner input, which is what the input always documented.',
      codemod: 'Reports',
    },
    {
      version: 'v12',
      broke:
        'The three date entry points nested under ngwr/date. readI18nText() returns a Signal, so every read needs a call.',
      codemod: 'Partial',
    },
    {
      version: 'v11',
      broke:
        'Five colour intents deepened past the point where a filled control takes a white label instead of a black one.',
      codemod: 'None',
    },
    {
      version: 'v10',
      broke: 'Contrast on the -contrast tokens, table header casing, tooltip theming.',
      codemod: 'None',
    },
    {
      version: 'v9',
      broke:
        'A checkbox’s group identity moved from value to checkboxValue. Lucide icon keys register verbatim. info joined the colour union.',
      codemod: 'Yes',
    },
    {
      version: 'v8',
      broke:
        'Density values renamed from compact / default / comfortable to sm / md / lg. Pagination dropped xs and xl. Two unreliable components removed.',
      codemod: 'Yes',
    },
    {
      version: 'v7',
      broke:
        'Ten standalone entry points consolidated into shared components with modes — the autocomplete became a wr-select, the tooltip a wr-popover.',
      codemod: 'Yes',
    },
  ];

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Migration',
      url: ['/docs', 'migration'],
      description: 'What each major broke, and which of them ship a codemod.',
    },
    {
      kind: 'Guide',
      title: 'Testing',
      url: ['/guides', 'testing'],
      description: 'The CDK harnesses, and how to drive ngwr components from your own specs.',
    },
    {
      kind: 'Guide',
      title: 'Colour tokens',
      url: ['/guides', 'tokens', 'colors'],
      description: 'The contrast and ink split, and where the ratios quoted above come from.',
    },
  ];
}
