import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { DocSeeAlsoLink } from './types';

/**
 * "See also" block — renders a grid of related-page cards at the bottom
 * of a doc page. Use to cross-link the surfaces consumers reach for
 * together (e.g. a directive and the service it builds on).
 *
 * @example
 * ```html
 * <ngwr-doc-see-also
 *   [links]="[
 *     { kind: 'Service', title: 'WrClipboard', url: ['/reference/services', 'clipboard'],
 *       description: 'Programmatic read + write API.' }
 *   ]"
 * />
 * ```
 */
@Component({
  selector: 'ngwr-doc-see-also',
  templateUrl: './doc-see-also.html',
  styleUrl: './doc-see-also.scss',
  imports: [RouterLink],
})
export class DocSeeAlsoComponent {
  /** Optional section title. @default 'See also' */
  readonly title = input<string>('See also');

  /** Links to render. Order preserved. */
  readonly links = input.required<readonly DocSeeAlsoLink[]>();
}
