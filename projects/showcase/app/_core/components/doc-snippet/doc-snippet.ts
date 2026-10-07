import { Component, computed, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code';
import { useExampleFiles } from '../doc-code/example-files';
import type { DocCodeFile } from '../doc-code/types';

import type { ShikiLang } from '#core/shiki';

/**
 * Live demo paired with its source code.
 *
 * Project the live demo as default content; pass the matching source via
 * the `code` input (single file) or `files` (multi-tab). Empty source
 * collapses the code block, leaving just the demo. Indentation is
 * normalized internally.
 *
 * The demo used to carry two buttons of its own — "Open in StackBlitz" and a
 * phone-frame toggle. Both are gone: the playground is one link in the header
 * now rather than a control on every demo on the site.
 *
 * @example
 * ```html
 * <ngwr-doc-snippet [code]="'<wr-badge>New</wr-badge>'">
 *   <wr-badge>New</wr-badge>
 * </ngwr-doc-snippet>
 *
 * <ngwr-doc-snippet [files]="[{ label: 'TS', language: 'angular-ts', code: tsCode }, …]">
 *   <wr-foo />
 * </ngwr-doc-snippet>
 * ```
 */
@Component({
  selector: 'ngwr-doc-snippet',
  host: { class: 'wr-not-prose' },
  templateUrl: './doc-snippet.html',
  styleUrl: './doc-snippet.scss',
  imports: [DocCodeComponent],
})
export class DocSnippetComponent {
  readonly code = input<string>('');
  readonly language = input<ShikiLang>('html');
  readonly files = input<readonly DocCodeFile[] | null>(null);

  protected readonly resolvedFiles = useExampleFiles({ code: this.code, language: this.language, files: this.files });

  /** Drives the border between demo + code (hidden when nothing to show). */
  protected readonly hasCode = computed(() => {
    const fs = this.resolvedFiles();
    if (fs?.some(f => f.code.trim().length > 0)) return true;
    return this.code().trim().length > 0;
  });
}
