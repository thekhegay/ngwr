import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrRating } from 'ngwr/rating';
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

@Component({
  selector: 'ngwr-gs-comparison-page',
  templateUrl: './comparison.html',
  styleUrl: './comparison.scss',
  imports: [
    FormField,
    RouterLink,
    WrCheckbox,
    WrRating,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocSeeAlsoComponent,
  ],
})
export default class ComparisonPage {
  /**
   * The ngwr column, counted rather than typed.
   *
   * Written by `scripts/gen-quality.ts` during the showcase build. It matters
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
   * What is deliberately NOT rounded: ngwr's own commit counts, `1,409 of
   * 1,480`. That is a claim about this repository which the page invites the
   * reader to re-run `git shortlog -sn --all` against, and there the precision
   * IS the honesty — a rounded number cannot be checked, only believed.
   */
  protected readonly comparisonRows: readonly ComparisonRow[] = [
    {
      axis: 'Signal Forms binding',
      ngwr: 'Native. Nineteen value controls implement FormValueControl or FormCheckboxControl; no ControlValueAccessor in the package. One public component with a value model implements neither: [wrColorPickerTrigger].',
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
      ngwr: 'One person — 1,409 of 1,480 commits, under four author identities. The next human contributor has 13; the two bots have 29 each.',
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
      ngwr: 'Two — English and Russian.',
      material: 'Defers to Angular i18n and MAT_DATE_LOCALE.',
      primeng: 'Not measured.',
      zorro: 'Many more than two; the exact count was not measured.',
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

    classic: `<!-- Still supported, and not a fallback path inside the library: Angular 22
     synthesises the accessor for a signal-forms control, so the classic
     bindings reach the same \`value\` model the field would have written. -->
<wr-rating [(ngModel)]="score" />
<wr-rating [formControl]="scoreControl" />`,

    counts: `# Everything the "modernity" claim rests on, as greps over projects/lib.
grep -rn '@NgModule' projects/lib --include='*.ts' | wc -l                      # 0
grep -rn 'standalone: true' projects/lib --include='*.ts' | wc -l               # 0
grep -rn 'ChangeDetectionStrategy.OnPush' projects/lib --include='*.ts' | wc -l # 2
grep -rn 'ControlValueAccessor' projects/lib --include='*.ts' | wc -l           # 16

# The last two need their answer read rather than counted. The two OnPush
# declarations are legacy files under window/; the sixteen mentions of
# ControlValueAccessor are all comments saying there is not one — fifteen in a
# component's own JSDoc, one in a spec's.

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

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Quality',
      url: ['/start', 'quality'],
      description: 'The gates behind the accessibility and testing rows, in numbers.',
    },
    {
      kind: 'Guide',
      title: 'Playground',
      url: ['/start', 'playground'],
      description: 'Try the claim in a real Angular 22 app before installing anything.',
    },
    {
      kind: 'Guide',
      title: 'Migration',
      url: ['/start', 'migration'],
      description: 'What each major broke, and which of them ship a codemod.',
    },
  ];
}
