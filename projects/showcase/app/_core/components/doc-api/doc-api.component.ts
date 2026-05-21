import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

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
  selector: 'ngwr-doc-api',
  templateUrl: './doc-api.component.html',
  styleUrl: './doc-api.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-doc-api' },
})
export class DocApiComponent {
  readonly rows = input.required<readonly DocApiRow[]>();
}
