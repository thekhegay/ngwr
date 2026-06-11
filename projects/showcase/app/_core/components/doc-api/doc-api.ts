import { Component, input } from '@angular/core';

import { DocRichPipe } from '../doc-rich/doc-rich';

import type { DocApiRow } from './types';

/**
 * Renders a component's public API as a responsive table.
 *
 * Inputs/outputs/properties are passed as a typed array of {@link DocApiRow},
 * not hand-written `<tr>`/`<td>` markup, so pages stay declarative.
 *
 * @example
 * ```html
 * <ngwr-doc-api [rows]="api" />
 * ```
 */
@Component({
  imports: [DocRichPipe],
  selector: 'ngwr-doc-api',
  templateUrl: './doc-api.html',
  styleUrl: './doc-api.scss',
})
export class DocApiComponent {
  readonly rows = input.required<readonly DocApiRow[]>();
}
