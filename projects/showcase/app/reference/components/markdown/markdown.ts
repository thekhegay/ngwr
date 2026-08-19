import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';

import { Check, Copy } from 'lucide';
import { WrButton } from 'ngwr/button';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrMarkdown } from 'ngwr/markdown';
import { WrPlatform } from 'ngwr/platform';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocCodeFile,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

/** Ordinary document — one of everything the subset covers. */
const BASIC_DOC = `## Release notes

**v11** ships \`<wr-markdown>\`. Markdown in, *DOM* out — with ~~innerHTML~~ nowhere
in the pipeline.

- headings, paragraphs, fenced code, quotes, rules
- bullet / ordered / task lists, GFM tables
- inline code, strong, emphasis, strikethrough, links, images

> A renderer whose input is model output has no business parsing HTML.

Autolinks work bare, too: https://ngwr.dev
`;

/**
 * The hostile document. Every line of it renders as text, which is the point of
 * putting it on the page rather than describing it.
 */
const SECURITY_DOC = `Inline HTML is text: <img src=x onerror="alert('xss')">.

<div style="color: red">So is a block-level tag.</div>

<script>alert('xss')</script>

A [javascript: link](javascript:alert('xss')) keeps its label and loses its href.
An [ordinary link](https://ngwr.dev) is still a link.
`;

/** The four documented omissions, each shown behaving as documented. */
const SUBSET_DOC = `Four spaces is not a code block:

    this is still a paragraph

A line of dashes under text is a rule, not a heading
---

A [reference link][1] needs a second pass over the whole document, so it stays text.

[1]: https://ngwr.dev

And \`snake_case_name\` in prose survives: snake_case_name.
`;

const CODE_DOC = `Install it:

\`\`\`bash
pnpm add ngwr
\`\`\`

Render a document:

\`\`\`ts
import { WrMarkdown } from 'ngwr/markdown';

@Component({ imports: [WrMarkdown], template: '<wr-markdown [value]="doc()" />' })
export class Answer {
  readonly doc = signal('# hello');
}
\`\`\`

A fence with no info string has no grammar to pick, so it stays plain:

\`\`\`
no language, no colour
\`\`\`
`;

const TASKS_DOC = `- [x] escape raw HTML
- [x] render partial documents
- [ ] parse HTML
- an ordinary item, in the same list
  - [ ] a task nested one level down
`;

const TABLE_DOC = `| Entry point | Streams | Notes |
| :--- | :---: | ---: |
| \`ngwr/markdown\` | yes | \`[streaming]\` |
| \`ngwr/typography\` | no | prose styling |
| \`ngwr/code\` | — | does not exist |
`;

/**
 * The third link is a bare fragment on purpose, and the prose about it has to
 * match the anchor the renderer emits: `linkTarget` is applied to EVERY link,
 * fragments included, and `headingIdPrefix` re-points the href at the
 * namespaced id. The demo used to claim relative links were "left alone" while
 * rendering `href="#user-content-tables" target="_blank"` directly underneath —
 * and with no heading in the document, that anchor also went nowhere. The
 * `## Tables` heading below is what gives it something to land on.
 */
const LINKS_DOC = `A [labelled link](https://ngwr.dev "the docs site") and a bare autolink,
<https://github.com/thekhegay/ngwr>, take the same target.

So does an in-document link — [the tables section](#tables) — whose href is
re-pointed at the namespaced heading id, so \`headingIdPrefix\` cannot break the
anchors a document writes about itself.

## Tables

The heading that link resolves to: \`id="user-content-tables"\`.
`;

/** Typed out in chunks by the streaming demo. */
const STREAM_DOC = `## Streaming answer

Partial markdown renders as **finished** markdown: the parser closes what is
still in flight, so nothing flashes on screen as punctuation and then changes
its mind.

- an unterminated fence renders as code
- a half-typed \`**bold\` renders bold
- a trailing \`[label](htt\` is withheld until it resolves

\`\`\`ts
const answer = signal('');
for await (const chunk of stream) answer.update(text => text + chunk);
\`\`\`

The caret is CSS on \`.wr-markdown--streaming\`, so it lands after the last block
without a node in the document.
`;

/**
 * Chunk sizes, cycled. Uneven on purpose: chunks that always landed on a token
 * boundary would never show the partial-parse behaviour the demo exists for.
 */
const CHUNK_SIZES = [3, 7, 2, 11, 5, 4];

/** Delay between chunks — fast enough to read as typing, slow enough to watch. */
const CHUNK_MS = 55;

@Component({
  selector: 'ngwr-markdown-page',
  templateUrl: './markdown.html',
  imports: [
    WrButton,
    WrMarkdown,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
  // `<wr-markdown>` asks for `copy` / `check` by name and the library registers
  // nothing itself. The root set has `copy` but calls the tick `checkmark`, so
  // without this the copied state would render a blank button.
  providers: [provideWrIcons(lucideIcons({ copy: Copy, check: Check }))],
})
export default class MarkdownPageComponent {
  private readonly platform = inject(WrPlatform);

  protected readonly docs = {
    basic: BASIC_DOC,
    security: SECURITY_DOC,
    subset: SUBSET_DOC,
    code: CODE_DOC,
    tasks: TASKS_DOC,
    table: TABLE_DOC,
    links: LINKS_DOC,
  };

  // ---------------------------------------------------------------------------
  // Streaming demo
  // ---------------------------------------------------------------------------

  /** What has "arrived" so far. */
  protected readonly streamed = signal('');

  /** Drives `[streaming]` — partial-safe parsing plus the caret. */
  protected readonly streaming = signal(false);

  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  private streamAt = 0;
  private chunk = 0;

  constructor() {
    // Browser-only by construction, which is what the prerender pass needs: a
    // timer started in the constructor would run in Node too.
    afterNextRender(() => this.startStream());
    inject(DestroyRef).onDestroy(() => this.stopStream());
  }

  protected replay(): void {
    this.startStream();
  }

  private startStream(): void {
    this.stopStream();

    // Text appearing letter by letter behind a blinking caret is precisely the
    // motion this preference asks to be spared, so the document arrives whole
    // and `[streaming]` stays off — the caret is what it would paint.
    if (this.platform.prefersReducedMotion()) {
      this.streamed.set(STREAM_DOC);
      this.streaming.set(false);
      return;
    }

    this.streamAt = 0;
    this.chunk = 0;
    this.streamed.set('');
    this.streaming.set(true);
    this.tick();
  }

  private tick(): void {
    const size = CHUNK_SIZES[this.chunk++ % CHUNK_SIZES.length];
    this.streamAt = Math.min(STREAM_DOC.length, this.streamAt + size);
    this.streamed.set(STREAM_DOC.slice(0, this.streamAt));

    if (this.streamAt >= STREAM_DOC.length) {
      // The last chunk has landed: drop `[streaming]` so the caret goes away and
      // the copy button appears on the now-closed code block.
      this.streaming.set(false);
      return;
    }

    this.streamTimer = setTimeout(() => this.tick(), CHUNK_MS);
  }

  private stopStream(): void {
    if (this.streamTimer !== null) clearTimeout(this.streamTimer);
    this.streamTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Source shown next to each demo
  // ---------------------------------------------------------------------------

  protected readonly snippets = {
    install: `import { WrMarkdown } from 'ngwr/markdown';

@Component({ imports: [WrMarkdown] })
export class MyComponent {
  protected readonly doc = signal('# hello');
}`,
    styles: `// Global styles — the component is ViewEncapsulation.None.
@use 'ngwr/markdown';`,
    streamTs: `protected readonly streamed = signal('');
protected readonly streaming = signal(false);

async ask(prompt: string): Promise<void> {
  this.streamed.set('');
  this.streaming.set(true);
  for await (const chunk of this.llm.stream(prompt)) {
    this.streamed.update(text => text + chunk);
  }
  // Dropping it re-parses the same text as a FINISHED document, which is what
  // closes the code fence, retires the caret and reveals the copy button.
  this.streaming.set(false);
}`,
    highlighter: `import type { WrHighlightSpan, WrMarkdownHighlighter } from 'ngwr/markdown';
import type { ThemedToken } from 'shiki/core';

/** Fence info strings this app can colour, mapped to a loaded grammar. */
const LANGUAGES: Readonly<Record<string, string>> = { ts: 'typescript', bash: 'bash', /* … */ };

const THEMES = { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } as const;

export const shikiMarkdownHighlighter: WrMarkdownHighlighter = async (code, language) => {
  const lang = language ? LANGUAGES[language.toLowerCase()] : undefined;
  // Unknown grammar, or the prerender pass in Node: plain text either way.
  if (!lang || typeof window === 'undefined') return null;

  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(code, {
    lang,
    themes: THEMES,
    // One colour value that resolves per theme, so a cached span stays correct
    // when the theme flips — the contract has no theme dimension to re-ask on.
    defaultColor: 'light-dark()',
    colorsRendering: 'none',
  });

  return tokens.map(line => line.map((token): WrHighlightSpan => ({
    text: token.content,
    color: token.htmlStyle?.['color'],
  })));
};`,
    highlighterProvider: `import { provideWrMarkdownHighlighter } from 'ngwr/markdown';

bootstrapApplication(App, {
  providers: [provideWrMarkdownHighlighter(shikiMarkdownHighlighter)],
});`,
    copy: `<wr-markdown [value]="doc" [copyable]="true" copyLabel="Copy snippet" copiedLabel="Copied!" />`,
    headingIds: `<!-- ## Getting started  ->  <h2 id="user-content-getting-started">

     The namespace is not decoration. Without it a document containing
     "# Search" renders id="search" and takes it from the page around it —
     a <label for="search"> silently stops labelling its input, and nothing
     reports an error. GitHub prefixes untrusted markdown the same way, and
     a bare #fragment link inside the document is rewritten to match, so
     in-document anchors keep working. -->
<wr-markdown [value]="doc" />

<!-- A document you wrote yourself, where clean anchors are worth more. -->
<wr-markdown [value]="doc" headingIdPrefix="" />

<!-- Off entirely, e.g. when several documents share one page. -->
<wr-markdown [value]="doc" [headingIds]="false" />`,
    config: `import { provideWrConfig } from 'ngwr/config';

// App-wide policy rather than per-instance taste: whether rendered links leave
// the tab, and whether code blocks carry a copy button, are decided once.
provideWrConfig({
  markdown: { linkTarget: '_blank', copyable: true },
});

// <wr-markdown [value]="doc" />                     -> copyable, links open in a new tab
// <wr-markdown [value]="doc" [copyable]="false" />  -> the binding wins; \`false\` is a value`,
    parse: `import { parseMarkdown, parseInlines, plainText, safeMarkdownUrl } from 'ngwr/markdown';

// The same tree the component renders — useful for a summary, a search index,
// or a table of contents.
const blocks = parseMarkdown(source, { streaming: false });
const toc = blocks
  .filter(block => block.kind === 'heading')
  .map(heading => ({ id: heading.id, level: heading.level, text: plainText(heading.inlines) }));

// One line of inline markdown, for a label or a chip.
const inlines = parseInlines('a **bold** label');

// The URL check the renderer itself uses.
safeMarkdownUrl('javascript:alert(1)', 'link'); // null
safeMarkdownUrl('/docs', 'link'); // '/docs'`,
  };

  protected readonly basicFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: `<wr-markdown [value]="doc" />` },
    { label: 'release-notes.md', language: 'markdown', code: BASIC_DOC },
  ];

  protected readonly securityFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: `<wr-markdown [value]="hostile" />` },
    { label: 'hostile.md', language: 'markdown', code: SECURITY_DOC },
  ];

  protected readonly subsetFiles: readonly DocCodeFile[] = [
    { label: 'omissions.md', language: 'markdown', code: SUBSET_DOC },
  ];

  protected readonly codeFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: `<wr-markdown [value]="doc" [copyable]="true" />` },
    { label: 'answer.md', language: 'markdown', code: CODE_DOC },
  ];

  protected readonly streamFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-markdown [value]="streamed()" [streaming]="streaming()" [copyable]="true" />`,
    },
    { label: 'TS', language: 'typescript', code: this.snippets.streamTs },
  ];

  protected readonly tasksFiles: readonly DocCodeFile[] = [
    { label: 'tasks.md', language: 'markdown', code: TASKS_DOC },
  ];

  protected readonly tableFiles: readonly DocCodeFile[] = [
    { label: 'table.md', language: 'markdown', code: TABLE_DOC },
  ];

  protected readonly linkFiles: readonly DocCodeFile[] = [
    { label: 'HTML', language: 'angular-html', code: `<wr-markdown linkTarget="_blank" [value]="doc" />` },
    { label: 'links.md', language: 'markdown', code: LINKS_DOC },
  ];

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  protected readonly api = API.WrMarkdown;

  protected readonly highlightApi: readonly DocApiRow[] = [
    {
      name: 'WrMarkdownHighlighter',
      description:
        'The provided function: `(code, language) => spans`. May be async, and may return `null` for a language it does not handle — the block then renders as plain text, which is also what a prerendered page ships.',
      type: '(code: string, language: string | null) => readonly WrHighlightLine[] | null | Promise<…>',
      default: '—',
    },
    {
      name: 'WrHighlightLine',
      description: 'One line of code, left to right. A `readonly WrHighlightSpan[]`.',
      type: 'readonly WrHighlightSpan[]',
      default: '—',
    },
    {
      name: 'text',
      description: 'Text of the span. Rendered as a text node.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'Any CSS colour, bound as `[style.color]`. An omitted span inherits the colour of the code block.',
      type: 'string',
      default: '—',
      sub: true,
    },
    {
      name: 'fontStyle',
      description: 'Bound as the matching style property.',
      type: "'italic' | 'bold' | 'underline'",
      default: '—',
      sub: true,
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'CSP',
      url: ['/guides', 'csp'],
      description: 'Why nothing here needs unsafe-inline or a trusted-HTML bypass.',
    },
    {
      kind: 'Directive',
      title: '[wrTypography]',
      url: ['/reference/directives', 'typography'],
      description: 'Prose styling for markup an app writes itself.',
    },
    {
      kind: 'Component',
      title: 'Keyboard',
      url: ['/reference/components', 'keyboard'],
      description: 'Keycaps for shortcuts, where a code span would under-read.',
    },
  ];
}
