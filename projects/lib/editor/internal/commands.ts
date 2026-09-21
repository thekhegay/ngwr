/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { baseKeymap, chainCommands, exitCode, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { inputRules, textblockTypeInputRule, undoInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Mark, MarkType, NodeType, ResolvedPos, Schema } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem, wrapInList } from 'prosemirror-schema-list';
import { type Command, type EditorState, Plugin, TextSelection, type Transaction } from 'prosemirror-state';

import type { WrEditorTool } from '../interfaces';

import { MAX_NESTING, nestingOf } from './schema';

/** Every tool but the separator. */
type WrEditorCommandTool = Exclude<WrEditorTool, '|'>;

/** A shortcut, always on the platform's primary modifier (⌘ on Apple, Ctrl elsewhere). */
interface WrEditorShortcut {
  readonly key: string;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

/**
 * The keyboard half of each tool — the keymap below binds exactly these, so a
 * hint can never name a shortcut that does nothing.
 *
 * Where a convention exists it is followed: Google Docs for the block types
 * (Mod-Alt-0…3, Mod-Shift-7/8), and Tiptap / Notion for the three it does not
 * cover (Mod-Shift-S strikethrough, Mod-E inline code, Mod-Shift-B quote,
 * Mod-Alt-C code block). The horizontal rule has none. Tab is deliberately not
 * bound — indenting with it would be a keyboard trap (WCAG 2.1.2), so list items
 * move with Mod-] and Mod-[ — and neither is Escape, which `<wr-dialog>` needs.
 *
 * Where a layout types `[` and `]` with AltGr or Option (German, French, the
 * Nordic and Polish layouts), the bracket chords are also read with that Alt
 * held — see {@link bracketKeys} — since nothing else indents a list item. The
 * Mod-Alt chords are NOT widened the same way: on Windows, Ctrl+Alt is AltGr, and
 * on those layouts AltGr+0 types `}` and AltGr+C types `ć`. Taking the chord by
 * physical key would make those characters impossible to type in the editor, so
 * there the key types its character and the toolbar sets the block type.
 */
const SHORTCUTS: Readonly<Partial<Record<WrEditorCommandTool, WrEditorShortcut>>> = {
  bold: { key: 'B' },
  italic: { key: 'I' },
  underline: { key: 'U' },
  strike: { key: 'S', shift: true },
  code: { key: 'E' },
  paragraph: { key: '0', alt: true },
  heading1: { key: '1', alt: true },
  heading2: { key: '2', alt: true },
  heading3: { key: '3', alt: true },
  bulletList: { key: '8', shift: true },
  orderedList: { key: '7', shift: true },
  blockquote: { key: 'B', shift: true },
  codeBlock: { key: 'C', alt: true },
  link: { key: 'K' },
  undo: { key: 'Z' },
  redo: { key: 'Z', shift: true },
};

/**
 * The tools a click toggles — the ones that carry `aria-pressed`. Not `link`,
 * which opens a panel: a popup button that also claimed to be pressed would say
 * two contradictory things.
 */
const TOGGLES: ReadonlySet<WrEditorCommandTool> = new Set<WrEditorCommandTool>([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function markActive(state: EditorState, type: MarkType | undefined): boolean {
  if (!type) return false;
  const { empty, from, to, $from } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

/**
 * Whether every textblock the selection touches is `type` — asked of the blocks
 * themselves rather than of `$from.parent`, which is the DOCUMENT under a
 * select-all.
 */
function parentIs(state: EditorState, type: NodeType, attrs?: Record<string, unknown>): boolean {
  const { empty, from, to, $from } = state.selection;
  if (empty) return $from.parent.hasMarkup(type, attrs);
  let found = false;
  let all = true;
  state.doc.nodesBetween(from, to, node => {
    if (!node.isTextblock) return true;
    found = true;
    if (!node.hasMarkup(type, attrs)) all = false;
    return false;
  });
  return found && all;
}

/** The nearest list around the selection, with the position it starts at. */
function nearestList(state: EditorState): { readonly type: NodeType; readonly pos: number } | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'bullet_list' || node.type.name === 'ordered_list') {
      return { type: node.type, pos: $from.before(depth) };
    }
  }
  return null;
}

function insideNode(state: EditorState, type: NodeType): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) if ($from.node(depth).type === type) return true;
  return false;
}

/** Whether a tool's state is "on" at the selection — what `aria-pressed` reports. */
function toolActive(tool: WrEditorCommandTool, state: EditorState): boolean {
  const { marks, nodes } = state.schema;
  switch (tool) {
    case 'bold':
      return markActive(state, marks['strong']);
    case 'italic':
      return markActive(state, marks['em']);
    case 'underline':
      return markActive(state, marks['underline']);
    case 'strike':
      return markActive(state, marks['strike']);
    case 'code':
      return markActive(state, marks['code']);
    case 'link':
      return linkRange(state) !== null;
    case 'paragraph':
      return parentIs(state, nodes['paragraph']);
    case 'heading1':
      return parentIs(state, nodes['heading'], { level: 1 });
    case 'heading2':
      return parentIs(state, nodes['heading'], { level: 2 });
    case 'heading3':
      return parentIs(state, nodes['heading'], { level: 3 });
    case 'codeBlock':
      return parentIs(state, nodes['code_block']);
    case 'bulletList':
      return nearestList(state)?.type === nodes['bullet_list'];
    case 'orderedList':
      return nearestList(state)?.type === nodes['ordered_list'];
    case 'blockquote':
      return insideNode(state, nodes['blockquote']);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** What a tool does, or `null` for one the schema cannot carry (underline in markdown). */
function toolCommand(tool: WrEditorCommandTool, schema: Schema): Command | null {
  const { marks, nodes } = schema;
  const mark = (type: MarkType | undefined): Command | null => (type ? toggleMark(type) : null);
  const heading = (level: 1 | 2 | 3): Command => toggleBlock(nodes['heading'], nodes['paragraph'], { level });

  switch (tool) {
    case 'bold':
      return mark(marks['strong']);
    case 'italic':
      return mark(marks['em']);
    case 'underline':
      return mark(marks['underline']);
    case 'strike':
      return mark(marks['strike']);
    case 'code':
      return mark(marks['code']);
    // The link tool opens a panel; `setLink` is its command.
    case 'link':
      return toggleMark(marks['link'], { href: '#' });
    case 'paragraph':
      return setBlockType(nodes['paragraph']);
    case 'heading1':
      return heading(1);
    case 'heading2':
      return heading(2);
    case 'heading3':
      return heading(3);
    case 'codeBlock':
      return toggleBlock(nodes['code_block'], nodes['paragraph']);
    case 'bulletList':
      return toggleList(nodes['bullet_list'], nodes['list_item']);
    case 'orderedList':
      return toggleList(nodes['ordered_list'], nodes['list_item']);
    case 'blockquote':
      return toggleQuote(nodes['blockquote']);
    case 'horizontalRule':
      return insertRule(nodes['horizontal_rule']);
    case 'undo':
      return undo;
    case 'redo':
      return redo;
  }
}

/** A block type that switches back to a paragraph when it is already on. */
function toggleBlock(type: NodeType, paragraph: NodeType, attrs?: Record<string, unknown>): Command {
  return (state, dispatch) =>
    parentIs(state, type, attrs)
      ? setBlockType(paragraph)(state, dispatch)
      : setBlockType(type, attrs)(state, dispatch);
}

/**
 * A list toggle: out of this kind of list, over to it from the other kind, or
 * into a new one.
 */
function toggleList(type: NodeType, item: NodeType): Command {
  return (state, dispatch) => {
    const list = nearestList(state);
    if (!list) return wrapInList(type)(state, dispatch);
    if (list.type === type) return liftListItem(item)(state, dispatch);
    if (dispatch) {
      const tight = state.doc.nodeAt(list.pos)?.attrs['tight'] !== false;
      const attrs = type.name === 'ordered_list' ? { order: 1, tight } : { tight };
      dispatch(state.tr.setNodeMarkup(list.pos, type, attrs).scrollIntoView());
    }
    return true;
  };
}

/**
 * Into a quote, or out of the nearest one.
 *
 * Out is a hand-rolled lift rather than `prosemirror-commands`' `lift`, which
 * lifts out of whatever the selection's parent is — inside a quoted list that is
 * the list item, not the quote. The target depth is the quote's own parent; a
 * lift that does not fit there throws, and the throw is the "cannot".
 */
function toggleQuote(quote: NodeType): Command {
  return (state, dispatch) => {
    const { $from, $to } = state.selection;
    const range = insideNode(state, quote) ? $from.blockRange($to, node => node.type === quote) : null;
    if (!range) return wrapIn(quote)(state, dispatch);
    try {
      const tr = state.tr.lift(range, range.depth - 1);
      if (dispatch) dispatch(tr.scrollIntoView());
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * A horizontal rule at the selection, where one fits without leaving an
 * isolating node — a table cell holds paragraphs only, and splitting the table
 * around a rule is not what anyone clicking the button meant.
 */
function insertRule(rule: NodeType): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    let fits = false;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      const index = $from.index(depth);
      if (node.canReplaceWith(index, index, rule)) {
        fits = true;
        break;
      }
      if (node.type.spec.isolating) break;
    }
    if (!fits) return false;
    if (dispatch) dispatch(state.tr.replaceSelectionWith(rule.create()).scrollIntoView());
    return true;
  };
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** The table around the selection, as a depth of `$from`, or `-1`. */
function tableDepth(state: EditorState): number {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) if ($from.node(depth).type.name === 'table') return depth;
  return -1;
}

/**
 * An empty paragraph beside the table at `depth`, with the caret in it — the one
 * way to a line the keyboard cannot otherwise reach. There is no gap cursor here,
 * and a cell holds paragraphs, so Enter only ever splits inside it.
 */
function paragraphBeside(
  state: EditorState,
  depth: number,
  side: 'before' | 'after',
  dispatch?: (tr: Transaction) => void
): boolean {
  const { $from } = state.selection;
  const paragraph = state.schema.nodes['paragraph'];
  const parent = $from.node(depth - 1);
  const index = $from.index(depth - 1) + (side === 'after' ? 1 : 0);
  if (!parent.canReplaceWith(index, index, paragraph)) return false;
  if (dispatch) {
    const pos = side === 'after' ? $from.after(depth) : $from.before(depth);
    const tr = state.tr.insert(pos, paragraph.create());
    dispatch(tr.setSelection(TextSelection.create(tr.doc, pos + 1)).scrollIntoView());
  }
  return true;
}

/** Mod-Enter in a table: out of it, onto a new line below — what `exitCode` does for a code block. */
const exitTable: Command = (state, dispatch) => {
  const depth = tableDepth(state);
  return depth > 0 && paragraphBeside(state, depth, 'after', dispatch);
};

/**
 * The arrow key off the edge of a table nothing can be reached past: ArrowDown on
 * the last line of its last row with no text anywhere after it, ArrowUp on the
 * first line of its first row with none before. Anywhere else the key moves the
 * caret as it always does. Up and down only — left and right swap ends under
 * `dir="rtl"`, and the vertical pair means the same thing in both directions.
 */
function leaveTable(side: 'before' | 'after'): Command {
  return (state, dispatch, view) => {
    if (view && !view.editable) return false;
    const depth = tableDepth(state);
    const { $from, empty } = state.selection;
    if (depth < 0 || !empty) return false;
    // table > row > cell > paragraph: the row's place in the table, and the
    // paragraph's in its cell.
    const table = $from.node(depth);
    const cell = $from.node(depth + 2);
    const row = $from.index(depth);
    const block = $from.index(depth + 2);
    const edge =
      side === 'after' ? row === table.childCount - 1 && block === cell.childCount - 1 : row === 0 && block === 0;
    if (!edge) return false;
    const onEdgeLine = view
      ? view.endOfTextblock(side === 'after' ? 'down' : 'up')
      : $from.parentOffset === (side === 'after' ? $from.parent.content.size : 0);
    if (!onEdgeLine) return false;
    const outside = state.doc.resolve(side === 'after' ? $from.after(depth) : $from.before(depth));
    if (TextSelection.findFrom(outside, side === 'after' ? 1 : -1, true)) return false;
    return paragraphBeside(state, depth, side, dispatch);
  };
}

function insertHardBreak(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const type = state.schema.nodes['hard_break'];
  const { $from } = state.selection;
  if (!$from.parent.canReplaceWith($from.index(), $from.index(), type)) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
  return true;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/**
 * The run of text carrying one link around the selection — the whole link, when
 * the caret merely sits in it — or `null` when there is none.
 */
function linkRange(state: EditorState): { readonly from: number; readonly to: number; readonly mark: Mark } | null {
  const type = state.schema.marks['link'];
  const { empty, from, to, $from } = state.selection;
  if (!empty) {
    let found: Mark | null = null;
    state.doc.nodesBetween(from, to, node => {
      found ??= type.isInSet(node.marks) ?? null;
    });
    return found ? { from, to, mark: found } : null;
  }
  return markAround($from, type);
}

function markAround($pos: ResolvedPos, type: MarkType): { from: number; to: number; mark: Mark } | null {
  const parent = $pos.parent;
  const start = $pos.start();
  const offsets: number[] = [];
  parent.forEach((_child, offset) => offsets.push(offset));

  // The child the caret is in — or, at a boundary, the one before it and then
  // the one after, since a non-inclusive mark does not report itself at its end.
  const index = $pos.index();
  const candidates = ($pos.textOffset > 0 ? [index] : [index - 1, index]).filter(i => i >= 0 && i < parent.childCount);
  for (const at of candidates) {
    const mark = type.isInSet(parent.child(at).marks);
    if (!mark) continue;
    let first = at;
    let last = at;
    while (first > 0 && mark.isInSet(parent.child(first - 1).marks)) first--;
    while (last < parent.childCount - 1 && mark.isInSet(parent.child(last + 1).marks)) last++;
    return { from: start + offsets[first], to: start + offsets[last] + parent.child(last).nodeSize, mark };
  }
  return null;
}

/**
 * Link the selection to `href` — replacing the link it sits in when the caret
 * is inside one, and inserting the address as its own text when nothing is
 * selected at all. `href` has already passed the URL policy.
 */
function setLink(href: string): Command {
  return (state, dispatch) => {
    const type = state.schema.marks['link'];
    const { empty, from, to } = state.selection;
    const existing = linkRange(state);
    const title = (existing?.mark.attrs['title'] as string | null | undefined) ?? null;
    const mark = type.create({ href, title });
    if (!toggleMark(type, { href })(state)) return false;
    if (!dispatch) return true;

    const tr = state.tr;
    if (!empty) tr.removeMark(from, to, type).addMark(from, to, mark);
    else if (existing) tr.removeMark(existing.from, existing.to, type).addMark(existing.from, existing.to, mark);
    else tr.insertText(href, from).addMark(from, from + href.length, mark);
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Remove the link the selection is in or covers. */
const removeLink: Command = (state, dispatch) => {
  const range = linkRange(state);
  if (!range) return false;
  if (dispatch) dispatch(state.tr.removeMark(range.from, range.to, state.schema.marks['link']).scrollIntoView());
  return true;
};

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

/**
 * The editor's plugin stack, in precedence order: its own keys, history keys,
 * ProseMirror's base keymap, then history and the markdown-style input rules.
 *
 * `canEdit` is asked for every document-changing transaction, because
 * `view.dispatch()` does not consult `editable` — a toolbar click or a plugin
 * would otherwise change a read-only document. Outside writes never pass here:
 * they replace the state wholesale.
 *
 * The input rules are the block shortcuts only. The typographic ones (smart
 * quotes, the em dash, the ellipsis) are left out on purpose: in a form control
 * they silently rewrite what someone typed into a name, a code or a reference.
 */
function editorPlugins(
  schema: Schema,
  options: { readonly apple: boolean; readonly canEdit: () => boolean }
): Plugin[] {
  const { nodes } = schema;
  const keys: Record<string, Command> = {};
  const bind = (combo: string, command: Command | null): void => {
    if (!command) return;
    keys[combo] = command;
    // `event.key` is upper case under Shift or Caps Lock, and ProseMirror
    // matches on it; bound twice, the way `prosemirror-example-setup` does.
    const last = combo.slice(combo.lastIndexOf('-') + 1);
    if (/^[a-z]$/.test(last)) keys[combo.slice(0, -1) + last.toUpperCase()] = command;
  };

  for (const [tool, shortcut] of Object.entries(SHORTCUTS) as [WrEditorCommandTool, WrEditorShortcut][]) {
    if (tool === 'link' || tool === 'undo' || tool === 'redo') continue;
    bind(comboOf(shortcut), toolCommand(tool, schema));
  }
  bind('Mod-z', undo);
  bind('Mod-Shift-z', redo);
  if (!options.apple) bind('Mod-y', redo);
  keys['Shift-Enter'] = chainCommands(exitCode, insertHardBreak);
  keys['Mod-Enter'] = chainCommands(exitCode, exitTable);
  keys['Enter'] = splitListItem(nodes['list_item']);
  keys['Mod-['] = liftListItem(nodes['list_item']);
  keys['Mod-]'] = sinkListItem(nodes['list_item']);
  keys['ArrowDown'] = leaveTable('after');
  keys['ArrowUp'] = leaveTable('before');
  keys['Backspace'] = undoInputRule;

  return [
    new Plugin({
      filterTransaction: (tr, state) => {
        if (!tr.docChanged) return true;
        if (!options.canEdit()) return false;
        // `MAX_NESTING` is the deepest markdown reads back with its structure. A
        // document that already nests deeper (a bound HTML or JSON value) is kept
        // as it is; what is refused is an edit that makes it deeper still.
        const depth = nestingOf(tr.doc);
        return depth <= MAX_NESTING || depth <= nestingOf(state.doc);
      },
    }),
    bracketKeys(nodes['list_item'], options.apple),
    keymap(keys),
    keymap(baseKeymap),
    history(),
    inputRules({
      rules: [
        textblockTypeInputRule(/^(#{1,3})\s$/, nodes['heading'], match => ({ level: match[1].length })),
        wrappingInputRule(/^\s*>\s$/, nodes['blockquote']),
        wrappingInputRule(/^\s*([-+*])\s$/, nodes['bullet_list']),
        wrappingInputRule(
          /^(\d{1,9})\.\s$/,
          nodes['ordered_list'],
          match => ({ order: Number(match[1]) }),
          (match, node) => node.childCount + (node.attrs['order'] as number) === Number(match[1])
        ),
        textblockTypeInputRule(/^```$/, nodes['code_block']),
      ],
    }),
  ];
}

/**
 * Mod-] and Mod-[ as they are TYPED on a layout that needs AltGr or Option for a
 * bracket: Windows German reports AltGr+8 as Ctrl+Alt with `key` `[`, macOS
 * German reports Option+5 under ⌘ as ⌘+Alt with `key` `[`. The keymap matches on
 * the full modifier set, so neither reaches `Mod-[`, and indenting a list item has
 * no other path — Tab is not bound and the toolbar has no indent tool.
 *
 * Matched on the character, never on `event.code`: the physical key at `]` is `+`
 * on a German keyboard, and Ctrl and `+` is the browser's zoom.
 */
function bracketKeys(item: NodeType, apple: boolean): Plugin {
  const lift = liftListItem(item);
  const sink = sinkListItem(item);
  return new Plugin({
    props: {
      handleKeyDown: (view, event) => {
        if (!event.altKey || event.shiftKey || (event.key !== '[' && event.key !== ']')) return false;
        const mod = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
        return mod && (event.key === ']' ? sink : lift)(view.state, view.dispatch);
      },
    },
  });
}

/** A shortcut in ProseMirror's key-name syntax. */
function comboOf(shortcut: WrEditorShortcut): string {
  return `Mod-${shortcut.alt ? 'Alt-' : ''}${shortcut.shift ? 'Shift-' : ''}${shortcut.key.toLowerCase()}`;
}

export {
  SHORTCUTS,
  TOGGLES,
  toolActive,
  toolCommand,
  linkRange,
  setLink,
  removeLink,
  exitTable,
  leaveTable,
  editorPlugins,
  comboOf,
};
export type { WrEditorCommandTool, WrEditorShortcut };
