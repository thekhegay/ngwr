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
  | 'code'
  | 'list'
  | 'link';

/** Horizontal alignment. */
export type WrTypographyAlign = 'start' | 'center' | 'end' | 'justify';

/**
 * Colour tone, which is EMPHASIS rather than a colour: each value names a job
 * and resolves to the token that does it.
 *
 * `base` and `muted` were `dark` and `medium` until v15, named after two
 * intents the palette no longer has. They always painted the neutral roles
 * (`--wr-color-on-surface` and `-on-surface-muted`) rather than those intents,
 * so the rename moves the name onto what the value does.
 *
 * `info` is deliberately not here, and that is why five intents give four
 * tones: it is the same blue as `primary` to every reader, so as emphasis it
 * would be a second name for one appearance.
 */
export type WrTypographyTone = 'base' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
