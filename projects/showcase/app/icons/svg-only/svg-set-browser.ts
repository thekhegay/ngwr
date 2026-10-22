/**
 * Shared browser page for SVG-only icon sources (Feather, Tabler, Phosphor,
 * Heroicons, Iconoir, Radix, Bootstrap).
 *
 * Each route imports a generated `<set>.json` catalog (built by
 * `scripts/build/icon-sets.mjs`) and passes it in alongside a spec
 * describing how to install + wire the source. The shared template
 * renders install + usage snippets above a full IconGrid so visitors
 * can see (and copy from) the entire catalog.
 */

import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { IconGridComponent, type IconEntry } from '../_grid/icon-grid';

import { DocCodeComponent, DocInstallComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import { formatCount } from '#core/utils';

export interface SvgSetSpec {
  readonly title: string;
  /**
   * The lede, given the set's size already formatted. The size is DERIVED from
   * the catalog rather than written down, so it cannot drift from the grid.
   */
  readonly description: (count: string) => string;
  readonly homepage: string;
  readonly license: string;
  /** npm packages to install, shown as package-manager tabs. */
  readonly packages?: string;
  /** A shell snippet instead, for a set that has no npm package. */
  readonly install?: string;
  /** Angular TS snippet shown under "Wire icons". */
  readonly usage: string;
  /** Builds a per-icon import snippet (copied when a tile is clicked). */
  readonly snippetFor: (entry: IconEntry) => string;
}

@Component({
  selector: 'ngwr-svg-set-browser',
  templateUrl: './svg-set-browser.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocCodeComponent, DocInstallComponent, DocPageComponent, DocSectionComponent, IconGridComponent],
})
export class SvgSetBrowser {
  readonly spec = input.required<SvgSetSpec>();
  /** `{ name: rawSvg }` catalog produced by `scripts/build/icon-sets.mjs`. */
  readonly data = input.required<Record<string, string>>();

  protected readonly icons = computed<readonly IconEntry[]>(() =>
    Object.entries(this.data())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, svg]) => ({ name, svg }))
  );

  /** How many icons the set ships — the same number the grid's counter prints. */
  protected readonly count = computed(() => formatCount(Object.keys(this.data()).length));

  protected readonly snippet = computed(() => this.spec().snippetFor);

  protected readonly labels = computed(() => ['svgIcon()', this.spec().license]);

  protected readonly keywords = computed(() => ['icons', this.spec().title.toLowerCase()]);
}
