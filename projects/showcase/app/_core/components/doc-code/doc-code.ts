import { Directionality } from '@angular/cdk/bidi';
import {
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { Check, Copy } from 'lucide';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import type { DocCodeFile } from './types';

import { getHighlighter, type ShikiLang } from '#core/shiki';
import { copyToClipboard, stripIndent } from '#core/utils';

/**
 * Instance counter for the tab / panel ids. Deterministic under prerender,
 * which `randomId()` is not — the same reason `wr-tabs` counts rather than
 * randomizes. These ids land in `aria-controls` / `aria-labelledby`, and a
 * page renders many of these blocks, so the pairing has to be per instance.
 */
let docCodeUid = 0;

/**
 * Syntax-highlighted code block with a copy button. Supports one of two
 * shapes:
 *
 *  - `[code]` (+ optional `[language]`) — single file, no tabs.
 *  - `[files]` — array of `DocCodeFile`s, rendered with a tab strip.
 *
 * Empty content (no `code`, no `files`, or all files blank) renders
 * nothing at all — the host collapses out of the layout. Pages can pass
 * `code=""` to a `<ngwr-doc-snippet>` to show the live demo with no
 * source block underneath.
 *
 * Uses Shiki for highlighting; falls back to a plain `<pre>` while the
 * highlighter is loading. Indentation in each source string is
 * normalized via {@link stripIndent}.
 */
@Component({
  imports: [WrIcon],
  selector: 'ngwr-doc-code',
  templateUrl: './doc-code.html',
  styleUrl: './doc-code.scss',
  host: {
    '[attr.data-empty]': 'tabs().length === 0 ? "" : null',
    // Reflected for `scripts/gen-md-docs.ts`, which fences the block by it. A
    // static `language="ts"` already lands in the DOM; a bound one does not,
    // and every snippet binds it — so read the active tab instead of the input.
    '[attr.data-language]': 'activeTab()?.language ?? null',
  },
  providers: [provideWrIcons(lucideIcons({ copy: Copy, check: Check }))],
})
export class DocCodeComponent {
  // Single-file API (legacy)
  readonly code = input<string>('');
  readonly language = input<ShikiLang>('html');

  // Multi-file API (tabs)
  readonly files = input<readonly DocCodeFile[] | null>(null);

  protected readonly tabs = computed<readonly DocCodeFile[]>(() => {
    const fs = this.files();
    if (fs && fs.length > 0) {
      return fs.filter(f => stripIndent(f.code).length > 0);
    }
    const c = this.code();
    if (!c || stripIndent(c).length === 0) return [];
    return [{ label: this.language(), language: this.language(), code: c }];
  });

  protected readonly activeIndex = signal(0);

  protected readonly activeTab = computed(() => this.tabs()[this.activeIndex()] ?? null);

  /** A tab strip only exists once there is more than one file to choose from. */
  protected readonly hasTabs = computed(() => this.tabs().length > 1);

  protected readonly normalized = computed(() => {
    const t = this.activeTab();
    return t ? stripIndent(t.code) : '';
  });

  protected readonly copied = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  /** Per-instance prefix, so the tab / panel pairing is unique document-wide. */
  private readonly uid = ++docCodeUid;

  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');

  /**
   * `Directionality` is root-provided, so this resolves everywhere; the docs'
   * own RTL toggle writes `valueSignal`, which keeps the read reactive.
   */
  private readonly dir = inject(Directionality, { optional: true });

  protected readonly highlighted = resource({
    params: () => ({ code: this.normalized(), lang: this.activeTab()?.language ?? this.language() }),
    loader: async ({ params }) => {
      if (!params.code) return null;
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(params.code, {
        lang: params.lang,
        themes: {
          light: 'github-light-high-contrast',
          dark: 'github-dark-high-contrast',
        },
        defaultColor: false,
      });
      // A code block wider than its column scrolls, and a scrollable region that
      // cannot take focus cannot be scrolled by keyboard at all. Shiki does not
      // add this, and `check:a11y` cannot see it — the rule is style-dependent, so
      // the JSDOM sweep turns it off and only a real browser reports it.
      return this.sanitizer.bypassSecurityTrustHtml(html.replace('<pre ', '<pre tabindex="0" '));
    },
  });

  /**
   * Last successfully highlighted HTML. We render this in the template
   * instead of `highlighted.value()` directly so the previous frame stays
   * on screen during async re-highlights — otherwise live-edited code
   * (playground snippets) flashes through the unstyled `<pre>` fallback
   * on every keystroke / slider tick.
   */
  protected readonly lastHtml = signal<SafeHtml | null>(null);

  constructor() {
    effect(() => {
      const next = this.highlighted.value();
      if (next != null) untracked(() => this.lastHtml.set(next));
    });

    // Reset cached HTML + clamp index when the file list changes.
    effect(() => {
      const len = this.tabs().length;
      untracked(() => {
        if (this.activeIndex() >= len) this.activeIndex.set(0);
      });
    });

    // Clear stale cached HTML when switching tabs so the previous file's
    // HTML doesn't briefly show while the new one re-highlights.
    effect(() => {
      this.activeIndex();
      untracked(() => this.lastHtml.set(null));
    });
  }

  /** Header id for the tab at `i` — `aria-labelledby` on the panel. */
  protected tabId(i: number): string {
    return `ngwr-doc-code-${this.uid}-tab-${i}`;
  }

  /** The one panel id every tab points `aria-controls` at. */
  protected panelId(): string {
    return `ngwr-doc-code-${this.uid}-panel`;
  }

  /**
   * ArrowLeft / ArrowRight / Home / End on the strip, per the WAI-ARIA APG
   * tabs pattern. The strip is a single tab stop (roving `tabindex`), so
   * without this the arrows do nothing and only the first tab is reachable
   * by keyboard at all.
   *
   * Automatic activation — focus moves and the panel follows — which the APG
   * recommends when showing a panel is cheap. It is: the source is already in
   * memory and only the highlight pass is async.
   */
  protected onStripKeydown(event: KeyboardEvent): void {
    const count = this.tabs().length;
    if (count < 2) return;

    const i = this.activeIndex();
    // Neighbours in DOM order, wrapping at the ends.
    const forward = i < count - 1 ? i + 1 : 0;
    const backward = i > 0 ? i - 1 : count - 1;
    // Arrow keys follow VISUAL order: the strip is mirrored under `dir="rtl"`,
    // so ArrowRight moves toward the visual right, which is the PREVIOUS tab
    // there. Home / End name positions in the list, so they read the same in
    // both directions.
    const rtl = this.dir?.valueSignal() === 'rtl';
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = rtl ? backward : forward;
        break;
      case 'ArrowLeft':
        next = rtl ? forward : backward;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(next);
    this.strip()
      ?.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(this.tabId(next))}`)
      ?.focus();
  }

  protected select(i: number): void {
    this.activeIndex.set(i);
  }

  protected async copy(): Promise<void> {
    const ok = await copyToClipboard(this.normalized());
    if (!ok) return;

    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
