import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code';

import type { ShikiLang } from '#core/shiki';

/**
 * Live demo paired with its source code.
 *
 * Project the live demo as default content; pass the matching source via
 * the `code` input. Indentation is normalized internally.
 *
 * @example
 * ```html
 * <ngwr-doc-snippet [code]="'<wr-badge>New</wr-badge>'">
 *   <wr-badge>New</wr-badge>
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
  readonly code = input.required<string>();
  readonly language = input<ShikiLang>('html');
}
