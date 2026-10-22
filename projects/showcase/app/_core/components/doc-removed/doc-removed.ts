import { Component, input } from '@angular/core';

import { DocRichPipe } from '../doc-rich/doc-rich';
import { DocSectionComponent } from '../doc-section/doc-section';

/**
 * The body of a tombstone page: what the removed thing was, why it went, and
 * what to use instead — three rows, the same on every one.
 *
 * Shared because every page declaring `removed` on its `<ngwr-doc-page>` says
 * exactly these three things, and a reader who lands on one from an old link
 * should find the answer in the same place on all of them. Each value takes the
 * `wrDocRich` forms (`code`, [links](/path), **bold**); write the replacement's
 * link into `instead`, and add its page to `RELATED` for the See also card.
 *
 * @example
 * ```html
 * <ngwr-doc-page title="Markdown" removed="15.0.0" description="…">
 *   <ngwr-doc-removed was="…" why="…" instead="Use [Editor](/reference/components/editor) with `readonly`." />
 * </ngwr-doc-page>
 * ```
 */
@Component({
  selector: 'ngwr-doc-removed',
  imports: [DocRichPipe, DocSectionComponent],
  templateUrl: './doc-removed.html',
  styleUrl: './doc-removed.scss',
})
export class DocRemovedComponent {
  /** What it was, in one line. */
  readonly was = input.required<string>();

  /** Why it went, in one line. */
  readonly why = input.required<string>();

  /** What to use instead, with a link to its page. */
  readonly instead = input.required<string>();
}
