/**
 * Reusable icon browser — search field, capped grid of icon tiles, click
 * to copy an import snippet. Used by every set-specific browser page.
 *
 * Performance approach:
 * - Renders at most `VISIBLE_CAP` tiles at a time (typing narrows it down).
 * - Bypasses `<wr-icon>` and the icon registry — just `[innerHTML]`s the
 *   trusted SVG string directly. Avoids registering hundreds / thousands
 *   of icons via `provideWrIcons` per page.
 */

import { Component, ChangeDetectionStrategy, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { WrInput } from 'ngwr/input';
import { WrToast } from 'ngwr/toast';

/** Visible-tile cap. Typing narrows the list below this. */
const VISIBLE_CAP = 240;

export interface IconEntry {
  /** Lowercase kebab name (used in search + the import snippet). */
  readonly name: string;
  /** Raw `<svg>…</svg>` string. */
  readonly svg: string;
}

@Component({
  selector: 'ngwr-icon-grid',
  templateUrl: './icon-grid.html',
  styleUrl: './icon-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, WrInput],
})
export class IconGridComponent {
  /** Every icon in the set, pre-converted to `{ name, svg }`. */
  readonly icons = input.required<readonly IconEntry[]>();

  /** Hook called when a tile is clicked. Receives the entry; should return the
   *  snippet that gets copied to the clipboard. */
  readonly snippetFor = input.required<(entry: IconEntry) => string>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(WrToast);

  protected readonly query = signal('');

  /** Lowercased filter so we don't recompute on every keystroke. */
  private readonly normalizedQuery = computed(() => this.query().trim().toLowerCase());

  protected readonly filtered = computed(() => {
    const q = this.normalizedQuery();
    const all = this.icons();
    if (!q) return all;
    return all.filter(i => i.name.includes(q));
  });

  protected readonly visible = computed(() => this.filtered().slice(0, VISIBLE_CAP));

  protected readonly hiddenCount = computed(() => Math.max(0, this.filtered().length - this.visible().length));

  protected readonly totalCount = computed(() => this.icons().length);

  /**
   * One `SafeHtml` per entry, for the life of the page.
   *
   * `bypassSecurityTrustHtml` returns a NEW wrapper object per call and Angular
   * compares a bound value with `Object.is`, so an un-memoised call inside
   * `[innerHTML]` reads as "changed" on every change-detection pass — and
   * setting `innerHTML` re-parses the whole SVG subtree. Every tile the filter
   * KEPT was being torn down and rebuilt on each keystroke; a set like radix is
   * ~294 KB of markup across the 240 visible tiles.
   *
   * Keyed on the entry object rather than on `name`: this grid is instantiated
   * once per icon set, and two sets can share a name.
   */
  private readonly trusted = new WeakMap<IconEntry, SafeHtml>();

  protected svgFor(entry: IconEntry): SafeHtml {
    let html = this.trusted.get(entry);
    if (html === undefined) {
      html = this.sanitizer.bypassSecurityTrustHtml(entry.svg);
      this.trusted.set(entry, html);
    }
    return html;
  }

  protected async copy(entry: IconEntry): Promise<void> {
    const snippet = this.snippetFor()(entry);
    try {
      await navigator.clipboard.writeText(snippet);
      this.toast.show({ type: 'success', message: `Copied — ${entry.name}`, duration: 1500 });
    } catch {
      this.toast.show({ type: 'danger', message: 'Clipboard blocked — copy manually', duration: 3000 });
    }
  }
}
