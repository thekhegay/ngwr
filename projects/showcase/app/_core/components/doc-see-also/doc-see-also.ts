import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { docPageOf, relatedOf } from '#core/utils';

import type { DocSeeAlsoKind, DocSeeAlsoLink } from './types';

/**
 * "See also" block — renders a grid of related-page cards at the bottom
 * of a doc page. Use to cross-link the surfaces consumers reach for
 * together (e.g. a directive and the service it builds on).
 *
 * @example
 * ```html
 * <ngwr-doc-see-also
 *   [links]="[
 *     { kind: 'Service', title: 'WrClipboard', url: ['/reference/services', 'clipboard'],
 *       description: 'Programmatic read + write API.' }
 *   ]"
 * />
 * ```
 */
@Component({
  selector: 'ngwr-doc-see-also',
  host: { class: 'wr-not-typeset' },
  templateUrl: './doc-see-also.html',
  styleUrl: './doc-see-also.scss',
  imports: [RouterLink],
})
export class DocSeeAlsoComponent {
  /** Optional section title. @default 'See also' */
  readonly title = input<string>('See also');

  /** Hand-picked links, shown first. Order preserved. */
  readonly links = input<readonly DocSeeAlsoLink[]>([]);

  private readonly router = inject(Router);

  /** The hand-picked links, then the pages this one is built on or demoed with. */
  protected readonly all = computed<readonly DocSeeAlsoLink[]>(() => {
    const own = this.links();
    const seen = new Set(own.map(l => l.url.join('/').replace(/^\/+/, '')));
    const auto = relatedOf(this.router.url).flatMap(ep => {
      const page = docPageOf(ep);
      if (!page || seen.has(page.route)) return [];
      seen.add(page.route);
      return [{ title: page.title, url: [`/${page.route}`], kind: page.kind as DocSeeAlsoKind }];
    });
    return [...own, ...auto];
  });
}
