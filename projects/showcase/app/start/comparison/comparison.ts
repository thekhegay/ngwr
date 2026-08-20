import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrRating } from 'ngwr/rating';
import { WrTable, type WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';

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

/** One row of the comparison table — one deciding factor across five libraries. */
interface ComparisonRow {
  readonly axis: string;
  readonly ngwr: string;
  readonly material: string;
  readonly primeng: string;
  readonly zorro: string;
  readonly taiga: string;
}

@Component({
  selector: 'ngwr-gs-comparison-page',
  templateUrl: './comparison.html',
  imports: [
    FormField,
    RouterLink,
    WrCheckbox,
    WrRating,
    WrTable,
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

  protected readonly comparisonColumns: WrTableColumns = {
    axis: { title: 'Deciding factor', width: 168 },
    ngwr: { title: 'ngwr 12' },
    material: { title: 'Angular Material 22' },
    primeng: { title: 'PrimeNG 22' },
    zorro: { title: 'NG-ZORRO 22' },
    taiga: { title: 'Taiga UI 5' },
  };

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
   */
  protected readonly comparisonRows: readonly ComparisonRow[] = [
    {
      axis: 'Signal Forms binding',
      ngwr: 'Native. Eighteen value controls implement FormValueControl or FormCheckboxControl; no ControlValueAccessor in the package. Two public components with a value model implement neither: wr-segmented and [wrColorPickerTrigger].',
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
      ngwr: '151.',
      material: '2,015,398.',
      primeng: '644,037.',
      zorro: '225,137.',
      taiga: '19,915.',
    },
    {
      axis: 'GitHub stars',
      ngwr: '3.',
      material: '25,035.',
      primeng: '12,495.',
      zorro: '9,167.',
      taiga: '4,041.',
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
grep -rn 'ControlValueAccessor' projects/lib --include='*.ts' | wc -l           # 14

# The last two need their answer read rather than counted. The two OnPush
# declarations are legacy files under window/; the fourteen mentions of
# ControlValueAccessor are all JSDoc saying there is not one.

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
