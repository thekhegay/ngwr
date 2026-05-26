/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Semantic + display variants for {@link WrTypography}. */
export type WrTypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'lead'
  | 'body'
  | 'small'
  | 'caption'
  | 'overline'
  | 'code';

/** Horizontal alignment. */
export type WrTypographyAlign = 'start' | 'center' | 'end' | 'justify';

/** Color tone — maps to a `--wr-color-*` token. */
export type WrTypographyTone = 'dark' | 'medium' | 'primary' | 'success' | 'warning' | 'danger';
