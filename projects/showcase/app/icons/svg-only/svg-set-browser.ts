/**
 * Shared browser page for SVG-only icon sources (Tabler, Phosphor,
 * Heroicons, Iconoir, Bootstrap).
 *
 * Each route imports a generated `<set>.json` catalog (built by
 * `scripts/build-icon-sets.mjs`) and passes it in alongside a spec
 * describing how to install + wire the source. The shared template
 * renders install + usage snippets above a full IconGrid so visitors
 * can see (and copy from) the entire catalog.
 */

import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { IconGridComponent, type IconEntry } from '../_grid/icon-grid';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

export interface SvgSetSpec {
  readonly title: string;
  readonly description: string;
  readonly homepage: string;
  readonly license: string;
  /** Shell snippet shown under "Install". */
  readonly install: string;
  /** Angular TS snippet shown under "Wire icons". */
  readonly usage: string;
  /** Builds a per-icon import snippet (copied when a tile is clicked). */
  readonly snippetFor: (entry: IconEntry) => string;
}

@Component({
  selector: 'ngwr-svg-set-browser',
  templateUrl: './svg-set-browser.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, IconGridComponent],
})
export class SvgSetBrowser {
  readonly spec = input.required<SvgSetSpec>();
  /** `{ name: rawSvg }` catalog produced by `build-icon-sets.mjs`. */
  readonly data = input.required<Record<string, string>>();

  protected readonly icons = computed<readonly IconEntry[]>(() =>
    Object.entries(this.data())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, svg]) => ({ name, svg }))
  );

  protected readonly snippet = computed(() => this.spec().snippetFor);

  protected readonly labels = computed(() => ['svgIcon()', this.spec().license]);

  protected readonly keywords = computed(() => ['icons', this.spec().title.toLowerCase()]);
}
