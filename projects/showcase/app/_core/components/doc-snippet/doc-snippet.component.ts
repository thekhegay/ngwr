import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code.component';

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
  templateUrl: './doc-snippet.component.html',
  styleUrl: './doc-snippet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-doc-snippet' },
  imports: [DocCodeComponent],
})
export class DocSnippetComponent {
  readonly code = input.required<string>();
  readonly language = input<ShikiLang>('html');
}
