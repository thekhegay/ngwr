/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injectable, inject, signal } from '@angular/core';

import type { WrHighlightLine } from './interfaces';
import { WR_MARKDOWN_HIGHLIGHTER } from './tokens';

/**
 * How many highlighted code blocks to remember, per language.
 *
 * A requirement of streaming rather than an optimisation: a code block that grows
 * by a token per chunk asks to be highlighted with a DIFFERENT string every time,
 * so an unbounded store would hold every intermediate state of every block for the
 * life of the app — and this service is `providedIn: 'root'`.
 *
 * Comfortably larger than any one document, deliberately. A window too small to
 * hold what is on screen means every pass evicts entries that same pass still
 * needs and asks for them again — a grammar engine running for ever on a page that
 * has stopped changing.
 */
const CACHE_LIMIT = 256;

/**
 * How many languages to remember at all.
 *
 * {@link CACHE_LIMIT} bounds the store in the dimension a STREAM controls and
 * left it unbounded in the dimension the DOCUMENT controls: `language` is the
 * first word of the code fence's info string, arbitrary text from an input
 * `<wr-markdown>` treats as untrusted — so a document of ```` ```a1 ```` …
 * ```` ```aN ```` fences created N buckets that only `invalidate()` ever
 * removed. Same `providedIn: 'root'` lifetime as the rest of this store.
 *
 * Comfortably larger than any one document for the same reason `CACHE_LIMIT` is:
 * a window too small to hold what is on screen evicts what the same pass still
 * renders. A document with more than a few dozen distinct languages is exotic.
 *
 * Evicting here cannot re-dirty the effect that requests, which is the loop this
 * class is built around avoiding: that effect depends on `generation`, and
 * nothing on this path writes it.
 *
 * Exported for the spec, not through `public-api.ts` — the number is the whole
 * assertion, and a copy of it in the test would stop tracking this one.
 */
const LANGUAGE_LIMIT = 64;

/** One block's answer. `lines` stays `null` until an async highlighter resolves. */
interface Entry {
  lines: readonly WrHighlightLine[] | null;
}

/**
 * Turns fenced code into coloured spans, once per distinct block.
 *
 * **Two rules hold this together, and both were learned by breaking them.**
 *
 * `request` never READS a signal that it writes. An earlier version kept the
 * answers in a signal and rebuilt it on every store, so the component's `effect` —
 * which calls `request` — depended on the signal `request` wrote, and a document
 * with more code blocks than the cache could hold looped for ever: evict,
 * re-request, write, re-dirty. It did not merely spin, it starved the timers that
 * were supposed to fail the test. The plain `Map` is the source of truth now, and a
 * single `revision` counter is the only reactive part; nothing that writes reads it
 * back.
 *
 * And `linesFor` is a pure read, safe to call while Angular renders. Asking a
 * highlighter for a block means writing when the answer lands, and Angular refuses
 * a signal write during rendering (NG0600) — so the component requests from an
 * `effect`, which runs after the render, and the template only reads.
 *
 * Blocks appear as plain text first and gain colour when the answer arrives. For an
 * async highlighter that is right rather than a compromise: a grammar engine loads
 * WASM, and blocking on it would leave the reader with an empty box instead of
 * their code.
 */
@Injectable({ providedIn: 'root' })
export class WrMarkdownHighlight {
  private readonly highlighter = inject(WR_MARKDOWN_HIGHLIGHTER);

  /** Language to code to answer. Insertion order is least-recently-rendered first. */
  private readonly cache = new Map<string, Map<string, Entry>>();

  /** Bumped whenever an answer lands. Read by the template, never by a writer. */
  private readonly revision = signal(0);

  private readonly generationSignal = signal(0);

  /**
   * Bumped ONLY by {@link invalidate}. Read it in the effect that requests, so a
   * consumer can force a re-ask.
   *
   * Separate from `revision` on purpose, and the separation is the whole safety
   * argument. An effect that requests and also depends on the signal that storing
   * an answer writes is the shape that looped for ever here once: past the cache
   * limit, requesting stops being idempotent, so each pass writes, re-dirties the
   * effect, evicts and requests again. Nothing inside `request` touches this one.
   */
  readonly generation = this.generationSignal.asReadonly();

  /** Spans for one block, or `null` for plain text. Safe to call from a template. */
  linesFor(code: string, language: string | null): readonly WrHighlightLine[] | null {
    if (!language) return null;

    // Establishes the dependency, so a late answer re-renders the block waiting.
    this.revision();

    const perLanguage = this.cache.get(language);
    const entry = perLanguage?.get(code);
    if (!entry || !perLanguage) return null;

    // Touched on read, so eviction drops what nobody is rendering rather than what
    // arrived first. Insertion order had it exactly backwards: mid-stream it
    // discarded the finished block the reader was looking at and kept the
    // half-typed intermediates, and the finished block flashed back to plain text.
    perLanguage.delete(code);
    perLanguage.set(code, entry);

    return entry.lines;
  }

  /**
   * Forget every answer and ask again on the next render.
   *
   * The cache is keyed on `(language, code)` and nothing else, which is right for
   * the streaming case it exists for and wrong for one real situation: a
   * highlighter that returns per-theme colours serves whichever palette was
   * current when a block was first rendered, for ever. There is no theme
   * dimension to key on — the library cannot know what a highlighter's answer
   * depends on — so the honest fix is to let the consumer say when it changed.
   *
   * A highlighter that returns theme-agnostic colours (CSS `light-dark()`, a
   * custom property) needs none of this.
   *
   * @example
   * ```ts
   * const highlight = inject(WrMarkdownHighlight);
   * effect(() => {
   *   theme.current();
   *   highlight.invalidate();
   * });
   * ```
   */
  invalidate(): void {
    this.cache.clear();
    this.generationSignal.update(generation => generation + 1);
    this.revision.update(revision => revision + 1);
  }

  /**
   * Ask for a block to be highlighted. Idempotent, and safe to call for every
   * block on every change — call it from an `effect`, never from a template.
   */
  request(code: string, language: string | null): void {
    // A bare fence has no grammar to pick, so there is nothing to ask for.
    if (!this.highlighter || !language || !code) return;

    const existing = this.cache.get(language);
    // Deleted before it is re-set, because `Map.set` on a key it already holds
    // keeps the ORIGINAL position: a plain `set` would leave the outer map in
    // first-sighting order, and `evictLanguage` would then drop a language still
    // being asked for in favour of one seen earlier and no longer rendered.
    if (existing) this.cache.delete(language);
    const perLanguage = existing ?? new Map<string, Entry>();
    this.cache.set(language, perLanguage);
    this.evictLanguage();
    // Presence IS the record of having asked — a separate `asked` set was a second
    // structure to keep in step with this one, and eviction only pruned one of them.
    if (perLanguage.has(code)) return;

    const entry: Entry = { lines: null };
    perLanguage.set(code, entry);
    this.evict(perLanguage);

    let result: ReturnType<typeof this.highlighter>;
    try {
      result = this.highlighter(code, language);
    } catch {
      // A highlighter that throws on an unknown grammar costs the reader colour,
      // not their code.
      return;
    }

    if (result instanceof Promise) {
      result.then(lines => this.fill(entry, lines)).catch(() => undefined);
    } else {
      this.fill(entry, result);
    }
  }

  /**
   * Fill in an answer and let the view know.
   *
   * Writes through the entry OBJECT rather than looking its key up again. The entry
   * may have been evicted while the promise was in flight, in which case this
   * writes to something nothing holds — which is the intended outcome. The version
   * that re-inserted by key put entries back behind eviction's back, and the cache
   * grew without a ceiling for exactly the async highlighter its limit exists for.
   */
  private fill(entry: Entry, lines: readonly WrHighlightLine[] | null): void {
    if (!lines) return;

    entry.lines = lines;
    this.revision.update(revision => revision + 1);
  }

  /** `Map` iterates in insertion order, and `linesFor` re-inserts on read. */
  private evict(perLanguage: Map<string, Entry>): void {
    while (perLanguage.size > CACHE_LIMIT) {
      const oldest = perLanguage.keys().next();
      if (oldest.done) return;
      perLanguage.delete(oldest.value);
    }
  }

  /**
   * The same bound, one dimension out. `request` re-inserts a bucket it already
   * holds, so the outer map iterates least-recently-REQUESTED first — and the
   * component's effect asks for every code block in the document it is showing,
   * so a language that stops being requested is one nothing renders any more.
   *
   * Read is deliberately NOT a touch here, unlike {@link linesFor} for the inner
   * map: with the effect re-asking for every block, request order already tracks
   * what is rendered, and nothing has needed the finer signal.
   */
  private evictLanguage(): void {
    while (this.cache.size > LANGUAGE_LIMIT) {
      const oldest = this.cache.keys().next();
      if (oldest.done) return;
      this.cache.delete(oldest.value);
    }
  }
}

export { LANGUAGE_LIMIT };
