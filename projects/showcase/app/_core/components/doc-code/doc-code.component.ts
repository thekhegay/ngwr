import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

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
  templateUrl: './doc-code.component.html',
  styleUrl: './doc-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-doc-code' },
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

  protected async copy(): Promise<void> {
    const ok = await copyToClipboard(this.normalized());
    if (!ok) return;

    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
