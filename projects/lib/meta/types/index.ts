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
 * registered via `provideWr(withMeta(...))`.
 */
export interface WrMetaConfig {
  readonly title?: string;
  /** Template applied to `title` when set — `{{ title }}` (or `%s`) is replaced with the page title. */
  readonly titleTemplate?: string;
  /**
   * A part put in front of the title, joined to it by `titleSeparator`, inside
   * `titleTemplate`. It is a layer's own key, so the title under it stays live:
   * `{ titlePrefix: 'Edit lamp' }` over `{ title: 'Lamps' }` reads
   * `Edit lamp - Lamps`, and popping it gives `Lamps` back. A page whose title
   * this service does not manage gets it in front of the document's own title.
   * Open Graph and Twitter titles never carry it.
   */
  readonly titlePrefix?: string;
  /** What joins `titlePrefix` to the title. @default ' - ' */
  readonly titleSeparator?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly canonical?: string;
  readonly themeColor?: string;
  readonly og?: WrMetaOg;
  readonly twitter?: WrMetaTwitter;
}

/** Returned by {@link WrMeta.push} — call `.pop()` to remove the layer. */
export interface WrMetaHandle {
  readonly pop: () => void;
}
