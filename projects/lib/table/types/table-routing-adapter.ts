/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `wr-table` asks of a router for its row links. `WrTableRouting` from
 * `ngwr/table/router` implements it over `@angular/router`, which keeps the
 * router out of `ngwr/table`.
 */
export interface WrTableRoutingAdapter {
  /** The href a row link renders for a `rowLink` value. */
  href(link: string | readonly unknown[]): string;

  /**
   * Handle a click on a row link. A modified or non-primary click is left to
   * the browser, so ctrl/cmd-click still opens the row in a new tab.
   */
  navigate(link: string | readonly unknown[], event: MouseEvent): void;
}
