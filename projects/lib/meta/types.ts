/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Open Graph (`og:*`) tag values. */
export interface WrMetaOg {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly url?: string;
  readonly type?: string;
  readonly siteName?: string;
}

/** Twitter card (`twitter:*`) tag values. */
export interface WrMetaTwitter {
  readonly card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly creator?: string;
}

/**
 * Declarative description of `<head>` metadata. Every field is optional —
 * unset values inherit from the layer below or fall back to defaults
 * registered via {@link provideWrMeta}.
 */
export interface WrMetaConfig {
  readonly title?: string;
  /** Template applied to `title` when set — `%s` is replaced with the title. */
  readonly titleTemplate?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly canonical?: string;
  readonly themeColor?: string;
  readonly og?: WrMetaOg;
  readonly twitter?: WrMetaTwitter;
}

/** Returned by {@link WrMetaService.push} — call `.pop()` to remove the layer. */
export interface WrMetaHandle {
  readonly pop: () => void;
}
