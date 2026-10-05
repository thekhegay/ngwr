import { Component, InjectionToken, type Signal, inject, input } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocRichPipe } from '../doc-rich/doc-rich';

/**
 * The enclosing section's title, for a `<ngwr-doc-snippet>` that wants to name
 * its example after it the way Material names its own.
 *
 * Optional at the point of injection: a snippet can sit outside a section, and
 * then the page title is the only name there is.
 */
export const DOC_SECTION_TITLE = new InjectionToken<Signal<string>>('DOC_SECTION_TITLE');

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
  providers: [{ provide: DOC_SECTION_TITLE, useFactory: () => inject(DocSectionComponent).title }],
})
export class DocSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
