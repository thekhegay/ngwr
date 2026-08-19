import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { WrBadge } from 'ngwr/badge';
import type { WrColor } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import { DocRichPipe, docRichToText } from '../doc-rich/doc-rich';

import { MetaService } from '#core/services';

const FALLBACK_CATEGORY = 'Docs';

/**
 * Clusters whose own segment is a container rather than a category — the label
 * lives one level in (`/reference/utils/clamp` → 'Utils'). The value here is
 * what a page sitting directly under the cluster gets instead.
 */
const CLUSTER_CATEGORY: Readonly<Record<string, string>> = {
  guides: 'Guides',
  reference: 'Reference',
};

const CATEGORY_BY_SEGMENT: Readonly<Record<string, string>> = {
  components: 'Components',
  animations: 'Animations',
  directives: 'Directives',
  icons: 'Icons',
  pipes: 'Pipes',
  services: 'Services',
  translations: 'Translations',
  interfaces: 'Interfaces',
  typography: 'Typography',
  tokens: 'Design tokens',
  utils: 'Utils',
  validators: 'Validators',
  start: 'Start',
};

/**
 * Top-level documentation page shell.
 *
 * Renders the page header (label chips, title, description) and projects
 * the page content below. Wires up `MetaService` automatically — pages
 * don't need to set the title, description, keywords, or canonical URL.
 *
 * **Category** — the document-title category (e.g. "Components", "Utils") is
 * derived from the URL by default, so per-page boilerplate stays minimal. It is
 * the CLUSTER segment that decides: `animations` / `icons` / `start` sit at the
 * top level and name themselves, while `reference` and `guides` are containers
 * and the label comes from the segment under them. Override `[category]` only
 * for the rare page that needs a forced label.
 *
 * @example
 * ```html
 * <ngwr-doc-page
 *   title="Badge"
 *   description="Small status indicator with color variants."
 *   [keywords]="['badge', 'wr-badge']"
 *   [labels]="['Component', 'Standalone']"
 * >
 *   <ngwr-doc-section title="Basic usage">...</ngwr-doc-section>
 * </ngwr-doc-page>
 * ```
 */
@Component({
  imports: [DocRichPipe, WrBadge, WrTypography],
  selector: 'ngwr-doc-page',
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
})
export class DocPageComponent {
  /** Page title. Used as the H1 and in the document title. */
  readonly title = input.required<string>();

  /** Short page description. Used as the lede and meta description. */
  readonly description = input<string | null>(null);

  /** Page-scoped keywords appended to the global set. */
  readonly keywords = input<readonly string[]>([]);

  /** Decorative chips shown above the title (e.g. "Component", "Standalone"). */
  readonly labels = input<readonly string[]>([]);

  /**
   * Override the auto-derived category. Pass `null` to use the URL-derived
   * value (default behaviour). The derived value comes from the cluster
   * segment, mapped via {@link CATEGORY_BY_SEGMENT}.
   */
  readonly category = input<string | null>(null);

  private readonly router = inject(Router);
  private readonly meta = inject(MetaService);

  protected readonly resolvedCategory = computed(() => this.category() ?? this.deriveCategoryFromUrl());

  constructor() {
    this.meta.setCanonicalURL();
    this.meta.setMarkdownAlternate();

    effect(() => {
      this.meta.setTitle([this.title(), this.resolvedCategory()]);

      const description = this.description();
      // Stripped, not raw: the lede renders the same string through `wrDocRich`,
      // and a `<meta>` value is read by a search result and a social card, which
      // render nothing. Left raw, 109 of 199 prerendered pages advertised their
      // own backticks — and `/reference/components/qrcode` shipped a whole
      // `[text](url)`, brackets and URL included, as its snippet.
      if (description) this.meta.setDescription(docRichToText(description));

      const keywords = this.keywords();
      if (keywords.length) this.meta.setKeywords([...keywords]);
    });
  }

  protected labelColor(label: string): WrColor {
    return label === 'Experimental' ? 'danger' : 'light';
  }

  private deriveCategoryFromUrl(): string {
    // `/reference/utils/clamp` → ['reference', 'utils', 'clamp'].
    const [first = '', second = ''] = this.router.url.split(/[/?#]/).filter(s => s.length > 0);

    // Read the cluster before the first segment: the IA moved every page under
    // `/reference/*`, `/guides/*` and `/start/*`, and a first-segment-only
    // lookup then missed for all but `animations` and `icons` — 174 prerendered
    // pages shipped `<title>… · Docs · ngwr</title>` off the fallback below,
    // which is exactly what a fallback looks like when it is doing the work.
    // A cluster page with nothing mapped under it keeps the cluster's own name.
    const cluster = CLUSTER_CATEGORY[first];
    if (cluster) return CATEGORY_BY_SEGMENT[second] ?? cluster;

    return CATEGORY_BY_SEGMENT[first] ?? FALLBACK_CATEGORY;
  }
}
