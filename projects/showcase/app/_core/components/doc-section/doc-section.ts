import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A titled documentation section.
 *
 * Renders an `<h2>` with optional description, then projects content.
 * The description is plain text; for richer formatting, omit the input
 * and place a paragraph as the first projected child.
 */
@Component({
  selector: 'ngwr-doc-section',
  templateUrl: './doc-section.html',
  styleUrl: './doc-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
