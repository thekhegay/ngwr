/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';

import type { WrCommandItem } from 'ngwr/command-palette';

/**
 * Docs search, over Algolia, with no client library.
 *
 * A search is one POST with two headers, so `algoliasearch` would buy nothing a
 * dozen lines do not — and this repository hand-rolls a markdown parser rather
 * than take a dependency, so a search client for one endpoint is not where the
 * line moves. It also keeps the site's only network call first-party in shape:
 * `connect-src` widens, `script-src` does not, which is the difference between
 * this and the stock DocSearch widget.
 *
 * The credentials below are public by design. Algolia's search-only key is
 * meant to ship in frontend code — it can query this one index and nothing
 * else. The key that WRITES the index lives in the crawler's own configuration
 * and never reaches the browser.
 */
const APP_ID = '9D0SC5HROC';
const SEARCH_KEY = 'c875ed73512affd488d505745c129485';
const INDEX = 'ngwr';
const HITS = 20;

/** One record as the DocSearch crawler writes it. */
interface AlgoliaHit {
  readonly objectID: string;
  readonly url?: string;
  readonly content?: string | null;
  readonly hierarchy?: Readonly<Record<string, string | null>>;
}

@Injectable({ providedIn: 'root' })
export class DocsSearch {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);

  /**
   * In-flight request, aborted when a newer one starts. The palette debounces
   * before it asks, so this is not about request volume — it is about ORDER: two
   * queries in flight can settle out of order, and the slower, older one would
   * then be the answer on screen for the newer query.
   */
  private inFlight: AbortController | null = null;

  async search(query: string): Promise<readonly WrCommandItem[]> {
    // Prerender runs this file too. There is nothing to search from the server —
    // the palette only exists once a user opens it — and a fetch here would make
    // every route's prerender wait on a network round trip.
    if (!this.isBrowser || query.trim().length === 0) return [];

    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;

    try {
      const response = await fetch(`https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': SEARCH_KEY,
          'X-Algolia-Application-Id': APP_ID,
        },
        body: JSON.stringify({ params: `query=${encodeURIComponent(query)}&hitsPerPage=${HITS}` }),
        signal: controller.signal,
      });
      if (!response.ok) return [];

      const body = (await response.json()) as { readonly hits?: readonly AlgoliaHit[] };
      return (body.hits ?? []).map(hit => this.toItem(hit));
    } catch {
      // An abort lands here too, and so does an offline browser. Both mean "no
      // answer for this query", which the palette already renders as its empty
      // row — an error state would be a second thing to explain for a search box
      // whose worst case is that you scroll the sidebar instead.
      return [];
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  /**
   * A record becomes a palette row. The deepest heading is the label, the page
   * above it is the context, and the cluster (`Components`, `Guides`, `Start`,
   * …) is the group — so results arrive sorted into the same buckets the sidebar
   * uses, rather than as one flat list of near-identical headings.
   */
  private toItem(hit: AlgoliaHit): WrCommandItem {
    const h = hit.hierarchy ?? {};
    const page = h['lvl1'] ?? '';
    const section = h['lvl2'] ?? h['lvl3'] ?? '';
    const { path, fragment } = hitPath(hit.url ?? '/');

    // A section row is best placed by naming the page it sits on; a page row has
    // no such parent, so it borrows the crawler's own text snippet instead.
    const context = section ? page : (hit.content?.trim() ?? '');

    return {
      id: hit.objectID,
      label: section || page || 'Untitled',
      description: context.length > 0 ? context : undefined,
      group: h['lvl0'] ?? undefined,
      action: (): void => void this.router.navigate([path], { fragment }),
    };
  }
}

/**
 * The path the router should go to for a hit's absolute `url`.
 *
 * The crawler indexes the PUBLISHED site, so every record carries an
 * `https://ngwr.dev/…` origin. Handing that to the router — or to a link — sends
 * anyone running the docs locally to production, and turns an in-app navigation
 * into a full page load even in production. Only the path and the anchor are
 * ours to use.
 */
export function hitPath(url: string): { readonly path: string; readonly fragment?: string } {
  try {
    const parsed = new URL(url);
    return { path: parsed.pathname, fragment: parsed.hash.slice(1) || undefined };
  } catch {
    return { path: '/' };
  }
}
