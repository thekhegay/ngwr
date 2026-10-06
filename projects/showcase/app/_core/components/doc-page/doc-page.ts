import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { WrBadge } from 'ngwr/badge';
import type { WrColor } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent } from '../doc-code/doc-code';
import type { DocCodeFile } from '../doc-code/types';
import { DocCssVarsComponent } from '../doc-css-vars/doc-css-vars';
import { DocRichPipe, docRichToText } from '../doc-rich/doc-rich';
import { DocSectionComponent } from '../doc-section/doc-section';

import { CSS_VARS, type DocCssVarRoute, type DocCssVars } from '#core/generated/css-vars';
import { INSTALL, type DocInstallEntry, type DocInstallRoute } from '#core/generated/install';
import { MetaService } from '#core/services';
import { releaseLabel } from '#core/utils';

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
  bits: 'Bits',
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
 * the CLUSTER segment that decides: `bits` / `icons` / `start` sit at the
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
  imports: [DocCodeComponent, DocCssVarsComponent, DocRichPipe, DocSectionComponent, WrBadge, WrTypography],
  selector: 'ngwr-doc-page',
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
  // `title` is an input, and a static attribute that feeds an input is still written
  // onto the host, where the browser shows it as a native tooltip over the whole
  // page or section.
  host: { '[attr.title]': 'null' },
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
   * The library version this page's subject FIRST SHIPPED IN — `'14.5.0'`.
   * Absent (the default) prints nothing, which is what almost every page does.
   *
   * **The page is the source of that fact.** Nothing in `projects/lib` carries
   * an `@since` tag, so there is no history to derive one from, and git cannot
   * supply it either — a renamed entry point looks new the day it moves. So only
   * a page that DECLARES a version gets the line, and the silence everywhere
   * else is the escape hatch rather than a backlog.
   *
   * It is also the one string behind the nav's "new" mark:
   * `pnpm gen:api-docs` reads this attribute out of the template into
   * `#core/generated/since`, and the sidebar and the cluster index pages mark a
   * link whose version is on the current release line. Write it as a plain
   * attribute — a bound `[since]` cannot be read by that scan, and
   * `pnpm check:api-docs` fails on one rather than letting the mark go missing.
   *
   * @example
   * ```html
   * <ngwr-doc-page title="Graph" since="14.5.0"> … </ngwr-doc-page>
   * ```
   */
  readonly since = input<string | null>(null);

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
   * "Added in v14.5", or `null` when the page declares nothing.
   *
   * A whole phrase rather than a bare version, because it sits in the chip row
   * beside "Component" and "Standalone": those are what the thing IS, and a
   * lone "v14.5" among them reads as another one of those. It is also the chip's
   * accessible text, and it stays OUT of the `<h1>` so the heading's own name
   * remains the page title.
   */
  protected readonly addedIn = computed(() => {
    const version = this.since();
    return version ? `Added in ${releaseLabel(version)}` : null;
  });

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
  /**
   * The two halves of an installation, rendered by the SHELL.
   *
   * The import was always here, written by hand on 128 pages. The `@use` was
   * on none of them — and v15 is the release that made it load-bearing, by
   * removing the `@use 'ngwr'` umbrella. A page that shows only the import
   * teaches half an installation, and the half it omits fails silently: the
   * component renders, unstyled, with nothing in the build or the console.
   *
   * Generated from the page's own imports (`#core/generated/install`), so the
   * recipe cannot disagree with the page it sits on, and a component that
   * moves entry point carries its install line with it.
   */
  /** The URL with its leading and trailing slashes off — how both generated maps are keyed. */
  private readonly routeKey = computed(() => this.router.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, ''));

  protected readonly install = computed<readonly DocCodeFile[] | null>(() => {
    // `DocInstallEntry`, not a restatement of its fields. The inline shape this
    // replaces had gone stale the moment the generator grew `declarables`, and
    // a structural cast is exactly the kind that goes stale silently.
    const entries = INSTALL[this.routeKey() as DocInstallRoute] as readonly DocInstallEntry[] | undefined;
    if (!entries || entries.length === 0) return null;

    const withSymbols = entries.filter(e => e.symbols.length > 0);
    const imports = withSymbols.map(e => `import { ${e.symbols.join(', ')} } from '${e.path}';`).join('\n');
    // Only a `@Component`, `@Directive` or `@Pipe` may go in `imports: []`.
    // This used to be every symbol the page imported, which put provider
    // functions, services, tokens and plain helpers in there and left 58 of
    // the recipes opening with a line that does not compile —
    // `@Component({ imports: [WrButton, provideWrIcons, lucideIcons, WR_COLORS] })`
    // on the button page alone. The rest are still IMPORTED, because the page
    // genuinely uses them; they are just used somewhere else, and the note
    // below says so rather than leaving a reader to find out from tsc.
    const declared = withSymbols.flatMap(e => e.declarables);
    const rest = withSymbols.flatMap(e => e.symbols).filter(s => !declared.includes(s));
    const note =
      rest.length > 0
        ? `\n\n// ${rest.join(', ')} — not declarables. A provide* function goes in` +
          `\n// bootstrap or a component's \`providers\`, a service is injected, and a` +
          `\n// token, constant or helper is used where you need it.`
        : '';

    const ts =
      declared.length > 0
        ? `${imports}\n\n@Component({ imports: [${declared.join(', ')}] })\nexport class MyComponent {}${note}`
        : `${imports}${note}`;

    // `ngwr/theme` leads and is not optional: every component entry loads the
    // token layer too and Sass emits it once, but only a module's FIRST load
    // can take `with (...)`, so it has to be the first ngwr line in the file.
    const styled = entries.filter(e => e.styled);
    const scss =
      styled.length > 0
        ? [`// styles.scss — the token layer first, then one line per component.`, `@use 'ngwr/theme';`]
            .concat(styled.map(e => `@use '${e.path}';`))
            .join('\n')
        : '';

    const files: DocCodeFile[] = [];
    if (ts) files.push({ label: 'TS', language: 'typescript', code: ts });
    if (scss) files.push({ label: 'SCSS', language: 'scss', code: scss });
    return files.length > 0 ? files : null;
  });

  /**
   * The section's own description, which follows whether an SCSS half was
   * emitted. `ngwr/pipes`, `ngwr/validators`, `ngwr/utils` and `ngwr/date` carry
   * no `sass` condition, so there is no second half to insist on — and insisting
   * sends a careful reader looking for the line the page did not print, where
   * `@use 'ngwr/pipes'` fails the Sass build outright rather than doing nothing.
   */
  protected readonly installDescription = computed(() =>
    this.install()?.some(f => f.language === 'scss')
      ? "The class goes in the component's `imports`, and the entry point goes in your global stylesheet. **Both halves are needed** — a component whose styles are not `@use`d renders unstyled, with nothing in the build to say so."
      : "The class goes in the component's `imports`. This entry point ships no stylesheet, so there is no `@use` line to add."
  );

  protected readonly cssVars = computed<DocCssVars | null>(() => {
    const route = this.routeKey();
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

  protected labelColor(label: string): WrColor | null {
    return label === 'Experimental' ? 'danger' : null;
  }

  private deriveCategoryFromUrl(): string {
    // `/reference/utils/clamp` → ['reference', 'utils', 'clamp'].
    const [first = '', second = ''] = this.router.url.split(/[/?#]/).filter(s => s.length > 0);

    // Read the cluster before the first segment: the IA moved every page under
    // `/reference/*`, `/guides/*` and `/start/*`, and a first-segment-only
    // lookup then missed for all but `bits` and `icons` — 174 prerendered
    // pages shipped `<title>… · Docs · ngwr</title>` off the fallback below,
    // which is exactly what a fallback looks like when it is doing the work.
    // A cluster page with nothing mapped under it keeps the cluster's own name.
    const cluster = CLUSTER_CATEGORY[first];
    if (cluster) return CATEGORY_BY_SEGMENT[second] ?? cluster;

    return CATEGORY_BY_SEGMENT[first] ?? FALLBACK_CATEGORY;
  }
}
