import { ChangeDetectionStrategy, Component, computed, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { getHighlighter, type ShikiLang } from '#core/shiki';
import { copyToClipboard, stripIndent } from '#core/utils';

/**
 * Syntax-highlighted code block with a copy button.
 *
 * Uses Shiki for highlighting; falls back to a plain `<pre>` while the
 * highlighter is loading. Indentation in the source string is normalized
 * via {@link stripIndent}, so authors can write multi-line code naturally.
 */
@Component({
  selector: 'ngwr-doc-code',
  templateUrl: './doc-code.html',
  styleUrl: './doc-code.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocCodeComponent {
  readonly code = input.required<string>();
  readonly language = input<ShikiLang>('html');

  protected readonly normalized = computed(() => stripIndent(this.code()));
  protected readonly copied = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly highlighted = resource({
    params: () => ({ code: this.normalized(), lang: this.language() }),
    loader: async ({ params }) => {
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(params.code, {
        lang: params.lang,
        themes: {
          light: 'github-light',
          dark: 'github-light',
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
  }

  protected async copy(): Promise<void> {
    const ok = await copyToClipboard(this.normalized());
    if (!ok) return;

    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
