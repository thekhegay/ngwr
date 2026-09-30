/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What these types are, and why they keep `Harness` in their names.
 *
 * `ngwr/markdown` already exports a node tree — `WrMarkdownBlock`,
 * `WrMarkdownListItem`, `WrMarkdownCell` — which is what the PARSER produced. The
 * types here are what the DOM says afterwards, and a spec imports both entry
 * points, so a second `WrMarkdownListItem` in scope would be one import line away
 * from an assertion about the wrong half of the pipeline. They are deliberately
 * flat snapshots rather than harnesses: rendered prose is inert, there is nothing
 * to drive, and a `toEqual` over one object says more than six awaited reads.
 */

/**
 * How a table column is aligned, as the delimiter row asked for it.
 *
 * Logical values, never `left` / `right`: the alignment mirrors under `dir="rtl"`
 * on its own, and a harness reporting the physical edge would make an RTL
 * regression look like the intended behaviour. `null` is a column the delimiter
 * row said nothing about.
 */
export type WrMarkdownHarnessAlign = 'start' | 'center' | 'end' | null;

/** One rendered heading. */
export interface WrMarkdownHarnessHeading {
  /**
   * The heading level, 1–6, read from the ELEMENT the renderer chose.
   *
   * Not from an `aria-level` or a class: `<wr-markdown>` renders a real `<h1>` …
   * `<h6>`, which is what carries the level to assistive technology and to every
   * stylesheet, and a `<div role="heading">` regression has to show up here.
   */
  readonly level: number;
  /** The heading's text, whitespace collapsed. */
  readonly text: string;
  /**
   * The slug the document can be linked into, or `null` when `headingIds` is off.
   *
   * `null` is the whole reason this is reported rather than assumed: an anchor
   * that silently stops being generated breaks every deep link into the page and
   * changes nothing on screen.
   */
  readonly id: string | null;
}

/** One rendered link. */
export interface WrMarkdownHarnessLink {
  /** The link's visible text. */
  readonly text: string;
  /** The `href` attribute as written, unresolved — a relative path stays relative. */
  readonly href: string | null;
  /** The link's `title`, or `null` when the source gave none. */
  readonly title: string | null;
  /** Where the link opens, or `null` when `linkTarget` is off. */
  readonly target: string | null;
  /**
   * The `rel`, which is not decoration: a `target="_blank"` without
   * `noopener noreferrer` hands `window.opener` to a page whose URL came out of
   * the document being rendered — untrusted input, by construction. Assert the
   * pair together.
   */
  readonly rel: string | null;
}

/** One rendered image. */
export interface WrMarkdownHarnessImage {
  /** The `src` attribute as written. A refused URL renders no image at all. */
  readonly src: string | null;
  /** The alt text — also what a refused `src` leaves behind as plain text. */
  readonly alt: string | null;
  /** The image's `title`, or `null` when the source gave none. */
  readonly title: string | null;
}

/** One rendered task-list item. */
export interface WrMarkdownHarnessTaskItem {
  /**
   * The item's visible text, with the hidden state label left out — so this is
   * `'ship it'` and not `'Done: ship it'`.
   */
  readonly text: string;
  /** Whether the box is ticked (`- [x]`). */
  readonly checked: boolean;
  /**
   * The state as assistive technology hears it, or `null` when nothing announces
   * it.
   *
   * The tick is a presentational `<span aria-hidden>` — a real
   * `<input type="checkbox">` would be an unlabelled form control, and making it
   * operable would promise an interaction a renderer cannot honour — so this
   * hidden text is the ONLY thing that carries the state to a screen reader. It
   * comes from `taskDoneLabel` / `taskTodoLabel`, so it is localized, and `null`
   * here is a checked box nobody is told about.
   */
  readonly stateLabel: string | null;
}

/** One rendered GFM table, as a snapshot. */
export interface WrMarkdownHarnessTable {
  /** The header cells, in column order. */
  readonly headers: string[];
  /**
   * The body rows, one array of cell text per row.
   *
   * Every row is as wide as the header — the renderer pads a short row and
   * truncates a long one — so this is a rectangle, which is what makes it
   * assertable in one `toEqual`.
   */
  readonly rows: string[][];
  /** One entry per column, in the same order as {@link headers}. */
  readonly align: WrMarkdownHarnessAlign[];
}
