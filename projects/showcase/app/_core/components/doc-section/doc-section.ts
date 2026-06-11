import { Component, input } from '@angular/core';

import { DocRichPipe } from '../doc-rich/doc-rich';

/**
 * A titled documentation section.
 *
 * Renders an `<h2>` with optional description, then projects content.
 * The description is plain text; for richer formatting, omit the input
 * and place a paragraph as the first projected child.
 */
@Component({
  imports: [DocRichPipe],
  selector: 'ngwr-doc-section',
  templateUrl: './doc-section.html',
  styleUrl: './doc-section.scss',
})
export class DocSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
