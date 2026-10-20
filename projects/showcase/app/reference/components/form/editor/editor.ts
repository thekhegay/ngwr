import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';

import { WrEditor, type WrEditorTool, type WrEditorValue } from 'ngwr/editor';
import { WrFormField } from 'ngwr/form';
import { WrKbd } from 'ngwr/keyboard';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocCodeFile,
  DocInstallComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

// Every demo value below is invented.

const AGENDA: WrEditorValue = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Agenda' }] },
    {
      type: 'bullet_list',
      attrs: { tight: true },
      content: [
        {
          type: 'list_item',
          attrs: { checked: true },
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
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hiring plan' }] }],
        },
      ],
    },
  ],
};

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
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocInstallComponent,
    DocApiComponent,
  ],
})
export default class EditorPageComponent {
  protected readonly prosemirror =
    'prosemirror-model prosemirror-state prosemirror-view prosemirror-commands prosemirror-keymap prosemirror-history prosemirror-schema-list prosemirror-inputrules';

  protected readonly agenda = signal<WrEditorValue>(AGENDA);
  protected readonly comment = signal<WrEditorValue>(null);

  protected readonly commentTools = COMMENT_TOOLS;

  private readonly model = signal<{ description: WrEditorValue }>({ description: null });
  protected readonly ticket = form(this.model, path => {
    required(path.description);
  });

  protected readonly snippets = {
    value: `// "Hello, **world**" — one paragraph, two text nodes, one mark.
const value: WrEditorValue = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello, ' },
        { type: 'text', text: 'world', marks: [{ type: 'strong' }] },
      ],
    },
  ],
};`,
    html: `import { DOMSerializer, Node, type Schema } from 'prosemirror-model';

import type { WrEditorJson } from 'ngwr/editor';

// \`schema\` is your own, declaring the nodes and marks WrEditorJson lists.
export function toHtml(value: WrEditorJson, schema: Schema, document: Document): string {
  const doc = Node.fromJSON(schema, value);
  const host = document.createElement('div');
  host.append(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
  return host.innerHTML;
}`,
    refused: `// Refused whole: the link's address is one the URL check never lets through,
// so the editor keeps what it had and warns in dev mode.
protected readonly imported = signal<WrEditorValue>({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'a script link',
          marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)', title: null } }],
        },
      ],
    },
  ],
});`,
    toolbar: `import { WR_EDITOR_TOOLBAR, type WrEditorTool } from 'ngwr/editor';

// Built from the default rather than retyped — this drops the two code tools.
readonly tools: readonly WrEditorTool[] = WR_EDITOR_TOOLBAR.filter(
  tool => tool !== 'code' && tool !== 'codeBlock'
);`,
    noToolbar: `<!-- No toolbar at all: the shortcuts and the block shortcuts still work. -->
<wr-editor ariaLabel="Notes" [toolbar]="false" [(value)]="notes" />`,
    states: `<!-- A viewer: no ProseMirror is created for this one, and no toolbar is drawn. -->
<wr-editor ariaLabel="Published notes" readonly [toolbar]="false" [value]="notes" />

<!-- Disabled mounts as usual, then leaves the tab order. -->
<wr-editor ariaLabel="Locked notes" disabled [value]="notes" />`,
    defer: `<!-- ProseMirror lands in the chunk that imports ngwr/editor, and in no other.
     @defer moves that chunk off the first load as well. -->
@defer (on viewport) {
  <wr-editor [formField]="form.body" />
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

  protected readonly basicFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-editor ariaLabel="Agenda" placeholder="What is on the agenda?" [(value)]="agenda" />
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
            attrs: { checked: true },
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
            attrs: { checked: false },
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
  protected readonly comment = signal<WrEditorValue>(null);
}`,
    },
  ];

  protected readonly formFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-form-field label="Description" hint="Required.">
  <wr-editor placeholder="Describe the change" [formField]="ticket.description" />
</wr-form-field>
<pre>{{ ticket.description().value() | json }}</pre>`,
    },
    {
      label: 'TS',
      language: 'angular-ts',
      code: `import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';

import { WrEditor, type WrEditorValue } from 'ngwr/editor';
import { WrFormField } from 'ngwr/form';

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.html',
  imports: [FormField, JsonPipe, WrEditor, WrFormField],
})
export class Ticket {
  // Typed as the editor's value: null while nothing is written.
  private readonly model = signal<{ description: WrEditorValue }>({ description: null });
  protected readonly ticket = form(this.model, path => {
    required(path.description, { message: 'Describe the change.' });
  });
}`,
    },
  ];

  protected readonly api = API.WrEditor;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrEditorValue',
      description:
        'The `value` model: the document as a `WrEditorJson` tree, `null` for an empty one, so `required()` reports an empty editor as empty.',
      type: 'WrEditorJson | null',
    },
    {
      name: 'WrEditorJson',
      description:
        'The document as plain data — the shape ProseMirror writes, declared so no ProseMirror type reaches the public API. A bound tree is validated, not trusted: anything the schema does not allow, or a link or image address the URL check refuses, refuses the whole value.',
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
      description: "One entry of the `toolbar` input. `'|'` draws a separator between two groups.",
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
