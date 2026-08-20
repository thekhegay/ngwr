import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrTag } from 'ngwr/badge';
import { WrDescriptionItem, WrDescriptions } from 'ngwr/descriptions';
import { WrStatistic, WrStatisticGroup } from 'ngwr/statistic';
import { WrTable, WrTableCell } from 'ngwr/table';
import type { WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';
import { QUALITY } from '#core/generated/quality';

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
  lint: 'ESLint, Stylelint and four repository gates in one chain — colour-list parity, unexplained physical CSS, the registry format, dead design tokens. Every stage is listed below.',
  'test:coverage':
    'The vitest suite, with coverage. Specs sit beside the code they cover and assert the rendered DOM — roles, ARIA state, and the .wr-* classes, which are public API — rather than component internals.',
  'check:api-docs':
    'A documented input the component no longer has, a default the docs invented, a page with no API table at all. Every hand-written table is compared against the signal API in the source.',
  'check:llms':
    'The generated AI assets — llms-full.txt and the agent skill — against coverage floors. Missing frontmatter, or a catalog table with nothing but a header, fails the build.',
  'build:lib':
    'ng-packagr over every secondary entry point, then the schematics, the MCP server and the AI assets. An entry point that does not compile in isolation fails here and nowhere else.',
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
  'check:registry':
    'The open registry items, their entryPoints against the real catalog, and schema.json against the validator that enforces it.',
  'check:tokens':
    'A --wr-* token nothing paints with. A say-why gate rather than a do-not gate: an intentionally unused token carries unused-ok: and the reason.',
};

/** The nightly workflow. `build:showcase` is on it because the other three read what it writes. */
const NIGHTLY_NOTES: Readonly<Record<string, string>> = {
  'build:showcase': 'Not a check. The three below read dist/showcase and cannot start without it.',
  'check:contrast':
    "axe's color-contrast and target-size rules in a real Chromium, both themes, every canonical route — the two rules check:a11y has to switch off.",
  'check:state-a11y':
    'The full axe rule set inside a state you have to create: a hover, a focus ring, an open overlay. Neither static gate can reach one.',
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
  selector: 'ngwr-gs-quality-page',
  templateUrl: './quality.html',
  imports: [
    RouterLink,
    WrAlert,
    WrDescriptionItem,
    WrDescriptions,
    WrStatistic,
    WrStatisticGroup,
    WrTable,
    WrTableCell,
    WrTag,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSeeAlsoComponent,
  ],
})
export default class QualityPage {
  /**
   * Every figure the template renders. Bound, never retyped — the file behind
   * it is written by `scripts/gen-quality.ts` during `build:showcase`, so the
   * page cannot outlive the repository it describes.
   */
  protected readonly quality = QUALITY;

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

  protected readonly pageDescription = `What gates a change to ngwr — ${QUALITY.prGates.length} checks on every pull request, ${QUALITY.testCasesAreExact ? '' : 'at least '}${grouped(QUALITY.testCases)} test cases and three accessibility sweeps — and an honest account of what those gates cannot see.`;

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

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Testing',
      url: ['/guides', 'testing'],
      description: 'The CDK harnesses, and how to drive ngwr components from your own specs.',
    },
    {
      kind: 'Guide',
      title: 'Migration guide',
      url: ['/start', 'migration'],
      description: 'Every breaking change back to v7, and which ones the codemod rewrites for you.',
    },
    {
      kind: 'Guide',
      title: 'Colour tokens',
      url: ['/guides', 'tokens', 'colors'],
      description: 'The contrast and ink split, and where the ratios quoted above come from.',
    },
  ];
}
