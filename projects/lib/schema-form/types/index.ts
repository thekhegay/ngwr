/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { FieldTree } from '@angular/forms/signals';

import type { WrFileUploadRejection } from 'ngwr/file-upload';

/** Files a `kind: 'file'` field refused, with the field that refused them. Emitted via `(rejected)`. */
export interface WrSchemaFormRejection {
  /** The field's key in its own object, e.g. `scans`. Inside a repeating group it is the key within the item. */
  readonly key: string;
  /** The field itself, so one inside a repeating group is told apart from its siblings in other items. */
  readonly field: FieldTree<unknown>;
  readonly rejections: readonly WrFileUploadRejection[];
}
