import { Component, input } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocRichPipe } from '../doc-rich/doc-rich';

/**
 * A titled documentation section.
 *
 * Renders an `<h2>` with optional description, then projects content.
 * The description is plain text; for richer formatting, omit the input
 * and place a paragraph as the first projected child.
 */
@Component({
  imports: [DocRichPipe, WrTypography],
  selector: 'ngwr-doc-section',
  templateUrl: './doc-section.html',
  styleUrl: './doc-section.scss',
  // `title` is an input, and a static attribute that feeds an input is still written
  // onto the host, where the browser shows it as a native tooltip over the whole
  // page or section.
  host: { '[attr.title]': 'null' },
})
export class DocSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
