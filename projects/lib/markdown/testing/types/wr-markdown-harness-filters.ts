/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-markdown>` a harness query matches. */
export interface WrMarkdownHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the document's rendered text — whitespace collapsed, the hidden
   * task-state labels left out, the way `getText()` reads it.
   *
   * A string is an exact match against the WHOLE document, which is almost never
   * what a spec means for anything longer than a line; a RegExp is tested, which
   * is.
   */
  readonly text?: string | RegExp;
  /**
   * Match a document that renders a heading with this text, at any level.
   *
   * The heading rather than the first line: a document's title is the one piece
   * of it a spec can name without restating its contents.
   */
  readonly headingText?: string | RegExp;
  /**
   * Match a document that renders a fenced block in this language.
   *
   * The language is the info string's first word, lowercased — what the renderer
   * puts in `data-language`. A BARE fence claims none, so no filter value finds
   * one: `<wr-markdown>` cannot report a language nobody wrote.
   */
  readonly codeLanguage?: string | RegExp;
  /**
   * Match only streaming (`true`) or only settled (`false`) documents.
   *
   * Read from the host modifier the caret is painted with, so this is the
   * document's rendered state and not the input that asked for it.
   */
  readonly streaming?: boolean;
}

/** Narrows which fenced code block of a document a harness query matches. */
export interface WrMarkdownCodeBlockHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the block's language — a string is an exact match, a RegExp is tested.
   *
   * A bare fence has no language and matches neither form.
   */
  readonly language?: string | RegExp;
  /**
   * Match the block's code.
   *
   * A string is an exact match against the whole snippet, newlines and
   * indentation included — that is the point of the block, and it is also why a
   * RegExp is usually the form worth writing here.
   */
  readonly code?: string | RegExp;
}
