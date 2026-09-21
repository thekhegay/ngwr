import type { Node } from 'prosemirror-model';
import { type Command, EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import {
  editorPlugins,
  exitTable,
  leaveTable,
  linkRange,
  removeLink,
  setLink,
  toolActive,
  toolCommand,
} from './commands';
import { readHtml, writeHtml } from './html';
import { MAX_NESTING, editorSchema, nestingOf } from './schema';

/**
 * The toolbar's commands on a bare `EditorState` — no view, so nothing here
 * depends on jsdom's missing layout. A position is put where the text says with
 * `[` … `]` markers in the source HTML, which is read, stripped and turned into
 * a selection.
 */
const schema = editorSchema('html');

function stateOf(html: string, canEdit = true): EditorState {
  const from = html.indexOf('[');
  const to = html.indexOf(']');
  const doc = readHtml(html.replace('[', '').replace(']', ''), document, schema);
  const state = EditorState.create({ doc, plugins: editorPlugins(schema, { apple: false, canEdit: () => canEdit }) });
  if (from < 0) return state;
  const text = (at: number): number => positionOfText(doc, textIndex(html, at));
  const selection = TextSelection.create(doc, text(from), to > from ? text(to) : text(from));
  return state.apply(state.tr.setSelection(selection));
}

/** How many characters of TEXT precede `at` in the marked-up source. */
function textIndex(html: string, at: number): number {
  return html
    .slice(0, at)
    .replace(/<[^>]*>/g, '')
    .replace(/[[\]]/g, '').length;
}

function positionOfText(doc: Node, index: number): number {
  let seen = 0;
  let found = -1;
  doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText) {
      const length = node.text!.length;
      if (index <= seen + length) {
        found = pos + (index - seen);
        return false;
      }
      seen += length;
    }
    return true;
  });
  return found >= 0 ? found : doc.content.size - 1;
}

function run(command: Command | null, state: EditorState): EditorState {
  let next = state;
  command!(state, tr => (next = state.apply(tr)));
  return next;
}

const html = (state: EditorState): string => writeHtml(state.doc, document);

describe('marks', () => {
  it('toggles bold over a selection and reports it pressed', () => {
    const state = run(toolCommand('bold', schema), stateOf('<p>a[bc]d</p>'));
    expect(html(state)).toBe('<p>a<strong>bc</strong>d</p>');
    expect(toolActive('bold', state)).toBe(true);
    expect(html(run(toolCommand('bold', schema), state))).toBe('<p>abcd</p>');
  });

  it('cannot apply a mark inside a code block, whose content allows none', () => {
    expect(toolCommand('bold', schema)!(stateOf('<pre><code>a[b]c</code></pre>'))).toBe(false);
  });

  it('has no underline command in markdown, which has no underline mark', () => {
    expect(toolCommand('underline', editorSchema('markdown'))).toBeNull();
  });
});

describe('blocks', () => {
  it('toggles a heading on, and back to a paragraph', () => {
    const on = run(toolCommand('heading2', schema), stateOf('<p>a[b]c</p>'));
    expect(html(on)).toBe('<h2>abc</h2>');
    expect(toolActive('heading2', on)).toBe(true);
    expect(toolActive('paragraph', on)).toBe(false);
    expect(html(run(toolCommand('heading2', schema), on))).toBe('<p>abc</p>');
  });

  it('toggles a code block the same way', () => {
    const on = run(toolCommand('codeBlock', schema), stateOf('<p>a[b]c</p>'));
    expect(html(on)).toBe('<pre><code>abc</code></pre>');
    expect(html(run(toolCommand('codeBlock', schema), on))).toBe('<p>abc</p>');
  });

  it('wraps into a list, switches its kind, and lifts back out', () => {
    const bullets = run(toolCommand('bulletList', schema), stateOf('<p>a[b]c</p>'));
    expect(html(bullets)).toBe('<ul><li><p>abc</p></li></ul>');
    expect(toolActive('bulletList', bullets)).toBe(true);

    const numbers = run(toolCommand('orderedList', schema), bullets);
    expect(html(numbers)).toBe('<ol><li><p>abc</p></li></ol>');
    expect(toolActive('orderedList', numbers)).toBe(true);
    expect(toolActive('bulletList', numbers)).toBe(false);

    expect(html(run(toolCommand('orderedList', schema), numbers))).toBe('<p>abc</p>');
  });

  it('lifts out of the QUOTE, not out of the list item the caret is in', () => {
    const state = stateOf('<blockquote><ul><li><p>a[b]c</p></li></ul></blockquote>');
    expect(toolActive('blockquote', state)).toBe(true);
    expect(html(run(toolCommand('blockquote', schema), state))).toBe('<ul><li><p>abc</p></li></ul>');
  });

  it('wraps into a quote when not in one', () => {
    expect(html(run(toolCommand('blockquote', schema), stateOf('<p>a[b]c</p>')))).toBe(
      '<blockquote><p>abc</p></blockquote>'
    );
  });

  it('inserts a rule, and refuses one inside a table cell rather than splitting the table', () => {
    expect(html(run(toolCommand('horizontalRule', schema), stateOf('<p>ab[]</p>')))).toContain('<hr>');
    expect(toolCommand('horizontalRule', schema)!(stateOf('<table><tr><td>a[b]</td></tr></table>'))).toBe(false);
  });
});

describe('history', () => {
  it('undoes and redoes, and reports neither as available before there is anything', () => {
    const start = stateOf('<p>a[b]c</p>');
    expect(toolCommand('undo', schema)!(start)).toBe(false);
    const bold = run(toolCommand('bold', schema), start);
    expect(toolCommand('undo', schema)!(bold)).toBe(true);
    const undone = run(toolCommand('undo', schema), bold);
    expect(html(undone)).toBe('<p>abc</p>');
    expect(html(run(toolCommand('redo', schema), undone))).toBe('<p>a<strong>b</strong>c</p>');
  });
});

describe('links', () => {
  it('links a selection', () => {
    const state = run(setLink('https://example.com'), stateOf('<p>a[bc]d</p>'));
    expect(html(state)).toBe('<p>a<a href="https://example.com" rel="noopener noreferrer nofollow">bc</a>d</p>');
  });

  it('finds the whole link around a bare caret, and replaces its address', () => {
    const state = stateOf('<p>x <a href="/old" title="T">li[]nk</a> y</p>');
    const range = linkRange(state);
    expect(range && state.doc.textBetween(range.from, range.to)).toBe('link');
    expect(toolActive('link', state)).toBe(true);
    expect(html(run(setLink('/new'), state))).toBe(
      '<p>x <a href="/new" title="T" rel="noopener noreferrer nofollow">link</a> y</p>'
    );
  });

  it('inserts the address as its own text when nothing is selected', () => {
    expect(html(run(setLink('/to'), stateOf('<p>ab[]</p>')))).toBe(
      '<p>ab<a href="/to" rel="noopener noreferrer nofollow">/to</a></p>'
    );
  });

  it('removes the link around the caret', () => {
    expect(html(run(removeLink, stateOf('<p><a href="/x">li[]nk</a></p>')))).toBe('<p>link</p>');
    expect(removeLink(stateOf('<p>pl[]ain</p>'))).toBe(false);
  });
});

describe('tables', () => {
  const table = '<table><tr><th><p>H</p></th></tr><tr><td><p>ce[]ll</p></td></tr></table>';

  it('puts a paragraph after a table that ends the document, from the end of its last cell', () => {
    const next = run(leaveTable('after'), stateOf(`<p>intro</p>${table.replace('ce[]ll', 'cell[]')}`));
    expect(html(next)).toBe(
      '<p>intro</p><table><tbody><tr><th><p>H</p></th></tr><tr><td><p>cell</p></td></tr></tbody></table><p></p>'
    );
    expect(next.selection.$from.parent.type.name).toBe('paragraph');
    expect(next.selection.$from.depth).toBe(1);
  });

  it('does the same inside a quote the table ends', () => {
    const next = run(leaveTable('after'), stateOf(`<blockquote>${table.replace('ce[]ll', 'cell[]')}</blockquote>`));
    expect(html(next)).toContain('</table><p></p></blockquote>');
  });

  it('puts a paragraph before a table that opens the document, from the start of its first cell', () => {
    const next = run(leaveTable('before'), stateOf('<table><tr><td><p>[]cell</p></td></tr></table><p>x</p>'));
    expect(html(next)).toBe('<p></p><table><tbody><tr><td><p>cell</p></td></tr></tbody></table><p>x</p>');
  });

  it('leaves the arrows alone mid-cell, off the edge row, or with text beyond the table', () => {
    expect(leaveTable('after')(stateOf(table))).toBe(false);
    expect(leaveTable('after')(stateOf(table.replace('ce[]ll', 'cell').replace('<p>H</p>', '<p>H[]</p>')))).toBe(false);
    expect(leaveTable('after')(stateOf(`${table.replace('ce[]ll', 'cell[]')}<p>after</p>`))).toBe(false);
    expect(
      leaveTable('before')(stateOf(`<p>before</p>${table.replace('ce[]ll', 'cell').replace('<p>H</p>', '<p>[]H</p>')}`))
    ).toBe(false);
    expect(leaveTable('before')(stateOf(table.replace('ce[]ll', 'cell').replace('<p>H</p>', '<p>[]H</p>')))).toBe(true);
  });

  it('leaves from anywhere in a table with Mod-Enter, whatever follows it', () => {
    const next = run(exitTable, stateOf(`${table.replace('ce[]ll', 'c[]ell')}<p>after</p>`));
    expect(html(next)).toBe(
      '<table><tbody><tr><th><p>H</p></th></tr><tr><td><p>cell</p></td></tr></tbody></table><p></p><p>after</p>'
    );
    expect(exitTable(stateOf('<p>pl[]ain</p>'))).toBe(false);
  });
});

describe('the transaction filter', () => {
  it('refuses every document change while the editor cannot be edited', () => {
    const state = stateOf('<p>a[b]c</p>', false);
    const next = state.apply(state.tr.insertText('X'));
    expect(next.doc.eq(state.doc)).toBe(true);
    // A selection move is not an edit, and still goes through.
    const moved = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)));
    expect(moved.selection.from).toBe(1);
  });

  it(`refuses an edit that nests deeper than ${MAX_NESTING}, and keeps a document that already did`, () => {
    const deep = (levels: number): string =>
      `${'<blockquote>'.repeat(levels)}<p>a[b]c</p>${'</blockquote>'.repeat(levels)}`;
    const atLimit = stateOf(deep(MAX_NESTING));
    expect(nestingOf(atLimit.doc)).toBe(MAX_NESTING);
    // A list item inside that many quotes would be one level past the limit.
    expect(nestingOf(run(toolCommand('bulletList', schema), atLimit).doc)).toBe(MAX_NESTING);

    const past = stateOf(deep(MAX_NESTING + 2));
    const typed = past.apply(past.tr.insertText('X'));
    expect(typed.doc.textContent).toBe('aXc');
  });
});
