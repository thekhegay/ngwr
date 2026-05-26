import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { MetaService } from '#core/services';

/**
 * Top-level documentation page shell.
 *
 * Renders the page header (label chips, title, description) and projects
 * the page content below. Wires up `MetaService` automatically — pages
 * don't need to set the title, description, keywords, or canonical URL.
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
  selector: 'ngwr-doc-page',
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** Title category prefix used in the document title (e.g. "Components"). */
  readonly category = input<string>('Components');

  private readonly meta = inject(MetaService);

  constructor() {
    this.meta.setCanonicalURL();

    effect(() => {
      this.meta.setTitle([this.title(), this.category()]);

      const description = this.description();
      if (description) this.meta.setDescription(description);

      const keywords = this.keywords();
      if (keywords.length) this.meta.setKeywords([...keywords]);
    });
  }
}
