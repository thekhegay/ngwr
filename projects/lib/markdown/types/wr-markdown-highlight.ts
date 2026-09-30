/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One coloured run inside a highlighted line of code. */
export interface WrHighlightSpan {
  readonly text: string;
  /** Any CSS colour. Omitted spans inherit the code block's own colour. */
  readonly color?: string;
  readonly fontStyle?: 'italic' | 'bold' | 'underline';
}

/** One line of highlighted code, left to right. */
export type WrHighlightLine = readonly WrHighlightSpan[];

/**
 * Turns a fenced code block into coloured spans.
 *
 * **Spans, not an HTML string** — and that is the whole point of this signature.
 * Every other Angular markdown renderer takes highlighted HTML and hands it to
 * `[innerHTML]`, which needs `bypassSecurityTrustHtml` (Angular's own sanitizer
 * strips the inline `style` attributes highlighting is made of, so the trust
 * cannot be skipped). That puts a `dangerouslySetInnerHTML`-shaped hole in the
 * one component whose entire input is untrusted text. Spans close it: `wr-markdown`
 * renders each one as a real element with a bound `[style.color]`, so nothing in
 * the pipeline is ever parsed as HTML and the library keeps its
 * `unsafe-inline`-free CSP story.
 *
 * Return `null` for a language you do not handle — the block then renders as
 * plain text, which is also what happens before an async highlighter resolves.
 *
 * @example
 * ```ts
 * // Shiki, whose `codeToTokens` already returns this shape.
 * provideWrMarkdownHighlighter(async (code, language) => {
 *   const shiki = await getHighlighter();
 *   if (!language || !shiki.getLoadedLanguages().includes(language)) return null;
 *   const { tokens } = shiki.codeToTokens(code, { lang: language, theme: 'github-dark' });
 *   return tokens.map(line => line.map(t => ({ text: t.content, color: t.color })));
 * });
 * ```
 */
export type WrMarkdownHighlighter = (
  code: string,
  language: string | null
) => readonly WrHighlightLine[] | null | Promise<readonly WrHighlightLine[] | null>;
