/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { computed, signal } from '@angular/core';

import type { WrFormFieldContext } from 'ngwr/form';

let nextId = 0;

/**
 * The field the link panel's URL input belongs to — provided as `WR_FORM_FIELD`
 * for the editor's whole subtree.
 *
 * It does two jobs at once. It is the SHIELD every composite control needs: the
 * editor is the control a `<wr-form-field>` wraps, and without a nearer provider
 * the `[wrInput]` in its link panel would adopt the outer field's id, take over
 * its label and announce its error as its own. And it is the input's own field:
 * `[wrInput]` binds `id`, `aria-invalid` and `aria-describedby` from whatever
 * field it finds, so answering here is how a refused URL reaches a screen reader
 * without binding attributes the directive already owns.
 *
 * @internal
 */
export class WrEditorLinkField implements WrFormFieldContext {
  private readonly id = `wr-editor-link-${nextId++}`;

  /** The URL just submitted was refused by the link policy. */
  readonly invalid = signal(false);

  readonly controlId = signal(`${this.id}-url`).asReadonly();
  readonly errorId = `${this.id}-error`;
  readonly panelId = `${this.id}-panel`;

  readonly errorKeys = computed<readonly string[]>(() => (this.invalid() ? ['url'] : []));
  readonly describedBy = computed(() => (this.invalid() ? this.errorId : null));
  readonly labelId = signal<string | null>(null).asReadonly();

  adoptControlId(): void {
    // The panel's input never carries an id of its own.
  }
}
