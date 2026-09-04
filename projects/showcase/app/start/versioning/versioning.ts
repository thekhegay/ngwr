import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrTag } from 'ngwr/badge';
import { WrTable, WrTableCell } from 'ngwr/table';
import type { WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';
import { QUALITY } from '#core/generated/quality';

/** One row of the support table — the same three rows `SECURITY.md` carries. */
interface SupportRow {
  readonly line: string;
  readonly level: string;
  readonly means: string;
}

/** One row of the "is this public API" table. */
interface SurfaceRow {
  readonly surface: string;
  readonly status: string;
  readonly check: string;
}

@Component({
  selector: 'ngwr-gs-versioning-page',
  templateUrl: './versioning.html',
  imports: [
    RouterLink,
    WrAlert,
    WrTable,
    WrTableCell,
    WrTag,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSeeAlsoComponent,
  ],
})
export default class VersioningPage {
  /**
   * `14.0.0` to `14` — the major is the only part any of this page is about.
   *
   * Read from the repository during `build:showcase`, and every row below is
   * DERIVED from it, for the same reason `scripts/lib/version/support-table.ts`
   * derives the one in `SECURITY.md`: maintained by hand, that table went two
   * majors stale, and it is the one document somebody reads before deciding
   * whether a fix will ever reach them.
   */
  private readonly major = Number(QUALITY.version.split('.')[0]);

  protected readonly majorLine = `v${this.major}`;

  protected readonly pageDescription = `What the version number promises, what the open-ended Angular peer range does and does not, how long v${this.major} keeps getting security fixes, and what to do the day a new Angular ships.`;

  protected readonly supportColumns: WrTableColumns = {
    line: { title: 'Line', width: 96 },
    level: { title: 'Support', width: 132 },
    means: { title: 'What that means' },
  };

  protected readonly supportRows: readonly SupportRow[] = [
    {
      line: `${this.major}.x`,
      level: 'Full',
      means: 'Every security fix, and every other fix. This is the line releases are cut from.',
    },
    {
      line: `${this.major - 1}.x`,
      level: 'Limited',
      means: `Security fixes only, and only where the fix is mechanical — no new inputs, no narrowed types, nothing that changes what already-accepted input renders. Where the only correct fix is not mechanical the advisory says so and the answer is to upgrade. This row ends when ${`v${this.major + 1}`} ships.`,
    },
    {
      line: `< ${this.major - 1}.0`,
      level: 'None',
      means:
        'Unsupported. Report against any version you can reproduce on — working out which majors are affected is triage’s job, not yours — but the fix will land on a supported line.',
    },
  ];

  protected readonly surfaceColumns: WrTableColumns = {
    surface: { title: 'Surface', width: 190 },
    status: { title: 'Covered', width: 108 },
    check: { title: 'How you check one' },
  };

  protected readonly surfaceRows: readonly SurfaceRow[] = [
    {
      surface: 'Anything with a docs page',
      status: 'Yes',
      check:
        'Every component, directive, pipe, service, util and validator under /reference, and every provideWr*() function. Their API tables are compared against the library on every pull request — names, types and defaults alike — so most drift between a page and the source is a red build rather than something you find at runtime.',
    },
    {
      surface: '.wr-* class names',
      status: 'Yes',
      check:
        'Components ship ViewEncapsulation.None, so the BEM classes are styleable and are treated as API. They are also what the test harnesses read. Inspect the element — what you see is what a major has to keep.',
    },
    {
      surface: '--wr-* custom properties',
      status: 'Yes',
      check:
        'The token layer, plus the per-component hooks listed in the CSS variables section of each component page. Both halves are gated: check:tokens fails a token in the theme layer that nothing paints with, and check:css-vars regenerates every per-component list from the stylesheets, so the hooks a page names are the hooks the CSS reads.',
    },
    {
      surface: 'Marked @internal',
      status: 'No',
      check:
        'The marker survives into the shipped types, so it is greppable: grep -rn "@internal" node_modules/ngwr/types. Injection tokens a component uses to talk to its own parent live here — WR_SELECT, WR_TABS, WR_CHECKBOX_GROUP, WR_RADIO_GROUP, WR_COLLAPSE_GROUP, WR_BUTTON_GROUP, WR_CAROUSEL, WR_ICONS, WR_I18N_CONFIG, WR_OVERLAY, WR_OVERLAY_CONTAINER. Provide the documented provideWr*() instead.',
    },
    {
      surface: 'Exported, undocumented, unmarked',
      status: 'Not yet',
      check:
        'A real gap rather than a category: wrAppendOverlayClose, wrMirrorOffsets, wrPresentAsSheet and WrOutsideClick from ngwr/overlay, useConfigValue, useFormFieldAria, squirclePath, wrContrastFor, wrIntentTokens, isSafeCssValue, and a handful of WR_* context tokens such as WR_STEPPER. They import, they work, and nothing on this site describes what they promise. Treat them as unsupported until a page exists — and open an issue naming the one you want, because that is what turns a hole into a decision.',
    },
  ];

  protected readonly snippets = {
    guard: `# What a release actually runs. --bump is the workflow's one input,
# and this is the step that refuses it.
pnpm release:prepare --bump=minor

# Illustrative output, with one breaking commit on the branch:
#
#   Refusing --bump=minor: 1 breaking commit(s) since v${this.major}.0.0.
#     feat(select)!: clearable is opt-in
#   A \`!\` type or a \`BREAKING CHANGE:\` footer requires --bump=major.
#
# Exit status 1. No version written, no changelog, no release PR.`,

    check: `# Everything on this page is a fact about the repository. Read it there.
cat node_modules/ngwr/package.json | jq .peerDependencies   # the ranges
grep -rn "@internal" node_modules/ngwr/types                # what is not API
npm view ngwr time                                          # every release, dated
npm view ngwr dist-tags                                     # latest, and any rc on \`next\``,

    pin: `# Pin the major and let the minors in. That is a safe range now — the guard
# above is what makes it one — and it was not on v12, where 12.2.0 was a minor
# carrying a breaking change.
npm pkg set dependencies.ngwr="^${this.major}.0.0"

# Then read what a range would actually have picked up, before you widen it.
npm view ngwr versions --json`,
  };

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Quality',
      url: ['/start', 'quality'],
      description: 'What gates a release, what the gates cannot see, and what the project does not buy you.',
    },
    {
      kind: 'Guide',
      title: 'Migration guide',
      url: ['/start', 'migration'],
      description: 'Every breaking change back to v6, and which half of each major the codemod rewrites.',
    },
    {
      kind: 'Guide',
      title: 'Installation',
      url: ['/start', 'installation'],
      description: 'The peer list in full, what ships in the tarball, and what a per-component style entry costs.',
    },
  ];
}
