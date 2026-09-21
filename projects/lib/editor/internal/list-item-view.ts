/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Node } from 'prosemirror-model';
import type { NodeView, NodeViewConstructor, ViewMutationRecord } from 'prosemirror-view';

/** The words a task item is read with — `editor.taskDone` / `editor.taskTodo`. */
interface WrTaskLabels {
  readonly done: string;
  readonly todo: string;
}

/**
 * List items as the editor draws them, which differs from the HTML it writes
 * only for a TASK item.
 *
 * A task item's box is presentational, with its state as text beside it —
 * exactly what `<wr-markdown>` renders. A real `<input type="checkbox">` would be
 * an unlabelled form control inside the text, and making it operable would
 * promise an interaction v1 does not have. The box and the words sit outside the
 * editable content, so ProseMirror neither edits nor serializes them; the words
 * come from the catalog, which is why this is a node view the component builds
 * rather than a schema `toDOM` (the schema is shared and has no catalog).
 */
function listItemView(labels: WrTaskLabels): NodeViewConstructor {
  return (node, view) => new WrListItemView(node, view.dom.ownerDocument, labels);
}

class WrListItemView implements NodeView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement;
  private node: Node;

  constructor(node: Node, document: Document, labels: WrTaskLabels) {
    this.node = node;
    this.dom = document.createElement('li');
    const checked = node.attrs['checked'] as boolean | null;
    if (checked === null) {
      this.contentDOM = this.dom;
      return;
    }

    this.dom.className = 'wr-editor__item wr-editor__item--task';
    this.dom.setAttribute('data-checked', String(checked));
    const box = document.createElement('span');
    box.className = checked ? 'wr-editor__task wr-editor__task--checked' : 'wr-editor__task';
    box.contentEditable = 'false';
    box.setAttribute('aria-hidden', 'true');
    const state = document.createElement('span');
    state.className = 'wr-editor__sr-only';
    state.contentEditable = 'false';
    state.textContent = checked ? labels.done : labels.todo;
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'wr-editor__task-body';
    this.dom.append(box, state, this.contentDOM);
  }

  update(node: Node): boolean {
    // A task item becoming a plain one (or the reverse, or toggled) is drawn
    // again from scratch; there is no in-place way to add or drop the box.
    if (node.type !== this.node.type || node.attrs['checked'] !== this.node.attrs['checked']) return false;
    this.node = node;
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (mutation.type === 'selection' || this.contentDOM === this.dom) return false;
    return !this.contentDOM.contains(mutation.target);
  }
}

export { listItemView };
export type { WrTaskLabels };
