import { Component, computed, input } from '@angular/core';

import { CircleCheckBig, ListChecks, PackageCheck } from 'lucide';
import { WrButton } from 'ngwr/button';
import { WrCard } from 'ngwr/card';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';

import { DocCodeComponent } from '../doc-code/doc-code';
import { DocInstallComponent } from '../doc-install/doc-install';
import { DocRichPipe } from '../doc-rich/doc-rich';

import type { DocNgtrueVariant } from './types';

import { BRAND_ICONS } from '#core/icons';

/** ngtrue's docs. Every link this block draws starts here or on GitHub. */
const NGTRUE_URL = 'https://ngtrue.khegay.dev';
const NGTRUE_REPO = 'https://github.com/thekhegay/ngtrue';

interface NgtrueItem {
  readonly icon: string;
  readonly title: string;
  /**
   * Rendered through `wrDocRich`: a `backtick` run is inline code. Each one
   * opens with the subpath that holds it, so the chip sits in the same place in
   * both items at every width.
   */
  readonly description: string;
}

/**
 * ngtrue, the companion package that checks ngwr's controls and its package,
 * drawn the one way the site draws it.
 *
 * `feature` is the home page's block: the mark, the tagline, both entry
 * points, a spec, the install line and two calls to action. `compact` is one
 * link card for a guide, with a pitch written for that page. Both are external
 * links in a new tab.
 *
 * Facts are ngtrue's own: the sample is the README's `ngtrue/testing` spec,
 * the API name is `assertSignalFormsControl`, and the package is always a dev
 * dependency. Nothing here counts rules or checks, since a number typed here
 * goes stale the release ngtrue adds one.
 *
 * @example
 * ```html
 * <ngwr-doc-ngtrue variant="feature" />
 * <ngwr-doc-ngtrue
 *   page="guide/assert-signal-forms-control"
 *   pitch="`assertSignalFormsControl` runs the suite ngwr's own controls pass."
 * />
 * ```
 */
@Component({
  selector: 'ngwr-doc-ngtrue',
  templateUrl: './doc-ngtrue.html',
  styleUrl: './doc-ngtrue.scss',
  // Inside a docs page the typeset would restyle the card's text as prose.
  host: { class: 'wr-not-typeset' },
  imports: [WrButton, WrCard, WrIcon, DocCodeComponent, DocInstallComponent, DocRichPipe],
  providers: [
    provideWrIcons([
      ...BRAND_ICONS,
      ...lucideIcons({
        ngtrue: CircleCheckBig,
        'list-checks': ListChecks,
        'package-check': PackageCheck,
      }),
    ]),
  ],
})
export class DocNgtrueComponent {
  /** `feature` on the home page, `compact` in a guide. */
  readonly variant = input<DocNgtrueVariant>('compact');

  /**
   * `compact` only: the card's one line, written for the page it sits on.
   * Inline `code` only — the whole card is the link, so a link inside it would
   * nest one anchor in another.
   */
  readonly pitch = input('Checks that keep an Angular library true.');

  /** `compact` only: the ngtrue page to open, relative to its docs root (`guide/assert-signal-forms-control`). */
  readonly page = input('');

  protected readonly docsUrl = NGTRUE_URL;
  protected readonly repoUrl = NGTRUE_REPO;

  protected readonly pageUrl = computed(() => (this.page() ? `${NGTRUE_URL}/${this.page()}` : NGTRUE_URL));

  protected readonly items: readonly NgtrueItem[] = [
    {
      icon: 'list-checks',
      title: 'Signal Forms conformance',
      description: "`ngtrue/testing` checks a custom control's wiring and names the rule that broke.",
    },
    {
      icon: 'package-check',
      title: 'Packaging checks',
      description: '`ngtrue/node` holds the manifest against the build: exports, types, schematics and peer ranges.',
    },
  ];

  /** The README's `ngtrue/testing` spec, verbatim. */
  protected readonly sample = `import { assertSignalFormsControl } from 'ngtrue/testing';

it('is a conforming Signal Forms control', async () => {
  await assertSignalFormsControl(() => TestBed.createComponent(Host));
});`;
}
