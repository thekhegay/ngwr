/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** The pill the badge loggers share, as a `%c` console style. */
export const badgeStyle = (color: string): string => `
    display: inline-block;
    border: 1px solid ${color};
    color: ${color};
    padding: 1px 3px;
    border-radius: 4px;
    margin-right: 0
  `;
