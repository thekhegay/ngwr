/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ViewEncapsulation, computed, effect, inject, input, signal } from '@angular/core';

import { useConfigValue } from 'ngwr/config';
import { WrCopyToClipboard } from 'ngwr/directives';
import { useI18nText } from 'ngwr/i18n';

import type {
  WrHighlightLine,
  WrMarkdownBlock,
  WrMarkdownCell,
  WrMarkdownInline,
  WrMarkdownListItem,
} from './interfaces';
import { parseMarkdown } from './parse-markdown';
import { WrMarkdownHighlight } from './wr-markdown-highlight';

/** How long the copy button stays in its "copied" state. */
const COPIED_FEEDBACK_MS = 2000;

/** Code blocks anywhere in the tree — a quote or a list item holds blocks too. */
function collectCode(blocks: readonly WrMarkdownBlock[]): readonly { code: string; language: string | null }[] {
  const found: { code: string; language: string | null }[] = [];

  for (const block of blocks) {
    if (block.kind === 'code') found.push({ code: block.code, language: block.language });
    if (block.kind === 'quote') found.push(...collectCode(block.children));
    if (block.kind === 'list') for (const item of block.items) found.push(...collectCode(item.children));
  }

  return found;
}

/**
 * Renders markdown — as DOM, not as HTML.
 *
 * Built for streamed model output, and useful for any markdown an app does not
 * write itself: comments, release notes, a README. `[streaming]` makes a partial
 * document render like a whole one (see {@link parseMarkdown}); without it the
 * component is an ordinary renderer.
 *
 * **Raw HTML in the source is escaped, never rendered.** That is a deliberate
 * limit rather than an unfinished feature: the input is untrusted by
 * construction, `[innerHTML]` is how every comparable renderer takes it, and one
 * `<img onerror>` is the whole cost of being wrong. Nothing here is parsed as
 * HTML at any point — every text node is a text node and every `href` goes
 * through Angular's URL sanitizer on top of this component's own scheme check.
 *
 * @example
 * ```html
 * <wr-markdown [value]="answer()" [streaming]="pending()" copyable />
 * ```
 *
 * @see https://ngwr.dev/reference/components/markdown
 */
@Component({
  selector: 'wr-markdown',
  templateUrl: './wr-markdown.html',
  imports: [NgTemplateOutlet, WrCopyToClipboard],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-markdown',
    '[class.wr-markdown--streaming]': 'streaming()',
  },
})
export class WrMarkdown {
  private readonly highlight = inject(WrMarkdownHighlight);
  private readonly destroyRef = inject(DestroyRef);

  /** The markdown source. */
  readonly value = input<string>('');

  /**
   * The source is a prefix of a longer document.
   *
   * Turns on partial-safe parsing — an open fence renders as code, a half-typed
   * `**bold` renders as bold rather than as asterisks — and marks the host with
   * `.wr-markdown--streaming`, which paints a caret after the last block.
   *
   * @default false
   */
  readonly streaming = input(false, { transform: coerceBooleanProperty });

  /**
   * Show a copy button on finished code blocks.
   *
   * Falls back to `markdown.copyable` from `provideWrConfig()`, then `false`.
   * Only CLOSED blocks get one: mid-stream the code is not all there, and a
   * button that copies half a snippet is worse than no button.
   */
  readonly copyable = input<boolean | null, BooleanInput>(null, {
    // `null` survives, because it is what "the template said nothing" means to
    // `useConfigValue` — but a bare `copyable` attribute has to reach `true`, and
    // without a transform it arrives as `''` and does not compile under
    // `strictTemplates`. The component's own JSDoc example was the proof.
    transform: value => (value == null ? null : coerceBooleanProperty(value)),
  });

  /**
   * Where links open. `_blank` also sets `rel="noopener noreferrer"`, which is
   * not optional — a target without it hands the opener to a page whose URL came
   * from the document being rendered.
   *
   * Falls back to `markdown.linkTarget` from `provideWrConfig()`, then no target.
   */
  readonly linkTarget = input<'_blank' | '_self' | null>(null);

  /**
   * Put a slugged `id` on every heading, so the document can be linked into.
   *
   * @default true
   */
  readonly headingIds = input(true, { transform: coerceBooleanProperty });

  /**
   * Namespace for the generated heading ids, and for the in-document `#fragment`
   * links that point at them.
   *
   * Defaults to `'user-content-'`, which is what GitHub emits for untrusted
   * markdown, and for the same reason: without a namespace a document that
   * happens to contain `# Search` renders `id="search"` and steals it from the
   * page around it. That is not cosmetic — a `<label for="search">` silently
   * stops labelling its input, and `getElementById` starts answering with a
   * heading. Anchors written INSIDE the document keep working, because a bare
   * `#fragment` href gets the same prefix.
   *
   * Set it to `''` for a document you author yourself and want clean anchors for.
   */
  readonly headingIdPrefix = input<string>('user-content-');

  /** Accessible name of the copy button. Falls back to `markdown.copy`, then `'Copy code'`. */
  readonly copyLabel = input<string | null>(null);

  /** Announced after a successful copy. Falls back to `markdown.copied`, then `'Copied'`. */
  readonly copiedLabel = input<string | null>(null);

  /** Read out for a checked task item. Falls back to `markdown.taskDone`, then `'Done:'`. */
  readonly taskDoneLabel = input<string | null>(null);

  /** Read out for an unchecked task item. Falls back to `markdown.taskTodo`, then `'To do:'`. */
  readonly taskTodoLabel = input<string | null>(null);

  protected readonly resolvedCopyable = useConfigValue(this.copyable, config => config.markdown?.copyable, false);
  protected readonly resolvedLinkTarget = useConfigValue<'_blank' | '_self' | null>(
    this.linkTarget,
    config => config.markdown?.linkTarget,
    null
  );
  protected readonly resolvedCopyLabel = useI18nText(this.copyLabel, 'markdown.copy', 'Copy code');
  protected readonly resolvedCopiedLabel = useI18nText(this.copiedLabel, 'markdown.copied', 'Copied');
  protected readonly resolvedTaskDoneLabel = useI18nText(this.taskDoneLabel, 'markdown.taskDone', 'Done:');
  protected readonly resolvedTaskTodoLabel = useI18nText(this.taskTodoLabel, 'markdown.taskTodo', 'To do:');

  /**
   * The parsed document, re-derived whenever the source changes.
   *
   * The WHOLE buffer, on every chunk — so a streamed answer costs O(n²) over the
   * stream. That is a deliberate trade rather than an oversight: freezing the
   * blocks before the last blank line would halve it, but a blank line is not a
   * safe boundary in markdown (a list continues across one), and a wrong boundary
   * corrupts the document rather than slowing it down. The constant is small —
   * 300 KB of prose parses in ~120 ms — and `@for`'s `track $index` keeps the
   * DOM cost proportional to what actually changed.
   */
  protected readonly blocks = computed(() => parseMarkdown(this.value(), { streaming: this.streaming() }));

  /** `rel` is bound, not hard-coded, so a same-tab link does not carry a pointless one. */
  protected readonly linkRel = computed(() => (this.resolvedLinkTarget() === '_blank' ? 'noopener noreferrer' : null));

  /**
   * Which code block last got copied, held by IDENTITY.
   *
   * Keyed on the code string, two blocks containing the same snippet both lit up
   * — and a document that shows the same one-liner twice is ordinary. Block nodes
   * are recreated whenever the source changes, so the confirmation also clears
   * itself on the next chunk, which is the right lifetime for it.
   */
  private readonly copiedBlock = signal<WrMarkdownBlock | null>(null);

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Requested here rather than from the template: asking the highlighter means
    // writing a signal when the answer lands, and Angular refuses a signal write
    // during rendering (NG0600). An effect runs after it.
    effect(() => {
      // `generation` is what makes `WrMarkdownHighlight.invalidate()` reach the
      // blocks already on screen. It is deliberately NOT the signal that storing
      // an answer bumps — depending on that one from here is the loop.
      this.highlight.generation();
      for (const block of this.codeBlocks()) this.highlight.request(block.code, block.language);
    });

    this.destroyRef.onDestroy(() => {
      if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
    });
  }

  /**
   * A newline as data rather than as template text.
   *
   * The lines of a highlighted block are separate elements, and what separates
   * them on screen — and in a copy — is a real `\n` inside the `<pre>`. Angular
   * strips whitespace-only text nodes from templates, so the character cannot be
   * typed there; an interpolation of it survives.
   */
  protected readonly newline = String.fromCharCode(10);

  /** Every code block in the document, nested ones included. */
  private readonly codeBlocks = computed(() => collectCode(this.blocks()));

  /** Spans for a code block, or `null` to render it as plain text. */
  protected linesOf(code: string, language: string | null): readonly WrHighlightLine[] | null {
    return this.highlight.linesFor(code, language);
  }

  protected isCopied(block: WrMarkdownBlock): boolean {
    return this.copiedBlock() === block;
  }

  protected onCopied(block: WrMarkdownBlock): void {
    this.copiedBlock.set(block);
    if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => {
      this.copiedBlock.set(null);
      this.copiedTimer = null;
    }, COPIED_FEEDBACK_MS);
  }

  /** A heading's id, namespaced, or `null` when there is nothing to link to. */
  protected idOf(id: string): string | null {
    if (!this.headingIds() || !id) return null;

    return `${this.headingIdPrefix()}${id}`;
  }

  /**
   * A link's destination, with a bare fragment pointed at the namespaced id.
   *
   * Otherwise prefixing the headings would quietly break every `[see](#section)`
   * the document writes about itself.
   */
  protected hrefOf(href: string): string {
    const prefix = this.headingIdPrefix();
    if (!prefix || !this.headingIds() || !href.startsWith('#') || href.length < 2) return href;

    return `#${prefix}${href.slice(1)}`;
  }

  /**
   * Casts for the recursive templates, and the reason they exist.
   *
   * Block content nests — a quote holds blocks, a list item holds blocks — so the
   * template recurses through `ngTemplateOutlet` into itself. That is the one
   * recursion shape which adds NO elements to the DOM; a recursive component
   * would put a host element between `<ul>` and its `<li>`, which is invalid
   * markup and breaks the list's accessibility tree. The cost is that
   * `ngTemplateOutlet` context arrives as `any`, and `@switch` cannot narrow
   * `any`. Casting it back at the top of each template restores full
   * `strictTemplates` checking inside the loop, where the work happens.
   */
  protected asBlocks(value: unknown): readonly WrMarkdownBlock[] {
    return value as readonly WrMarkdownBlock[];
  }

  protected asInlines(value: unknown): readonly WrMarkdownInline[] {
    return value as readonly WrMarkdownInline[];
  }

  protected asItems(value: unknown): readonly WrMarkdownListItem[] {
    return value as readonly WrMarkdownListItem[];
  }

  protected asCells(value: unknown): readonly WrMarkdownCell[] {
    return value as readonly WrMarkdownCell[];
  }
}
