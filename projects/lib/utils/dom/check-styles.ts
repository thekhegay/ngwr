/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ElementRef, PLATFORM_ID, afterNextRender, inject } from '@angular/core';

/** Entry points already checked, per document: a page of forty buttons warns once. */
const checked = new WeakMap<Document, Set<string>>();

/**
 * The property `theme/styles/_loaded.scss` declares for an entry:
 * `charts/bar-chart` reads `--wr-loaded-charts-bar-chart`.
 */
function marker(entry: string): string {
  return `--wr-loaded-${entry.replace(/\//g, '-')}`;
}

/**
 * Whether a stylesheet can reach this document at all.
 *
 * jsdom and happy-dom load no `<link>` and a unit test wires no global Sass,
 * so under either every component would warn once per entry point, in the
 * library's own specs and in a consumer's alike. There is nothing to add there.
 */
function appliesStylesheets(doc: Document): boolean {
  const ua = doc.defaultView?.navigator.userAgent ?? '';
  return !/jsdom|happydom/i.test(ua);
}

/**
 * Warns, once per entry point and document, when a component renders without
 * its stylesheet.
 *
 * Every public entry sheet declares `--wr-loaded-<entry>` on `:root` (the
 * `loaded()` mixin in the theme layer), so a component can tell after its first
 * render whether `@use 'ngwr/<entry>'` ever ran. Without it a component renders
 * unstyled and nothing else says why.
 *
 * A component calls it from its constructor, behind the same guard Angular
 * puts on its own dev checks, so a production build drops the call and the
 * text with it:
 *
 * ```ts
 * constructor() {
 *   if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('select');
 * }
 * ```
 *
 * The read happens in `afterNextRender`, never at construction, and in the
 * browser only: the server has no stylesheet to apply. A nested component stays
 * silent when its parent's sheet was added, because a parent sheet loads the
 * sheets of what it renders, markers included.
 *
 * @internal Shared by the entry points; not a consumer API.
 * @param entry The `exports` key under `ngwr/`, nested ones included: `select`, `charts/bar-chart`.
 */
export function wrCheckStyles(entry: string): void {
  // Guarded here as well as at the call site: the call site is what lets a
  // bundler drop the import, this is what keeps a direct call silent in
  // production and lets a spec observe it.
  if (!(typeof ngDevMode === 'undefined' || ngDevMode)) return;
  // `afterNextRender` is a no-op under `ngServerMode` already; the platform id
  // says the same thing where a spec can set it.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  const doc = inject(DOCUMENT);
  const done = checked.get(doc) ?? new Set<string>();
  checked.set(doc, done);
  if (done.has(entry)) return;

  const host = inject<ElementRef<Element>>(ElementRef).nativeElement;

  afterNextRender(() => {
    // Every instance of the first render registers a hook; the first to run
    // answers for all of them.
    if (done.has(entry)) return;
    done.add(entry);
    if (!appliesStylesheets(doc)) return;

    const style = doc.defaultView!.getComputedStyle(doc.documentElement);
    const loaded = (name: string): boolean => style.getPropertyValue(marker(name)).trim() !== '';
    const tag = `<${host.localName}>`;

    if (!done.has('theme')) {
      done.add('theme');
      if (!loaded('theme')) {
        // eslint-disable-next-line no-console -- a dev-mode diagnostic, reported and never thrown
        console.warn(
          `[NGWR] ${tag} renders without the theme tokens. Add @use 'ngwr/theme'; first in your global stylesheet, ` +
            'or run ng g ngwr:component-style theme.'
        );
      }
    }

    if (!loaded(entry)) {
      // eslint-disable-next-line no-console -- a dev-mode diagnostic, reported and never thrown
      console.warn(
        `[NGWR] ${tag} renders without its styles. Add @use 'ngwr/${entry}'; to your global stylesheet, ` +
          `or run ng g ngwr:component-style ${entry}.`
      );
    }
  });
}
