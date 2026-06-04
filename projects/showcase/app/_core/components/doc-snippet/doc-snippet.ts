import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code';
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
  templateUrl: './doc-snippet.html',
  styleUrl: './doc-snippet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocCodeComponent],
})
export class DocSnippetComponent {
  readonly code = input<string>('');
  readonly language = input<ShikiLang>('html');
  readonly files = input<readonly DocCodeFile[] | null>(null);

  /** Drives the border between demo + code (hidden when nothing to show). */
  protected readonly hasCode = computed(() => {
    const fs = this.files();
    if (fs?.some(f => f.code.trim().length > 0)) return true;
    return this.code().trim().length > 0;
  });
}
