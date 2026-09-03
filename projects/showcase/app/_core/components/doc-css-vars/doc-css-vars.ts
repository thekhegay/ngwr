import { Component, input } from '@angular/core';

import type { DocCssVarRow } from './types';

/**
 * Renders a component's `--wr-*` hooks as a table, from the generated catalogue.
 *
 * Never given rows by hand: `pnpm gen:css-vars` reads the library's stylesheets
 * and `<ngwr-doc-page>` looks the page's route up in the result, so a hook
 * renamed in `projects/lib` moves here on the next build and a page that forgets
 * to ask for the section does not exist.
 *
 * @example
 * ```html
 * <ngwr-doc-css-vars [rows]="vars" />
 * ```
 */
@Component({
  selector: 'ngwr-doc-css-vars',
  templateUrl: './doc-css-vars.html',
  styleUrl: './doc-css-vars.scss',
})
export class DocCssVarsComponent {
  readonly rows = input.required<readonly DocCssVarRow[]>();
}
