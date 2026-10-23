import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import { DocLabelComponent } from '../doc-label/doc-label';
import { docRichToText } from '../doc-rich/doc-rich';

import type { DocSeeAlsoKind, DocSeeAlsoLink } from './types';

import { relatedOf, routeKey } from '#core/utils';
import { type DocPageRef, pageOfRoute } from '#core/utils/deps';

/** The most cards one grid shows, hand-picked ones included. */
const MAX_LINKS = 8;

/**
 * A page's description as a card's one line: the `wrDocRich` forms reduced to their words, and the first sentence
 * only, so a cut line ends on a whole sentence where one fits.
 */
function cardLine(description: string): string {
  const text = docRichToText(description).trim();
  const end = /[.!?](?=\s+\S)/.exec(text);
  return end ? text.slice(0, end.index + 1) : text;
}

/** A link with the parts its author left out taken from the page it points at. */
function filled(link: DocSeeAlsoLink, page: DocPageRef | null): DocSeeAlsoLink {
  const kind = link.kind ?? (page?.kind as DocSeeAlsoKind | null | undefined);
  const description = link.description ?? (page?.description ? cardLine(page.description) : undefined);
  return { ...link, ...(kind ? { kind } : {}), ...(description ? { description } : {}) };
}

/**
 * "See also" block — renders a grid of related-page cards at the bottom
 * of a doc page. Use to cross-link the surfaces consumers reach for
 * together (e.g. a directive and the service it builds on).
 *
 * Every card has the same parts — a kind label, a title, one line of
 * description. A link that leaves out its `kind` or `description` takes the
 * linked page's own, and a part some card still cannot fill (a page with no
 * static description) is dropped from the whole grid rather than from that
 * card alone.
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
  imports: [DocLabelComponent, RouterLink, WrTypography],
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
    const own = this.links()
      .filter(link => {
        const route = routeKey(link.url.join('/'));
        if (seen.has(route)) return false;
        seen.add(route);
        return true;
      })
      .map(link => filled(link, pageOfRoute(link.url.join('/'))));
    const more = relatedOf(this.router.url, seen, MAX_LINKS - own.length).map(page =>
      filled({ title: page.title, url: [`/${page.route}`] }, page)
    );
    return [...own, ...more].slice(0, MAX_LINKS);
  });

  /** Whether every card has a kind label: one row, one set of parts. */
  protected readonly showKind = computed(() => this.all().every(link => !!link.kind));

  /** Whether every card has a line of description. */
  protected readonly showDescription = computed(() => this.all().every(link => !!link.description));
}
