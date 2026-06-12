import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { WrBadge } from 'ngwr/badge';
import type { WrColor } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import { DocRichPipe } from '../doc-rich/doc-rich';

import { MetaService } from '#core/services';

const FALLBACK_CATEGORY = 'Docs';

const CATEGORY_BY_SEGMENT: Readonly<Record<string, string>> = {
  components: 'Components',
  animations: 'Animations',
  directives: 'Directives',
  icons: 'Icons',
  pipes: 'Pipes',
  services: 'Services',
  translate: 'Translate',
  interfaces: 'Interfaces',
  typography: 'Typography',
  utils: 'Utils',
  validators: 'Validators',
  'getting-started': 'Getting Started',
};

/**
 * Top-level documentation page shell.
 *
 * Renders the page header (label chips, title, description) and projects
 * the page content below. Wires up `MetaService` automatically — pages
 * don't need to set the title, description, keywords, or canonical URL.
 *
 * **Category** — the title-bar category prefix (e.g. "Components", "Utils")
 * is derived from the first URL segment by default, so per-page boilerplate
 * stays minimal. Override `[category]` only for the rare page that needs
 * a forced label.
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
   * value (default behaviour). The derived value comes from the first URL
   * segment, mapped via {@link CATEGORY_BY_SEGMENT}.
   */
  readonly category = input<string | null>(null);

  private readonly router = inject(Router);
  private readonly meta = inject(MetaService);

  protected readonly resolvedCategory = computed(() => this.category() ?? this.deriveCategoryFromUrl());

  constructor() {
    this.meta.setCanonicalURL();

    effect(() => {
      this.meta.setTitle([this.title(), this.resolvedCategory()]);

      const description = this.description();
      if (description) this.meta.setDescription(description);

      const keywords = this.keywords();
      if (keywords.length) this.meta.setKeywords([...keywords]);
    });
  }

  protected labelColor(label: string): WrColor {
    return label === 'Experimental' ? 'danger' : 'light';
  }

  private deriveCategoryFromUrl(): string {
    // First non-empty path segment, e.g. `/utils/keys` → 'utils'.
    const segment = this.router.url.split(/[/?#]/).find(s => s.length > 0) ?? '';
    return CATEGORY_BY_SEGMENT[segment] ?? FALLBACK_CATEGORY;
  }
}
