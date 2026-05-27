import { ChangeDetectionStrategy, Component, computed, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { getHighlighter, type ShikiLang } from '#core/shiki';
import { copyToClipboard, stripIndent } from '#core/utils';

import type { DocCodeFile } from './types';

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
  selector: 'ngwr-doc-code',
  templateUrl: './doc-code.html',
  styleUrl: './doc-code.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-empty]': 'tabs().length === 0 ? "" : null',
  },
})
export class DocCodeComponent {
  // ── Single-file API (legacy) ─────────────────────────────────────
  readonly code = input<string>('');
  readonly language = input<ShikiLang>('html');

  // ── Multi-file API (tabs) ────────────────────────────────────────
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

  protected readonly normalized = computed(() => {
    const t = this.activeTab();
    return t ? stripIndent(t.code) : '';
  });

  protected readonly copied = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly highlighted = resource({
    params: () => ({ code: this.normalized(), lang: this.activeTab()?.language ?? this.language() }),
    loader: async ({ params }) => {
      if (!params.code) return null;
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(params.code, {
        lang: params.lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        defaultColor: false,
      });
      return this.sanitizer.bypassSecurityTrustHtml(html);
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
