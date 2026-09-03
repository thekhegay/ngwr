import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { WrBadge } from 'ngwr/badge';
import type { WrColor } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import { DocCssVarsComponent } from '../doc-css-vars/doc-css-vars';
import { DocRichPipe, docRichToText } from '../doc-rich/doc-rich';
import { DocSectionComponent } from '../doc-section/doc-section';

import { CSS_VARS, type DocCssVarRoute, type DocCssVars } from '#core/generated/css-vars';
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
  imports: [DocCssVarsComponent, DocRichPipe, DocSectionComponent, WrBadge, WrTypography],
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

  /**
   * The `--wr-*` hooks this page's component publishes, or `null` for a route
   * that documents no entry point.
   *
   * Rendered by the shell rather than asked for per page, and that is the point
   * rather than a convenience. A component's own custom properties are the
   * sanctioned, non-breaking way to restyle it, and until this section existed
   * they were catalogued nowhere — so a consumer who could not find a hook
   * overrode the internal BEM class instead, against a stability statement that
   * did not intend to cover those. A per-page opt-in would have reproduced the
   * gap one page at a time; here a component with hooks cannot ship without
   * them listed. The catalogue is written by `pnpm gen:css-vars` from the
   * library's stylesheets, so a renamed hook moves on the next build.
   */
  protected readonly cssVars = computed<DocCssVars | null>(() => {
    const route = this.router.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    return Object.hasOwn(CSS_VARS, route) ? CSS_VARS[route as DocCssVarRoute] : null;
  });

  /**
   * Why the section says "declare them on the component's own selector".
   *
   * The library declares each default ON the block — `.wr-alert { --wr-alert-bg:
   * … }` — so a custom property inherited from `:root` is shadowed by it and an
   * app-wide override silently does nothing. The instruction is the one thing a
   * reader has to know before the table is usable.
   */
  protected cssVarsDescription(subpath: string): string {
    return (
      `Custom properties \`${subpath}\` publishes. Each default below is declared on the component's ` +
      `own selector, so a \`:root\` override is shadowed by it — set them on that selector, on a ` +
      'wrapper you scope yourself, or inline on the element. Unlike the BEM class names, these are ' +
      'the supported way to restyle the component.'
    );
  }

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
