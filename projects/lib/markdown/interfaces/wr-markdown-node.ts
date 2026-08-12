/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Column alignment of a GFM table, `null` when the delimiter row said nothing. */
export type WrMarkdownAlign = 'start' | 'center' | 'end' | null;

/** A run of inline content — the leaves of a paragraph, heading or table cell. */
export type WrMarkdownInline =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'code'; readonly value: string }
  | { readonly kind: 'strong'; readonly children: readonly WrMarkdownInline[] }
  | { readonly kind: 'em'; readonly children: readonly WrMarkdownInline[] }
  | { readonly kind: 'del'; readonly children: readonly WrMarkdownInline[] }
  | {
      readonly kind: 'link';
      readonly href: string;
      readonly title: string | null;
      readonly children: readonly WrMarkdownInline[];
    }
  | { readonly kind: 'image'; readonly src: string; readonly alt: string; readonly title: string | null }
  | { readonly kind: 'break' };

/** One `<li>`, including its task-list checkbox state. */
export interface WrMarkdownListItem {
  readonly children: readonly WrMarkdownBlock[];
  /** `true` / `false` for `- [x]` / `- [ ]`, `null` for an ordinary item. */
  readonly checked: boolean | null;
}

/** One table cell. */
export interface WrMarkdownCell {
  readonly inlines: readonly WrMarkdownInline[];
}

/** A block-level node. `kind` discriminates the union. */
export type WrMarkdownBlock =
  | {
      readonly kind: 'heading';
      readonly level: 1 | 2 | 3 | 4 | 5 | 6;
      readonly inlines: readonly WrMarkdownInline[];
      /** Slug derived from the text, for anchoring. Empty when the heading has no text. */
      readonly id: string;
    }
  | { readonly kind: 'paragraph'; readonly inlines: readonly WrMarkdownInline[] }
  | {
      readonly kind: 'code';
      /** First word of the info string, lowercased. `null` for a bare fence. */
      readonly language: string | null;
      readonly code: string;
      /**
       * `false` while the closing fence has not arrived. Mid-stream that is the
       * normal state, and it is what lets a consumer hold back a "copy" affordance
       * until the block is whole.
       */
      readonly closed: boolean;
    }
  | { readonly kind: 'quote'; readonly children: readonly WrMarkdownBlock[] }
  | {
      readonly kind: 'list';
      readonly ordered: boolean;
      /** First number of an ordered list; `1` for bullets. */
      readonly start: number;
      /** A tight list renders its items' paragraphs bare, as CommonMark specifies. */
      readonly tight: boolean;
      readonly items: readonly WrMarkdownListItem[];
    }
  | {
      readonly kind: 'table';
      readonly head: readonly WrMarkdownCell[];
      readonly rows: readonly (readonly WrMarkdownCell[])[];
      readonly align: readonly WrMarkdownAlign[];
    }
  | { readonly kind: 'rule' };

/** Options for {@link parseMarkdown}. */
export interface WrMarkdownParseOptions {
  /**
   * Treat the source as a prefix of a longer document.
   *
   * An unterminated fence still produces a code block (so code appears as it
   * arrives rather than after the closing fence), and a trailing half-typed
   * `**`, `` ` `` or `[label](htt` is withheld instead of being rendered as
   * literal punctuation that vanishes one chunk later.
   */
  readonly streaming?: boolean;
}
