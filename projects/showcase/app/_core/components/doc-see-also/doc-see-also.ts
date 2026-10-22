import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DocLabelComponent } from '../doc-label/doc-label';

import type { DocSeeAlsoKind, DocSeeAlsoLink } from './types';

import { relatedOf, routeKey } from '#core/utils';

/** The most cards one grid shows, hand-picked ones included. */
const MAX_LINKS = 8;

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
  imports: [DocLabelComponent, RouterLink],
})
export class DocSeeAlsoComponent {
  /** Optional section title. @default 'See also' */
  readonly title = input<string>('See also');

  /** Hand-picked links, shown first. Order preserved. */
  readonly links = input<readonly DocSeeAlsoLink[]>([]);

  private readonly router = inject(Router);

  /**
   * The hand-picked links, then the curated `RELATED` for this route, then the pages it is built on or demoed with —
   * each route once, eight cards at most.
   */
  protected readonly all = computed<readonly DocSeeAlsoLink[]>(() => {
    const seen = new Set<string>();
    const own = this.links().filter(link => {
      const route = routeKey(link.url.join('/'));
      if (seen.has(route)) return false;
      seen.add(route);
      return true;
    });
    const more = relatedOf(this.router.url, seen, MAX_LINKS - own.length).map(page => ({
      title: page.title,
      url: [`/${page.route}`],
      ...(page.kind ? { kind: page.kind as DocSeeAlsoKind } : {}),
    }));
    return [...own, ...more].slice(0, MAX_LINKS);
  });
}
