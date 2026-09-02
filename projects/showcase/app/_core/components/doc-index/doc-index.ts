import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { SidebarLink } from '../../../_layout/sidebar/sidebar.types';
import { DocPageComponent } from '../doc-page/doc-page';
import { DocSectionComponent } from '../doc-section/doc-section';

import type { DocIndexData, DocIndexSection } from './types';

/**
 * A section's table of contents, as a real page.
 *
 * Every cluster root used to be a `redirectTo` — `/reference` landed on
 * `/reference/components`, which landed on `/reference/components/button`.
 * Two usability tests of the published site hit that within their first three
 * actions: away from the sidebar (a search result, a `.md` twin) the catalog
 * existed nowhere a reader could reach, and the one route whose name promises
 * a list answered with a single component out of eighty-four.
 *
 * It also closes a quieter defect. A redirect prerenders as a meta-refresh
 * stub, `gen-md-docs.ts` skips those, and the SPA fallback then answered
 * `/reference/validators.md` with 301 KB of `text/html` — HTTP 200, for a URL
 * whose whole convention promises markdown. A real page at the route gives the
 * generator something to convert.
 *
 * Content comes from route `data.index` (see {@link DocIndexData}); the groups
 * are the section's OWN sidebar config, narrowed to the links under this
 * route's path, so `/reference` lists every group and `/reference/pipes` lists
 * one.
 */
@Component({
  selector: 'ngwr-doc-index',
  templateUrl: './doc-index.html',
  styleUrl: './doc-index.scss',
  imports: [DocPageComponent, DocSectionComponent, RouterLink],
})
export default class DocIndexComponent {
  private readonly route = inject(ActivatedRoute);

  /**
   * Read from the snapshot rather than from `route.data`: each cluster root is
   * its own `Route`, so moving between two of them destroys this component and
   * builds the next. An observable would buy nothing here and would cost the
   * prerender a settled-navigation dependency it does not need.
   */
  protected readonly page: DocIndexData = (this.route.snapshot.data as { index: DocIndexData }).index;

  protected readonly sections: readonly DocIndexSection[] = this.build();

  private build(): readonly DocIndexSection[] {
    // Loud rather than blank. A route that mounts this component without
    // `data.index` renders an empty page, and an empty catalog is exactly what
    // this component exists to stop shipping — the prerender fails the build on
    // a thrown error, so the mistake cannot reach the site.
    if (!this.page) throw new Error('ngwr-doc-index: the route carries no `data.index`. See DocIndexData.');

    const base = `/${this.route.snapshot.pathFromRoot.flatMap(r => r.url.map(s => s.path)).join('/')}`;
    const under = (url: readonly string[] | undefined): boolean => {
      if (!url) return false;
      const href = url.join('/');
      return href === base || href.startsWith(`${base}/`);
    };

    const sections: DocIndexSection[] = [];
    // A group carrying `url` instead of `children` is a single row the sidebar
    // deliberately left ungrouped (Squircle). One heading over one link reads
    // as a mistake, so they collect into a trailing section instead.
    const loose: SidebarLink[] = [];

    for (const group of this.page.groups) {
      if (group.children) {
        const links = group.children.filter(link => under(link.url));
        if (links.length > 0) sections.push({ title: group.title, links });
      } else if (under(group.url)) {
        loose.push({ title: group.title, url: group.url });
      }
    }

    if (loose.length > 0) sections.push({ title: 'Other', links: loose });

    // A cluster whose single group repeats the page's own name — "Validators"
    // under "Validators" — reads as a stutter, so name that one section for
    // what it holds instead.
    if (sections.length === 1 && sections[0].title === this.page.title) {
      sections[0] = { title: `All ${this.page.title.toLowerCase()}`, links: sections[0].links };
    }

    return sections;
  }
}
