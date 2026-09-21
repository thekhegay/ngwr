import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';

import { WrEditor, type WrEditorTool, type WrEditorValue } from 'ngwr/editor';
import { WrFormField } from 'ngwr/form';
import { WrKbd } from 'ngwr/keyboard';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocCodeFile,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

// Every demo value below is invented.

const HTML_VALUE = '<h2>Release notes</h2><p>The editor writes <strong>HTML</strong> back on every edit.</p>';

const MARKDOWN_VALUE = `## Checklist

Markdown in, **markdown** out — the dialect \`<wr-markdown>\` renders.

- [x] Write the changelog
- [ ] Tag the release`;

const JSON_VALUE: WrEditorValue = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Agenda' }] },
    {
      type: 'bullet_list',
      attrs: { tight: true },
      content: [
        {
          type: 'list_item',
          attrs: { checked: null },
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Budget', marks: [{ type: 'strong' }] },
                { type: 'text', text: ' review' },
              ],
            },
          ],
        },
        {
          type: 'list_item',
          attrs: { checked: null },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hiring plan' }] }],
        },
      ],
    },
  ],
};

/**
 * Hostile on purpose: an event handler, an inline style, a `<font>`, a script, an
 * iframe, a `javascript:` link and an image whose source is one, and a fourth-level
 * heading the schema clamps. What the editor draws is what survives.
 */
const UNTRUSTED_VALUE =
  '<h4 onclick="alert(1)">A fourth-level heading</h4>' +
  '<p style="color: red">Styled <b>bold</b>, <font color="red">a font tag</font>, ' +
  '<a href="javascript:alert(1)">a script link</a> and <a href="https://ngwr.dev" target="_blank">a real one</a>.</p>' +
  '<script>alert(1)</script><iframe src="https://example.com"></iframe>' +
  '<p><img src="javascript:alert(1)" alt="refused" onerror="alert(1)">After the image.</p>';

const COMMENT_TOOLS: readonly WrEditorTool[] = [
  'bold',
  'italic',
  'code',
  '|',
  'bulletList',
  'orderedList',
  '|',
  'link',
];

@Component({
  selector: 'ngwr-editor-page',
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
  imports: [
    JsonPipe,
    FormField,
    WrEditor,
    WrFormField,
    WrKbd,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class EditorPageComponent {
  protected readonly html = signal<WrEditorValue>(HTML_VALUE);
  protected readonly markdown = signal<WrEditorValue>(MARKDOWN_VALUE);
  protected readonly json = signal<WrEditorValue>(JSON_VALUE);
  protected readonly untrusted = signal<WrEditorValue>(UNTRUSTED_VALUE);
  protected readonly comment = signal<WrEditorValue>('');

  protected readonly commentTools = COMMENT_TOOLS;

  private readonly model = signal({ description: '' });
  protected readonly ticket = form(this.model, path => {
    required(path.description);
  });

  protected readonly snippets = {
    install: `import { WrEditor } from 'ngwr/editor';

@Component({ imports: [WrEditor] })
export class MyComponent {}`,
    peers: `# ProseMirror is an optional peer: installing ngwr does not bring it along.
pnpm add prosemirror-model prosemirror-state prosemirror-view prosemirror-commands \\
  prosemirror-keymap prosemirror-history prosemirror-schema-list prosemirror-inputrules
# or
npm install prosemirror-model prosemirror-state prosemirror-view prosemirror-commands \\
  prosemirror-keymap prosemirror-history prosemirror-schema-list prosemirror-inputrules`,
    styles: `@use 'ngwr/editor';`,
    config: `import { provideWrConfig } from 'ngwr/config';

// Every <wr-editor> that binds no [format] of its own now reads and writes markdown.
providers: [provideWrConfig({ editor: { format: 'markdown' } })];`,
    toolbar: `import { WR_EDITOR_TOOLBAR, type WrEditorTool } from 'ngwr/editor';

// Built from the default rather than retyped — this drops the two code tools.
readonly tools: readonly WrEditorTool[] = WR_EDITOR_TOOLBAR.filter(
  tool => tool !== 'code' && tool !== 'codeBlock'
);`,
    noToolbar: `<!-- No toolbar at all: the shortcuts and the block shortcuts still work. -->
<wr-editor ariaLabel="Notes" [toolbar]="false" [(value)]="notes" />`,
    states: `<wr-editor ariaLabel="Published notes" readonly [value]="notes" />
<wr-editor ariaLabel="Locked notes" disabled [value]="notes" />`,
    defer: `<!-- ProseMirror lands in the chunk that imports ngwr/editor, and in no other.
     @defer moves that chunk off the first load as well. -->
@defer (on viewport) {
  <wr-editor format="markdown" [formField]="form.body" />
} @placeholder {
  <div class="editor-placeholder" aria-hidden="true"></div>
}`,
    a11y: `<!-- What the editor exposes around its text, inside a <wr-form-field label="Description">. -->
<div role="toolbar" aria-label="Formatting" aria-controls="wr-editor-0">
  <button aria-label="Bold" aria-pressed="false" aria-keyshortcuts="Control+B" tabindex="0">…</button>
  <button aria-label="Italic" aria-pressed="false" aria-keyshortcuts="Control+I" tabindex="-1">…</button>
  <!-- … -->
  <button aria-label="Insert link" aria-haspopup="dialog" aria-expanded="false" aria-keyshortcuts="Control+K" tabindex="-1">…</button>
</div>
<div
  id="wr-editor-0"
  role="textbox"
  aria-multiline="true"
  aria-labelledby="…the field's label…"
  aria-describedby="…the field's hint or error…"
  aria-placeholder="Describe the change"
  contenteditable="true"
>…</div>`,
  };

  protected readonly htmlFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Release notes" placeholder="What changed?" [(value)]="notes" />
<pre>{{ notes() }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';

import { WrEditor, type WrEditorValue } from 'ngwr/editor';

@Component({
  selector: 'app-release-notes',
  templateUrl: './release-notes.html',
  imports: [WrEditor],
})
export class ReleaseNotes {
  // format defaults to 'html', so the value is an HTML string.
  protected readonly notes = signal<WrEditorValue>(
    '<h2>Release notes</h2><p>The editor writes <strong>HTML</strong> back on every edit.</p>'
  );
}`,
    },
  ];

  protected readonly markdownFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Checklist" format="markdown" [(value)]="checklist" />
<pre>{{ checklist() }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';

import { WrEditor, type WrEditorValue } from 'ngwr/editor';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.html',
  imports: [WrEditor],
})
export class Checklist {
  protected readonly checklist = signal<WrEditorValue>(\`## Checklist

Markdown in, **markdown** out — the dialect \\\`<wr-markdown>\\\` renders.

- [x] Write the changelog
- [ ] Tag the release\`);
}`,
    },
  ];

  protected readonly jsonFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Agenda" format="json" [(value)]="agenda" />
<pre>{{ agenda() | json }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';

import { WrEditor, type WrEditorValue } from 'ngwr/editor';

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.html',
  imports: [JsonPipe, WrEditor],
})
export class Agenda {
  protected readonly agenda = signal<WrEditorValue>({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Agenda' }] },
      {
        type: 'bullet_list',
        attrs: { tight: true },
        content: [
          {
            type: 'list_item',
            attrs: { checked: null },
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Budget', marks: [{ type: 'strong' }] },
                  { type: 'text', text: ' review' },
                ],
              },
            ],
          },
          {
            type: 'list_item',
            attrs: { checked: null },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hiring plan' }] }],
          },
        ],
      },
    ],
  });
}`,
    },
  ];

  protected readonly toolbarFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Comment" placeholder="Leave a comment" [toolbar]="tools" [(value)]="comment" />`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';

import { WrEditor, type WrEditorTool, type WrEditorValue } from 'ngwr/editor';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.html',
  imports: [WrEditor],
})
export class Comment {
  // '|' draws a separator between two groups.
  protected readonly tools: readonly WrEditorTool[] = [
    'bold', 'italic', 'code', '|', 'bulletList', 'orderedList', '|', 'link',
  ];
  protected readonly comment = signal<WrEditorValue>('');
}`,
    },
  ];

  protected readonly formFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-form-field label="Description" hint="Markdown. Required.">
  <wr-editor format="markdown" placeholder="Describe the change" [formField]="ticket.description" />
</wr-form-field>
<pre>{{ ticket.description().value() | json }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';

import { WrEditor } from 'ngwr/editor';
import { WrFormField } from 'ngwr/form';

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.html',
  imports: [FormField, JsonPipe, WrEditor, WrFormField],
})
export class Ticket {
  // A plain string field binds to the editor's value model as it is.
  private readonly model = signal({ description: '' });
  protected readonly ticket = form(this.model, path => {
    required(path.description);
  });
}`,
    },
  ];

  protected readonly untrustedFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Imported content" [(value)]="imported" />
<pre>{{ imported() }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { Component, signal } from '@angular/core';

import { WrEditor, type WrEditorValue } from 'ngwr/editor';

@Component({
  selector: 'app-imported',
  templateUrl: './imported.html',
  imports: [WrEditor],
})
export class Imported {
  protected readonly imported = signal<WrEditorValue>(
    '<h4 onclick="alert(1)">A fourth-level heading</h4>' +
      '<p style="color: red">Styled <b>bold</b>, <font color="red">a font tag</font>, ' +
      '<a href="javascript:alert(1)">a script link</a> and <a href="https://ngwr.dev" target="_blank">a real one</a>.</p>' +
      '<script>alert(1)</script><iframe src="https://example.com"></iframe>' +
      '<p><img src="javascript:alert(1)" alt="refused" onerror="alert(1)">After the image.</p>'
  );
}`,
    },
  ];

  protected readonly api = API.WrEditor;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrEditorFormat',
      description:
        'What `value` holds. `html` — an HTML string, rebuilt from the schema on the way out. `markdown` — the dialect `ngwr/markdown` reads, written back by `serializeMarkdown`; it has no underline. `json` — the document as a `WrEditorJson` tree.',
      type: `'html' | 'markdown' | 'json'`,
    },
    {
      name: 'WrEditorValue',
      description:
        "The `value` model. An empty document is `''` in the two string formats and `null` in `json`, so `required()` reports an empty editor as empty. `null` and `''` both read as an empty document in every format.",
      type: 'string | WrEditorJson | null',
    },
    {
      name: 'WrEditorJson',
      description:
        'The document as plain data — the shape ProseMirror writes, declared so no ProseMirror type reaches the public API. A bound tree is validated, not trusted: anything the schema does not allow refuses the whole value.',
      type: 'interface',
    },
    {
      name: 'type',
      description:
        '`doc`, `paragraph`, `heading`, `blockquote`, `code_block`, `horizontal_rule`, `bullet_list`, `ordered_list`, `list_item`, `hard_break`, `image`, `table`, `table_row`, `table_header`, `table_cell` or `text`.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'attrs',
      description:
        '`heading.level` 1–3, `code_block.language`, `ordered_list.order`, the lists’ `tight`, `list_item.checked` (`true`, `false` or `null`), `image.src` / `alt` / `title`, a cell’s `align`.',
      type: 'Readonly<Record<string, unknown>>',
      sub: true,
    },
    { name: 'content', description: 'The child nodes.', type: 'readonly WrEditorJson[]', sub: true },
    { name: 'marks', description: 'The marks on a text node.', type: 'readonly WrEditorMarkJson[]', sub: true },
    { name: 'text', description: 'A text node’s text.', type: 'string', sub: true },
    {
      name: 'WrEditorMarkJson',
      description: 'One mark: `strong`, `em`, `underline`, `strike`, `code`, or `link` with `{ href, title }`.',
      type: 'interface',
    },
    { name: 'type', description: 'The mark’s name.', type: 'string', required: true, sub: true },
    {
      name: 'attrs',
      description: 'A link’s `href` and `title`.',
      type: 'Readonly<Record<string, unknown>>',
      sub: true,
    },
    {
      name: 'WrEditorTool',
      description:
        "One entry of the `toolbar` input. `underline` is dropped in `markdown` format, and `'|'` draws a separator between two groups.",
      type: `'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'link' | 'horizontalRule' | 'undo' | 'redo' | '|'`,
    },
    {
      name: 'WR_EDITOR_TOOLBAR',
      description:
        'The toolbar drawn when `toolbar` is not bound — every tool, in five groups. Filter it to build your own.',
      type: 'readonly WrEditorTool[]',
    },
  ];
}
